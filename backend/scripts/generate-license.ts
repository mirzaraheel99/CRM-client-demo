import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const [, , customerName, expiresAtArg, privateKeyPath] = process.argv;

if (!customerName || !expiresAtArg || !privateKeyPath) {
  console.error("Usage: tsx scripts/generate-license.ts <customerName> <expiresAt ISO date> <privateKeyPemPath>");
  console.error('Example: tsx scripts/generate-license.ts "Acme Appliance Repair" 2027-07-15 ./private-key.pem');
  process.exit(1);
}

const privateKeyPem = readFileSync(privateKeyPath, "utf8");
const privateKey = createPrivateKey(privateKeyPem);

const payload = {
  customerName,
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(expiresAtArg).toISOString(),
};

const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
const signature = sign(null, Buffer.from(payloadB64), privateKey);
const licenseKey = `${payloadB64}.${signature.toString("base64url")}`;

console.error(`Customer: ${payload.customerName}`);
console.error(`Expires:  ${payload.expiresAt}`);
console.error("License key (set as LICENSE_KEY in that customer's .env):\n");
console.log(licenseKey);
