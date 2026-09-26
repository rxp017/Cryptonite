import { createHash } from "node:crypto";

export function receiptFingerprint(receipt: Buffer): string {
  return createHash("md5").update(receipt).digest("hex");
}
