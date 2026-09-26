import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { allowedPath, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES, prepareInputFiles } from "./input-files.ts";
import type { SampleFile } from "./types";

const exec = promisify(execFile);

export function canonicalGitHubUrl(input: string): string {
  if (typeof input !== "string" || input.length > 240) throw new Error("Enter a public GitHub repository URL.");
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a valid HTTPS GitHub URL."); }
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port ||
      url.username || url.password || url.search || url.hash) throw new Error("Only public HTTPS github.com URLs are supported.");
  const match = url.pathname.match(/^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  if (!match || match[1].startsWith(".") || match[2].startsWith(".")) {
    throw new Error("Use a repository URL such as https://github.com/owner/repo.");
  }
  return `https://github.com/${match[1]}/${match[2]}.git`;
}

export async function cloneInput(url: string): Promise<SampleFile[]> {
  const canonical = canonicalGitHubUrl(url);
  const temporary = await mkdtemp(join(tmpdir(), "lattice-git-"));
  const checkout = join(temporary, "repo");
  try {
    try {
      await exec("git", ["clone", "--depth", "1", "--single-branch", "--quiet", "--", canonical, checkout], {
        timeout: 30000, maxBuffer: 128 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" },
      });
    } catch {
      throw new Error("Could not clone repository: Git URL scanning requires outbound network access and Git on the server. In sandboxes without outbound network access, use folder upload or ZIP upload instead.");
    }
    const selected: { path: string; content: string }[] = [];
    let total = 0;
    async function walk(dir: string, prefix = "", depth = 0): Promise<void> {
      if (depth > 12) return;
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if ([".git", "node_modules", "dist", "build", ".vercel", "coverage"].includes(entry.name)) continue;
        if (entry.isDirectory()) await walk(join(dir, entry.name), relative, depth + 1);
        else if (entry.isFile() && allowedPath(relative)) {
          const info = await stat(join(dir, entry.name));
          if (info.size > MAX_FILE_BYTES) continue;
          total += info.size;
          if (selected.length >= MAX_FILES || total > MAX_TOTAL_BYTES) throw new Error("Repository scan limit: 200 files and 3 MiB of supported source.");
          selected.push({ path: relative, content: await readFile(join(dir, entry.name), "utf8") });
        }
      }
    }
    await walk(checkout);
    if (!selected.length) throw new Error("No supported source, config, manifest, or certificate files found in this repository.");
    return prepareInputFiles(selected);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
