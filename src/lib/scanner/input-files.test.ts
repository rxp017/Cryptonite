import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { zipSync, strToU8 } from "fflate";
import { scanFiles } from "./engine.ts";
import { allowedPath, prepareInputFiles, unzipInput } from "./input-files.ts";
import { canonicalGitHubUrl } from "./git-input.server.ts";

test("folder-style and ZIP inputs scan the same real lines", () => {
  const files = [
    { path: "repo/src/legacy/hash.ts", content: readFileSync("demo/seeded-estate/src/legacy/hash.ts", "utf8") },
    { path: "repo/certs/legacy.crt", content: readFileSync("demo/seeded-estate/certs/legacy-rsa1024-sha1.pem", "utf8") },
    { path: "repo/server/.env", content: "TLS_VERSION=TLSv1\n" },
  ];
  const folder = scanFiles(prepareInputFiles(files));
  assert.deepEqual(folder.inventory.map((item) => item.component), ["legacy", "certificates", "server"]);
  const zipped = zipSync(Object.fromEntries(files.map((file) => [file.path, strToU8(file.content)])));
  const archive = scanFiles(unzipInput(Buffer.from(zipped).toString("base64")));
  assert.deepEqual(archive.findings.map((f) => [f.path, f.line, f.confidence]),
    folder.findings.map((f) => [f.path, f.line, f.confidence]));
  assert.ok(folder.findings.some((f) => f.path.endsWith("hash.ts") && f.confidence === "confirmed"));
  assert.ok(folder.findings.some((f) => f.path.endsWith("legacy.crt") && f.signatureOid && f.confidence === "confirmed"));
  assert.ok(folder.findings.some((f) => f.path.endsWith(".env") && f.confidence === "uncertain"));
});

test("unsafe and oversized uploads are rejected", () => {
  assert.equal(allowedPath("../secrets.pem"), false);
  assert.equal(allowedPath("repo/node_modules/file.ts"), false);
  assert.throws(() => prepareInputFiles([{ path: "C:\\outside\\file.ts", content: "x" }]));
  assert.throws(() => unzipInput("not-a-zip"));
});

test("only canonical public GitHub URLs are accepted", () => {
  assert.equal(canonicalGitHubUrl("https://github.com/rxp017/Cryptonite"),
    "https://github.com/rxp017/Cryptonite.git");
  assert.throws(() => canonicalGitHubUrl("https://github.com.evil.test/owner/repo"));
  assert.throws(() => canonicalGitHubUrl("https://github.com/owner/repo?token=x"));
});
