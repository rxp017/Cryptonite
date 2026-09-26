import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { clearPasted, scanEstate, scanPasted } from "./engine.ts";

test("pasted source is scanned in memory without creating a file", () => {
  const root = mkdtempSync(join(tmpdir(), "cryptonite-pasted-"));
  try {
    const scan = scanPasted('createHash("md5").update(input)', []);
    assert.equal(scan.files, 1);
    assert.equal(scan.findings.length, 1);
    assert.equal(scan.findings[0].path, "pasted-input");
    assert.equal(scan.findings[0].line, 1);
    assert.equal(scan.findings[0].confidence, "confirmed");
    assert.deepEqual(readdirSync(root), []);
    assert.equal(clearPasted([]).findings.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dependency, wrapper, and protocol references alone are never confirmed", () => {
  const root = mkdtempSync(join(tmpdir(), "cryptonite-scan-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { "node-forge": "1.4.0", zod: "4.4.0" } }, null, 2));
    writeFileSync(join(root, "src", "wrapper.ts"), "import forge from 'node-forge';\nconst protocol = 'TLSv1';\n");
    writeFileSync(join(root, "src", "edge.conf"), "ssl_protocols TLSv1;\n");
    const scan = scanEstate(root);
    assert.equal(scan.stats.confirmed, 0);
    assert.ok(scan.findings.some((item) => item.mechanism.includes("node-forge") && item.confidence === "uncertain"));
    assert.ok(scan.findings.some((item) => item.usage === "protocol" && item.confidence === "uncertain"));
    assert.ok(scan.findings.every((item) => item.confidence === "uncertain"));
    assert.deepEqual(scan.packages.map((pkg) => pkg.name), ["node-forge", "zod"]);
    assert.equal(scan.packages.length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an env-style config is discovered from a real folder with uncertain confidence", () => {
  const root = mkdtempSync(join(tmpdir(), "cryptonite-env-"));
  try {
    writeFileSync(join(root, ".env.production"), "TLS_VERSION=TLSv1\n");
    const scan = scanEstate(root);
    assert.equal(scan.files, 1);
    assert.deepEqual(scan.findings.map((item) => [item.path, item.line, item.confidence]),
      [[".env.production", 1, "uncertain"]]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("algorithm text inside strings and comments is not confirmed", () => {
  const root = mkdtempSync(join(tmpdir(), "cryptonite-literals-"));
  try {
    writeFileSync(join(root, "notes.ts"), [
      'const example = "MD5(input)";',
      '/* createHash("md5") */',
      'const value = 1; // generateKeyPairSync("rsa")',
      'createHash("md5").update(value);',
    ].join("\n"));
    writeFileSync(join(root, "notes.py"), [
      'example = "AES.new(key, AES.MODE_CBC, iv=iv)"',
      '# hashlib.md5(data)',
      'hashlib.md5(data)',
    ].join("\n"));
    const confirmed = scanEstate(root).findings.filter((item) => item.confidence === "confirmed");
    assert.deepEqual(confirmed.map((item) => `${item.path}:${item.line}`).sort(), ["notes.py:3", "notes.ts:4"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("seeded findings have actual file-line evidence; certificate fields are parsed", () => {
  const root = resolve("demo", "seeded-estate");
  const scan = scanEstate(root);
  assert.equal(scan.files, 11);
  assert.equal(scan.findings.filter((item) => item.usage === "certificate").length, 2);
  assert.ok(scan.findings.some((item) => item.algorithm === "MD5" && item.confidence === "confirmed"));
  assert.ok(scan.findings.every((item) => !item.path.includes("/src/modern/")));
  for (const item of scan.findings) {
    const path = join(root, item.path.slice("demo/seeded-estate/".length));
    const sourceLine = readFileSync(path, "utf8").split(/\r?\n/)[item.line - 1];
    assert.equal(item.snippet, sourceLine.trim().slice(0, 160), item.evidence);
    if (item.usage === "certificate") {
      assert.ok(item.signatureOid);
      assert.ok(item.keySize);
      assert.ok(item.expiresAt);
      assert.equal(item.confidence, "confirmed");
    }
  }
});
