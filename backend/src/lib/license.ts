import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

export interface LicensePayload {
  customerName: string;
  issuedAt: string;
  expiresAt: string;
}

export interface LicenseStatus {
  valid: boolean;
  reason?: string;
  customerName?: string;
  expiresAt?: string;
  daysRemaining?: number;
}

function loadPublicKeyPem(): string | null {
  const raw = process.env.LICENSE_PUBLIC_KEY;
  if (!raw) return null;
  // Allow the PEM to be stored in .env with literal "\n" sequences.
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function loadLicenseString(): string | null {
  if (process.env.LICENSE_KEY?.trim()) return process.env.LICENSE_KEY.trim();
  if (process.env.LICENSE_FILE) {
    try {
      return readFileSync(process.env.LICENSE_FILE, "utf8").trim();
    } catch {
      return null;
    }
  }
  return null;
}

export function checkLicense(): LicenseStatus {
  const publicKeyPem = loadPublicKeyPem();
  if (!publicKeyPem) return { valid: false, reason: "Server is not configured with a license public key." };

  const licenseString = loadLicenseString();
  if (!licenseString) return { valid: false, reason: "No license key installed." };

  const parts = licenseString.split(".");
  if (parts.length !== 2) return { valid: false, reason: "License key is malformed." };
  const [payloadB64, signatureB64] = parts;

  let payload: LicensePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "License key is malformed." };
  }

  try {
    const publicKey = createPublicKey(publicKeyPem);
    const isValid = verify(null, Buffer.from(payloadB64), publicKey, Buffer.from(signatureB64, "base64url"));
    if (!isValid) return { valid: false, reason: "License signature is invalid." };
  } catch {
    return { valid: false, reason: "License signature could not be verified." };
  }

  const expiresAt = new Date(payload.expiresAt);
  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "License has expired.", customerName: payload.customerName, expiresAt: payload.expiresAt, daysRemaining };
  }

  return { valid: true, customerName: payload.customerName, expiresAt: payload.expiresAt, daysRemaining };
}
