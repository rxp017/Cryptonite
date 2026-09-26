import { useState } from "react";
import { FileArchive, FolderOpen, Github, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLattice } from "@/lib/store";

const supported = /(?:\.(?:ts|tsx|js|jsx|mjs|cjs|py|json|txt|pem|crt|yaml|yml|toml|ini|conf|env)|(?:^|\/)\.env(?:\.[\w-]+)?)$/i;
const ignored = /(?:^|\/)(?:\.git|node_modules|dist|build|\.vercel|coverage)(?:\/|$)/;

export function ScanTarget() {
  const uploadFiles = useLattice((s) => s.uploadFiles);
  const uploadZip = useLattice((s) => s.uploadZip);
  const cloneGitHub = useLattice((s) => s.cloneGitHub);
  const sourceName = useLattice((s) => s.sourceName);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setError(""); setBusy(true);
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Scan failed."); }
    finally { setBusy(false); }
  }
  async function scanSelected(list: FileList | File[]) {
    const files = Array.from(list).filter((file) => {
      const path = file.webkitRelativePath || file.name;
      return supported.test(path) && !ignored.test(path) && file.name !== "package-lock.json";
    });
    if (!files.length) { setError("No supported source, config, manifest, or PEM certificate files found."); return; }
    if (files.length > 200 || files.some((file) => file.size > 1024 * 1024) ||
        files.reduce((sum, file) => sum + file.size, 0) > 3 * 1024 * 1024) {
      setError("Scan limit: 200 files, 1 MiB each, 3 MiB total."); return;
    }
    await run(async () => uploadFiles(await Promise.all(files.map(async (file) => ({
      path: file.webkitRelativePath || file.name, content: await file.text(),
    }))), files[0].webkitRelativePath?.split("/")[0] || "Uploaded files"));
  }
  async function scanZip(file?: File) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError("ZIP must be at most 3 MiB."); return; }
    await run(async () => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Could not read ZIP."));
        reader.readAsDataURL(file);
      });
      await uploadZip(base64, file.name);
    });
  }

  return <section className="lattice-card" aria-labelledby="scan-target-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="lattice-eyebrow">Input</p>
        <h2 id="scan-target-heading" className="lattice-section-title mt-1">Scan target</h2>
        <p className="mt-1 text-xs text-muted">Current: {sourceName}. Uploads replace the current estate. Supported files are scanned in memory.</p>
      </div>
      {busy ? <span role="status" className="text-xs text-muted">Scanning…</span> : null}
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-elevated px-3 text-center text-xs text-muted hover:text-fg">
        <FolderOpen className="size-5 text-accent" /> Repository folder
        <input aria-label="Upload repository folder" type="file" multiple className="sr-only"
          ref={(node) => node?.setAttribute("webkitdirectory", "")}
          onChange={(event) => { if (event.target.files) void scanSelected(event.target.files); event.target.value = ""; }} />
      </label>
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-elevated px-3 text-center text-xs text-muted hover:text-fg">
        <FileArchive className="size-5 text-accent" /> Repository ZIP
        <input aria-label="Upload repository ZIP" type="file" accept=".zip,application/zip" className="sr-only"
          onChange={(event) => { void scanZip(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-elevated px-3 text-center text-xs text-muted hover:text-fg"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); void scanSelected(event.dataTransfer.files); }}>
        <Upload className="size-5 text-accent" /> Drop config / cert files or browse
        <input aria-label="Upload loose config and certificate files" type="file" multiple className="sr-only"
          accept=".pem,.crt,.yaml,.yml,.json,.toml,.env,.conf,.ini,.txt,.ts,.js,.py"
          onChange={(event) => { if (event.target.files) void scanSelected(event.target.files); event.target.value = ""; }} />
      </label>
    </div>
    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
      event.preventDefault(); if (url.trim()) void run(() => cloneGitHub(url.trim()));
    }}>
      <input aria-label="Public GitHub repository URL" type="url" value={url} onChange={(event) => setUrl(event.target.value)}
        placeholder="https://github.com/owner/repo" className="min-h-11 min-w-0 flex-1 rounded-md bg-elevated px-3 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle" />
      <Button type="submit" variant="secondary" disabled={busy || !url.trim()}><Github className="size-4" /> Scan public GitHub repo</Button>
    </form>
    <p className="mt-2 text-xs text-subtle">Public github.com repositories only. The server makes a shallow clone, scans supported files, then removes it. Requires server network access (use folder or ZIP upload in network-isolated environments).</p>
    {error ? <p role="alert" className="mt-3 text-sm text-risk">{error}</p> : null}
  </section>;
}
