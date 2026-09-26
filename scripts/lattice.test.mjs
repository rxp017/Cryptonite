import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const executable = join(projectRoot, "scripts", "lattice.mjs");

function run(...args) {
  return spawnSync(process.execPath, [executable, ...args], { cwd: projectRoot, encoding: "utf8" });
}

test("package bin scans the seeded estate and emits only JSON with real relative evidence", () => {
  const manifest = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
  assert.equal(manifest.bin.lattice, "./scripts/lattice.mjs");
  const result = run("scan", "demo/seeded-estate");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const scan = JSON.parse(result.stdout);
  assert.equal(scan.files, 11);
  assert.equal(scan.findings.length, 15);
  for (const finding of scan.findings) {
    assert.ok(!finding.path.startsWith("demo/seeded-estate/"));
    const path = join(projectRoot, "demo", "seeded-estate", finding.path);
    assert.ok(existsSync(path), path);
    assert.equal(readFileSync(path, "utf8").split(/\r?\n/)[finding.line - 1].trim().slice(0, 160), finding.snippet);
  }
});

test("scan uses the selected folder and skips generated dependency directories", () => {
  const target = mkdtempSync(join(tmpdir(), "cryptonite-cli-"));
  try {
    mkdirSync(join(target, "src"));
    mkdirSync(join(target, "node_modules"));
    writeFileSync(join(target, "src", "hash.py"), "import hashlib\nvalue = hashlib.md5(b'fixture').hexdigest()\n");
    writeFileSync(join(target, "node_modules", "hidden.py"), "import hashlib\nvalue = hashlib.md5(b'ignored').hexdigest()\n");
    const result = run("scan", target);
    assert.equal(result.status, 0, result.stderr);
    const scan = JSON.parse(result.stdout);
    assert.equal(scan.files, 1);
    assert.equal(scan.findings.length, 1);
    assert.equal(scan.findings[0].path, "src/hash.py");
    assert.equal(scan.findings[0].line, 2);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("invalid targets fail with structured stderr and no stdout", () => {
  const result = run("scan", "folder-that-does-not-exist");
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  const error = JSON.parse(result.stderr);
  assert.equal(error.error, true);
  assert.equal(error.code, "TARGET_NOT_FOUND");
});
