import { createCipheriv, randomBytes } from "node:crypto";

export function encryptRecord(plaintext: Buffer, key: Buffer) {
  if (key.length !== 32) throw new RangeError("AES-256-GCM needs a 32-byte key");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, ciphertext, tag: cipher.getAuthTag() };
}
