import { generateKeyPairSync } from "node:crypto";

export function createLegacySigningKey() {
  return generateKeyPairSync("rsa", {
    modulusLength: 1024,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}
