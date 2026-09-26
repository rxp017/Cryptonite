import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import forge from "node-forge";
import { KNOWN_CRYPTO_PACKAGES } from "./samples.ts";
import type { Confidence, Finding, PackageDep, SampleFile, ScanResult, Severity, Usage } from "./types.ts";

type EvidenceKind = "direct-instantiation" | "certificate-field" | "dependency" | "wrapper" | "config";
const DEFAULT_ROOT = resolve(process.cwd(), "demo", "seeded-estate");
const EXTENSIONS = new Set([".ts", ".js", ".py", ".mjs", ".json", ".txt", ".pem", ".yaml", ".yml", ".toml", ".ini", ".conf"]);
const IGNORED_DIRECTORIES = new Set([".git", ".vercel", ".output", ".nitro", ".tanstack", "node_modules", "dist", "build", "coverage"]);
const IGNORED_FILES = new Set(["package-lock.json"]);
const MAX_BYTES = 1024 * 1024;

type Rule = {
  pattern: RegExp; kind: EvidenceKind; mechanism: string; algorithm: string;
  usage: Usage; severity: Severity; concern: string; recommendation: string; keySize?: number;
};
const RULES: Rule[] = [
  { pattern: /\b(?:createHash\(\s*["']md5["']|hashlib\.md5\s*\(|MD5\s*\()/gi,
    kind: "direct-instantiation", mechanism: "MD5 hash", algorithm: "MD5", usage: "hash", severity: "high",
    concern: "MD5 is collision-broken.", recommendation: "Replace cryptographic MD5 use with SHA-256 or SHA-3." },
  { pattern: /\b(?:generateKeyPairSync\(\s*["']rsa["']|RSA\.generate\s*\(|rsa\.generate_private_key\s*\()/gi,
    kind: "direct-instantiation", mechanism: "RSA key generation", algorithm: "RSA", usage: "key-generation", severity: "high",
    concern: "RSA is vulnerable to a cryptographically relevant quantum computer.", recommendation: "Inventory consumers before planning a post-quantum replacement." },
  { pattern: /\bAES\.new\([^\n]*AES\.MODE_CBC\s*,/g,
    kind: "direct-instantiation", mechanism: "AES-CBC cipher instantiation", algorithm: "AES-CBC", usage: "encryption", severity: "medium",
    concern: "CBC needs separate authentication; review IV generation and reuse at this call site.", recommendation: "Use authenticated encryption such as AES-256-GCM and rotate the key." },
  { pattern: /\b(?:modulusLength\s*:\s*1024|key_size\s*=\s*1024)\b/g,
    kind: "config", mechanism: "1024-bit key setting", algorithm: "1024-bit key", usage: "config", severity: "high", keySize: 1024,
    concern: "The source configures a 1024-bit key; verify its use.", recommendation: "Verify this setting is active; replace the key if it is." },
  { pattern: /\b(?:verify\s*=\s*False|rejectUnauthorized\s*:\s*false)\b/gi,
    kind: "config", mechanism: "TLS certificate verification disabled", algorithm: "TLS verification", usage: "config", severity: "high",
    concern: "The client configuration appears to skip certificate verification.", recommendation: "Verify the client path is active; then enable verification and configure the intended trust store." },
  { pattern: /\b(?:LEDGER_KEY|SECRET_KEY|AES_KEY)\s*=\s*bytes\.fromhex\s*\(/g,
    kind: "config", mechanism: "Key material embedded in source", algorithm: "Hardcoded key", usage: "config", severity: "high",
    concern: "A literal key appears in source.", recommendation: "Verify this key is used; if active, rotate it and load replacement material from a protected store." },
  { pattern: /\bTLSv1(?:\.0)?\b/g,
    kind: "config", mechanism: "TLS 1.0 reference", algorithm: "TLS 1.0", usage: "protocol", severity: "high",
    concern: "A protocol reference alone does not prove it is enabled.", recommendation: "Check active endpoint configuration; disable TLS 1.0 if enabled." },
  { pattern: /\b(?:from\s+["']node-forge["']|from\s+Crypto\.[A-Za-z.]+\s+import\b)/g,
    kind: "wrapper", mechanism: "Cryptography library import", algorithm: "Library import", usage: "wrapper", severity: "low",
    concern: "An import does not establish which algorithm is used.", recommendation: "Inspect actual calls before assigning migration work." },
];

function confidenceFor(kind: EvidenceKind): Confidence {
  return kind === "direct-instantiation" || kind === "certificate-field" ? "confirmed" : "uncertain";
}
function rank(value: Severity): number { return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[value]; }
function componentOf(path: string): string {
  if (path.includes("/src/legacy/")) return "legacy-service";
  if (path.includes("/src/modern/")) return "modern-service";
  if (path.includes("/certs/")) return "pki-inventory";
  if (path === "pasted-input") return "pasted";
  return "seeded-estate";
}
export function sampleFile(path: string, content: string): SampleFile {
  const extension = path.slice(path.lastIndexOf(".") + 1);
  return { path, language: extension === "py" ? "python" : extension === "ts" ? "typescript" : extension,
    component: componentOf(path), content };
}
function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name)) files.push(...walk(path));
    else if (entry.isFile() && !IGNORED_FILES.has(entry.name) &&
      EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf("."))) && statSync(path).size <= MAX_BYTES) files.push(path);
  }
  return files;
}
function loadFiles(root: string, pathPrefix: string): SampleFile[] {
  return walk(root).map((absolute) => {
    const relativePath = relative(root, absolute).split(sep).join("/");
    const path = pathPrefix ? `${pathPrefix}/${relativePath}` : relativePath;
    return sampleFile(path, readFileSync(absolute, "utf8"));
  }).sort((a, b) => a.path.localeCompare(b.path));
}
function lineAt(content: string, offset: number): number { return content.slice(0, offset).split("\n").length; }
function executablePositions(content: string, python: boolean): Uint8Array {
  const positions = new Uint8Array(content.length);
  let mode: "code" | "line" | "block" | "single" | "double" | "template" | "triple-single" | "triple-double" = "code";
  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    const next = content[index + 1];
    if (mode === "line") { if (char === "\n") mode = "code"; continue; }
    if (mode === "block") { if (char === "*" && next === "/") { mode = "code"; index++; } continue; }
    if (mode === "triple-single" || mode === "triple-double") {
      const quote = mode === "triple-single" ? "'" : '"';
      if (char === quote && content.slice(index, index + 3) === quote.repeat(3)) { mode = "code"; index += 2; }
      continue;
    }
    if (mode !== "code") {
      if (char === "\\") { index++; continue; }
      const quote = mode === "single" ? "'" : mode === "double" ? '"' : "`";
      if (char === quote) mode = "code";
      continue;
    }
    if (python && char === "#") { mode = "line"; continue; }
    if (!python && char === "/" && next === "/") { mode = "line"; index++; continue; }
    if (!python && char === "/" && next === "*") { mode = "block"; index++; continue; }
    if (char === "'" || char === '"' || (!python && char === "`")) {
      if (python && content.slice(index, index + 3) === char.repeat(3)) {
        mode = char === "'" ? "triple-single" : "triple-double"; index += 2;
      } else mode = char === "'" ? "single" : char === '"' ? "double" : "template";
      continue;
    }
    positions[index] = 1;
  }
  return positions;
}
function finding(file: SampleFile, line: number, kind: EvidenceKind, values: Omit<Finding, "id" | "path" | "line" | "snippet" | "confidence" | "component" | "evidence">): Finding {
  const snippet = file.content.split(/\r?\n/)[line - 1]?.trim().slice(0, 160);
  if (!snippet || line < 1) throw new Error(`No file-backed evidence at ${file.path}:${line}`);
  return { ...values, id: "", path: file.path, line, snippet, confidence: confidenceFor(kind),
    component: file.component, evidence: `${file.path}:${line}` };
}
function scanSource(file: SampleFile): Finding[] {
  if (file.path.endsWith(".pem")) return [];
  const isConfig = /\.(?:json|yaml|yml|toml|ini|conf)$/.test(file.path);
  const executable = executablePositions(file.content, file.language === "python");
  const results: Finding[] = [];
  for (const rule of RULES) {
    if (isConfig && rule.kind !== "config") continue;
    const seen = new Set<number>();
    for (const match of file.content.matchAll(rule.pattern)) {
      if (rule.kind === "direct-instantiation" && !executable[match.index]) continue;
      const line = lineAt(file.content, match.index);
      if (seen.has(line)) continue;
      seen.add(line);
      results.push(finding(file, line, rule.kind, { mechanism: rule.mechanism, algorithm: rule.algorithm,
        usage: rule.usage, severity: rule.severity, concern: rule.concern,
        recommendation: rule.recommendation, keySize: rule.keySize }));
    }
  }
  return results;
}
function scanCertificate(file: SampleFile): Finding[] {
  if (!file.path.endsWith(".pem")) return [];
  if (!file.content.includes("-----BEGIN CERTIFICATE-----")) return [];
  const cert = forge.pki.certificateFromPem(file.content);
  const signatureOid = cert.signatureOid;
  const signatureName = forge.pki.oids[signatureOid] ?? signatureOid;
  const keySize = cert.publicKey.n?.bitLength();
  const expiresAt = cert.validity.notAfter.toISOString();
  const header = file.content.indexOf("-----BEGIN CERTIFICATE-----");
  if (header < 0) throw new Error(`No certificate header in ${file.path}`);
  const weak = /sha1/i.test(signatureName) || (keySize !== undefined && keySize < 2048);
  return [finding(file, lineAt(file.content, header), "certificate-field", {
    mechanism: `Certificate: ${signatureName}, ${keySize ?? "unknown"}-bit key`, algorithm: signatureName,
    signatureOid, keySize, expiresAt, usage: "certificate", severity: weak ? "critical" : "high",
    concern: weak ? "The parsed certificate uses a weak signature or undersized key." : "This certificate needs quantum migration planning.",
    recommendation: weak ? "Replace this certificate and key promptly." : "Plan certificate rotation and client compatibility testing." })];
}
function scanDependencies(file: SampleFile): { packages: PackageDep[]; findings: Finding[] } {
  const packages: PackageDep[] = [], findings: Finding[] = [];
  const lines = file.content.split(/\r?\n/);
  const add = (name: string, version: string, ecosystem: "npm" | "pypi", line: number) => {
    const known = KNOWN_CRYPTO_PACKAGES[name.toLowerCase()];
    packages.push({ name, version, ecosystem, crypto: Boolean(known), concern: known?.concern });
    if (known) findings.push(finding(file, line, "dependency", {
      mechanism: `${name} direct dependency`, algorithm: "Dependency capability", usage: "library", severity: "low",
      concern: known.concern, recommendation: "Inspect actual call sites before inferring an algorithm." }));
  };
  if (file.path.endsWith("package.json")) {
    const parsed = JSON.parse(file.content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    for (const [name, version] of Object.entries({ ...parsed.dependencies, ...parsed.devDependencies })) {
      const line = lines.findIndex((text) => text.includes(`"${name}"`) && text.includes(`"${version}"`)) + 1;
      if (!line) throw new Error(`Missing direct dependency line: ${name}`);
      add(name, version, "npm", line);
    }
  } else if (file.path.endsWith("requirements.txt")) {
    lines.forEach((text, index) => {
      const match = text.match(/^\s*([A-Za-z0-9_.-]+)\s*==\s*([A-Za-z0-9_.+-]+)\s*(?:#.*)?$/);
      if (match) add(match[1], match[2], "pypi", index + 1);
    });
  }
  return { packages, findings };
}
export function scanFiles(files: SampleFile[]): ScanResult {
  const findings: Finding[] = [], packages: PackageDep[] = [];
  for (const file of files) {
    findings.push(...scanSource(file), ...scanCertificate(file));
    if (file.path.endsWith("package.json") || file.path.endsWith("requirements.txt")) {
      const deps = scanDependencies(file); packages.push(...deps.packages); findings.push(...deps.findings);
    }
  }
  findings.sort((a, b) => rank(b.severity) - rank(a.severity) || a.path.localeCompare(b.path) || a.line - b.line);
  findings.forEach((item, index) => { item.id = `F-${index + 1}`; });
  const inventory = [...new Set(files.map((file) => file.component))].map((component) => {
    const selectedFiles = files.filter((file) => file.component === component);
    const selectedFindings = findings.filter((item) => item.component === component);
    return { component, files: selectedFiles.map((file) => file.path),
      mechanisms: [...new Set(selectedFindings.map((item) => item.algorithm))],
      packages: packages.filter((pkg) => selectedFiles.some((file) =>
        file.path.endsWith(pkg.ecosystem === "npm" ? "package.json" : "requirements.txt") && file.content.includes(pkg.name))),
      findingCount: selectedFindings.length,
      highestSeverity: selectedFindings.reduce<Severity>((current, item) => rank(item.severity) > rank(current) ? item.severity : current, "info") };
  });
  return { scannedAt: new Date().toISOString(), files: files.length, findings, inventory, packages,
    stats: { critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
      info: findings.filter((f) => f.severity === "info").length,
      confirmed: findings.filter((f) => f.confidence === "confirmed").length,
      uncertain: findings.filter((f) => f.confidence === "uncertain").length,
      hidden: findings.filter((f) => f.hidden).length } };
}
export function scanEstate(rootDir = DEFAULT_ROOT, pathPrefix?: string): ScanResult {
  const root = resolve(rootDir);
  return scanFiles(loadFiles(root, pathPrefix ?? (root === DEFAULT_ROOT ? "demo/seeded-estate" : "")));
}
export function listEstateFiles(rootDir = DEFAULT_ROOT): Pick<SampleFile, "path" | "language" | "component">[] {
  const root = resolve(rootDir);
  return loadFiles(root, root === DEFAULT_ROOT ? "demo/seeded-estate" : "")
    .map(({ path, language, component }) => ({ path, language, component }));
}
export function scanPasted(content: string, baseFiles: SampleFile[] = loadFiles(DEFAULT_ROOT, "demo/seeded-estate")): ScanResult {
  if (!content.trim() || content.length > MAX_BYTES) throw new Error("Snippet must be nonempty and at most 1 MiB");
  return scanFiles([...baseFiles, sampleFile("pasted-input", content)]);
}
export function clearPasted(baseFiles: SampleFile[] = loadFiles(DEFAULT_ROOT, "demo/seeded-estate")): ScanResult {
  return scanFiles(baseFiles);
}
