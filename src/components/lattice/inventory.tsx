import { Badge } from "@/components/ui/badge";
import { useLattice } from "@/lib/store";
import type { Severity } from "@/lib/scanner/types";
import { DependencyGraph } from "./dependency-graph";

function sevTone(s: Severity) {
  if (s === "critical") return "risk" as const;
  if (s === "high") return "warn" as const;
  if (s === "medium") return "info" as const;
  return "neutral" as const;
}

export function Inventory() {
  const scan = useLattice((s) => s.scan);
  const cryptoPkgs = scan.packages.filter((p) => p.crypto);

  return (
    <div className="lattice-page">
      <div>
        <h1 className="lattice-title">Dependency inventory</h1>
        <p className="lattice-lede">
          Direct packages from the scanned manifests and file-backed crypto evidence.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {scan.inventory.map((c) => (
          <article key={c.component} className="lattice-card">
            <div className="flex items-start justify-between gap-3">
              <h2 className="lattice-section-title">{c.component}</h2>
              <Badge tone={sevTone(c.highestSeverity)}>{c.highestSeverity}</Badge>
            </div>
            <p className="mt-1 font-mono text-xs tabular-nums text-muted">
              {c.findingCount} findings
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.mechanisms.length ? (
                c.mechanisms.map((m) => (
                  <Badge key={m} tone="neutral">
                    {m}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-subtle">No cryptographic mechanisms matched</span>
              )}
            </div>
            <ul className="mt-4 space-y-1 font-mono text-[11px] text-muted">
              {c.files.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <DependencyGraph scan={scan} />

      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="lattice-section-title">Cryptographic packages</h2>
          <p className="text-xs text-muted">Direct manifest dependencies only.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Version</th>
                <th className="px-5 py-3 font-medium">Eco</th>
                <th className="px-5 py-3 font-medium">Kind</th>
                <th className="px-5 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {cryptoPkgs.map((p, i) => (
                <tr key={`${p.name}-${i}`} className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-xs">{p.version}</td>
                  <td className="px-5 py-3 text-xs text-muted">{p.ecosystem}</td>
                  <td className="px-5 py-3">
                    <Badge tone="info">direct</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">{p.concern}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
