import { X509Certificate } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import forge from "node-forge";
import selfsigned from "selfsigned";

const certsDir = fileURLToPath(new URL("../certs/", import.meta.url));
const now = new Date();

const cases = [
  {
    filename: "legacy-rsa1024-sha1.pem",
    commonName: "legacy.seeded-estate.example.invalid",
    options: { keySize: 1024, algorithm: "sha1" },
    expectedBits: 1024,
    expectedSignature: "sha1WithRSAEncryption",
    lifetimeDays: 30,
  },
  {
    filename: "modern-rsa2048-sha256.pem",
    commonName: "modern.seeded-estate.example.invalid",
    options: { keySize: 2048, algorithm: "sha256" },
    expectedBits: 2048,
    expectedSignature: "sha256WithRSAEncryption",
    lifetimeDays: 365,
  },
];

await mkdir(certsDir, { recursive: true });

for (const item of cases) {
  const notAfterDate = new Date(now.getTime() + item.lifetimeDays * 24 * 60 * 60 * 1000);
  const generated = await selfsigned.generate(
    [{ name: "commonName", value: item.commonName }],
    { ...item.options, notBeforeDate: now, notAfterDate },
  );

  const x509 = new X509Certificate(generated.cert);
  const parsed = forge.pki.certificateFromPem(generated.cert);
  const keyBits = x509.publicKey.asymmetricKeyDetails?.modulusLength;
  const signatureOid = parsed.signatureOid;
  const signature = forge.pki.oids[signatureOid];
  if (keyBits !== item.expectedBits || signature !== item.expectedSignature) {
    throw new Error(`${item.filename}: unexpected key size or signature (${keyBits}, ${signature})`);
  }

  await writeFile(new URL(`../certs/${item.filename}`, import.meta.url), generated.cert, "utf8");
  console.log(
    `${item.filename}: RSA-${keyBits}, ${signature}, OID ${signatureOid}, expires ${x509.validTo}`,
  );
}
