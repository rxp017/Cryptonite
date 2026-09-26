import { unzipSync } from "fflate";
import type { SampleFile } from "./types";

export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
export const MAX_FILES = 200;
const extensions = /(?:\.(?:ts|tsx|js|jsx|mjs|cjs|py|json|txt|pem|crt|yaml|yml|toml|ini|conf|env)|(?:^|\/)\.env(?:\.[\w-]+)?)$/i;
const ignored = new Set([".git", "node_modules", "dist", "build", ".vercel", ".output", "coverage"]);

export type InputFile = { path: string; content: string };

function componentFor(parts: string[]): string {
  const source = parts.lastIndexOf("src");
  if (source >= 0 && source + 2 < parts.length) return parts[source + 1];
  const certs = parts.find((part) => /^(?:certs|certificates|pki)$/i.test(part));
  if (certs) return "certificates";
  if (/^(?:package\.json|requirements\.txt)$/.test(parts.at(-1) || "")) return "dependencies";
  return parts.length > 2 ? parts[parts.length - 2] : parts.length > 1 ? parts[0] : "uploaded-files";
}

export function allowedPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const parts = normalized.split("/");
  return normalized.length <= 240 && !normalized.startsWith("/") &&
    !/^[A-Za-z]:/.test(normalized) && !/\0/.test(normalized) &&
    parts.every((part) => part && part !== "." && part !== ".." && !ignored.has(part)) &&
    !normalized.endsWith("package-lock.json") && extensions.test(normalized);
}

export function prepareInputFiles(input: InputFile[]): SampleFile[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_FILES) {
    throw new Error(`Select 1–${MAX_FILES} supported files.`);
  }
  let bytes = 0;
  const seen = new Set<string>();
  return input.map(({ path, content }) => {
    if (typeof path !== "string" || typeof content !== "string" || !allowedPath(path)) {
      throw new Error(`Unsupported or unsafe file path: ${String(path).slice(0, 80)}`);
    }
    const normalized = path.replaceAll("\\", "/");
    if (seen.has(normalized)) throw new Error(`Duplicate file: ${normalized}`);
    seen.add(normalized);
    const size = Buffer.byteLength(content, "utf8");
    bytes += size;
    if (size > MAX_FILE_BYTES || bytes > MAX_TOTAL_BYTES) {
      throw new Error("Scan limit: 1 MiB per file, 3 MiB total.");
    }
    if (content.includes("\0")) throw new Error(`Binary file is not supported: ${normalized}`);
    const parts = normalized.split("/");
    const component = componentFor(parts);
    const suffix = normalized.slice(normalized.lastIndexOf(".") + 1).toLowerCase();
    return { path: normalized, content, component,
      language: suffix === "py" ? "python" : suffix === "ts" || suffix === "tsx" ? "typescript" : suffix };
  });
}

export function unzipInput(base64: string): SampleFile[] {
  if (typeof base64 !== "string" || base64.length > MAX_TOTAL_BYTES * 2 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error("Invalid or oversized ZIP input.");
  const compressed = Buffer.from(base64, "base64");
  if (compressed[0] !== 0x50 || compressed[1] !== 0x4b) throw new Error("Not a ZIP archive.");
  let files = 0, bytes = 0;
  const entries = unzipSync(compressed, { filter: (entry) => {
    if (!allowedPath(entry.name)) return false;
    files += 1;
    bytes += entry.originalSize;
    if (files > MAX_FILES || entry.originalSize > MAX_FILE_BYTES || bytes > MAX_TOTAL_BYTES) {
      throw new Error("ZIP scan limit: 200 files, 1 MiB per file, 3 MiB total.");
    }
    return true;
  } });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  return prepareInputFiles(Object.entries(entries).map(([path, data]) => ({
    path, content: decoder.decode(data),
  })));
}
