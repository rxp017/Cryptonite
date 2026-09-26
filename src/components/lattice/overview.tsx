import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CircleHelp, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ESTATE_NAME, ESTATE_NOTE } from "@/lib/scanner/samples";
import { useLattice } from "@/lib/store";
import { ScanTarget } from "@/components/lattice/scan-target";
import { OverviewCharts } from "@/components/lattice/overview-charts";
import { cn } from "@/lib/utils";

const toneFor = (k: string) =>
  k === "critical" ? "risk" : k === "high" ? "warn" : k === "medium" ? "info" : "neutral";

export function Overview() {
  const scan = useLattice((s) => s.scan);
  const paste = useLattice((s) => s.paste);
  const reset = useLattice((s) => s.reset);
  const files = useLattice((s) => s.files);
  const sourceName = useLattice((s) => s.sourceName);
  const [draft, setDraft] = useState("");
  const navigate = useNavigate();

  const cards = [
    ["Files", String(scan.files)],
    ["Findings", String(scan.findings.length)],
    ["Confirmed", String(scan.stats.confirmed)],
    ["Uncertain", String(scan.stats.uncertain)],
    ["Components", String(scan.inventory.length)],
  ] as const;

  return (
    <div className="lattice-page">
      <section className="lattice-card sm:p-8">
        <p className="lattice-eyebrow">Estate</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl">
          {sourceName}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{sourceName === ESTATE_NAME ? ESTATE_NOTE : "Live results from the supplied scan target."}</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-subtle">
          Lattice inventories algorithms, key sizes, libraries, certificates, and protocol knobs. It
          ranks migration work and demonstrates a swappable provider interface. It does not certify
          a system as quantum-safe.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/" search={{ tab: "findings" }}>
              Review findings
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/" search={{ tab: "sandbox" }}>
              Open sandbox
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void reset();
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset estate
          </Button>
        </div>
      </section>

      <ScanTarget />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className={cn(
              "rounded-lg border-l-2 bg-surface px-4 py-4 shadow-[var(--shadow-border)]",
              label === "Confirmed"
                ? "border-l-ok"
                : label === "Uncertain"
                  ? "border-l-warn"
                  : "border-l-transparent",
            )}
          >
            <p className="flex items-center gap-1.5 text-xs text-muted">
              {label === "Confirmed" ? (
                <ShieldCheck className="size-3.5 text-ok" aria-hidden="true" />
              ) : null}
              {label === "Uncertain" ? (
                <CircleHelp className="size-3.5 text-warn" aria-hidden="true" />
              ) : null}
              {label}
            </p>
            <p className="mt-2 font-mono text-2xl tabular-nums tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        {(["critical", "high", "medium", "low"] as const).map((k) => (
          <Link
            key={k}
            to="/"
            search={{ tab: "findings" }}
            className="rounded-lg bg-surface px-4 py-4 text-left shadow-[var(--shadow-border)]"
          >
            <Badge tone={toneFor(k)}>{k}</Badge>
            <p className="mt-3 font-mono text-3xl tabular-nums">{scan.stats[k]}</p>
          </Link>
        ))}
      </section>

      <OverviewCharts scan={scan} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="lattice-card">
          <h2 className="lattice-section-title">Scanned files</h2>
          <ul className="mt-3 max-h-72 overflow-auto font-mono text-xs leading-6 text-muted">
            {files.map((f) => (
              <li key={f.path} className="flex gap-3">
                <span className="text-subtle">{f.component}</span>
                <span className="text-fg">{f.path}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lattice-card">
          <h2 className="lattice-section-title">Paste additional source</h2>
          <p className="mt-1 text-xs text-muted">
            Scanned in memory as <span className="font-mono">pasted-input</span> alongside the bundled
            estate. This action replaces an uploaded target. Reset or reload clears it.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={'createHash("md5").update(input).digest("hex")'}
            className={cn(
              "mt-3 min-h-32 w-full resize-y rounded-md bg-elevated px-3 py-2 font-mono text-xs text-fg",
              "shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            )}
          />
          <Button
            className="mt-3"
            variant="secondary"
            disabled={!draft.trim()}
            onClick={() => {
              void paste(draft);
              void navigate({ to: "/", search: { tab: "findings" } });
            }}
          >
            Scan pasted source
          </Button>
        </div>
      </section>
    </div>
  );
}
