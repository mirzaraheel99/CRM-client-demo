import { generateKeyPairSync } from "node:crypto";

// Run this exactly once per product line. The private key signs every
// customer license and must never be committed, deployed, or shared —
// keep it offline. The public key is safe to bake into every deployment
// (LICENSE_PUBLIC_KEY) since it can only verify signatures, not create them.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");

console.log("=== PUBLIC KEY (set as LICENSE_PUBLIC_KEY in every deployment's .env) ===\n");
console.log(publicKey.export({ type: "spki", format: "pem" }).toString());

console.log("=== PRIVATE KEY (keep offline and secret — needed to issue new licenses) ===\n");
console.log(privateKey.export({ type: "pkcs8", format: "pem" }).toString());
