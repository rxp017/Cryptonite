import { Badge } from "@/components/ui/badge";
import { ConfidenceMark } from "@/components/lattice/confidence-mark";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileSearch, LoaderCircle } from "lucide-react";
import { useLattice } from "@/lib/store";
import type { Severity } from "@/lib/scanner/types";
import { cn } from "@/lib/utils";

function sevTone(s: Severity) {
  if (s === "critical") return "risk" as const;
  if (s === "high") return "warn" as const;
  if (s === "medium") return "info" as const;
  if (s === "low") return "neutral" as const;
  return "ok" as const;
}

export function Findings() {
  const scan = useLattice((s) => s.scan);
  const selected = useLattice((s) => s.selectedFinding);
  const select = useLattice((s) => s.selectFinding);
  const sev = useLattice((s) => s.filterSeverity);
  const setSev = useLattice((s) => s.setFilterSeverity);
  const conf = useLattice((s) => s.filterConfidence);
  const setConf = useLattice((s) => s.setFilterConfidence);
  const reduceMotion = useReducedMotion();
  const isLoading = !scan.scannedAt;

  const rows = scan.findings.filter((f) => {
    if (sev !== "all" && f.severity !== sev) return false;
    if (conf !== "all" && f.confidence !== conf) return false;
    return true;
  });
  const active = rows.find((f) => f.id === selected) ?? rows[0];

  return (
    <div className="lattice-page" aria-busy={isLoading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="lattice-title">Findings</h1>
          <p className="lattice-lede">File and line evidence, with distinct confidence levels.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Filter
            label="Severity"
            value={sev}
            onChange={setSev}
            options={["all", "critical", "high", "medium", "low"]}
          />
          <Filter
            label="Confidence"
            value={conf}
            onChange={setConf}
            options={["all", "confirmed", "uncertain"]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="lattice-empty" role="status" aria-live="polite">
          <LoaderCircle className="size-6 animate-spin text-info" aria-hidden="true" />
          <p className="lattice-section-title">Scanning the seeded estate</p>
          <p className="text-sm text-muted">Findings and file evidence will appear here.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="lattice-empty" role="status">
          <FileSearch className="size-6 text-info" aria-hidden="true" />
          <p className="lattice-section-title">
            {scan.findings.length ? "No matches for these filters" : "No findings in this scan"}
          </p>
          <p className="max-w-sm text-sm text-muted">
            {scan.findings.length
              ? "Change the severity or confidence filter to see more evidence."
              : "The scanned files produced no matching crypto findings."}
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div
            className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]"
            aria-label="Scan findings"
          >
            <ul className="divide-y divide-border">
              {rows.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => select(f.id)}
                    aria-pressed={active?.id === f.id}
                    className={cn(
                      "flex min-h-16 w-full flex-col gap-2 border-l-2 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 sm:flex-row sm:items-center sm:gap-4",
                      f.confidence === "confirmed" ? "border-l-ok" : "border-l-warn",
                      active?.id === f.id ? "bg-elevated" : "hover:bg-elevated/60",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Badge tone={sevTone(f.severity)}>{f.severity}</Badge>
                      {f.hidden ? <Badge>hidden</Badge> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{f.mechanism}</span>
                      <span className="block truncate font-mono text-xs text-muted">
                        {f.path}:{f.line}
                      </span>
                    </span>
                    <ConfidenceMark confidence={f.confidence} compact />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {active ? (
              <motion.aside
                key={active.id}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
                className="lattice-card"
                aria-label="Finding details"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge tone={sevTone(active.severity)}>{active.severity}</Badge>
                  <ConfidenceMark confidence={active.confidence} compact />
                  <Badge>{active.usage}</Badge>
                </div>
                <h2 className="mt-4 text-lg font-medium tracking-tight">{active.mechanism}</h2>
                <p className="mt-1 font-mono text-xs text-muted">
                  {active.evidence}
                  {active.keySize ? ` · ${active.keySize}-bit` : ""}
                </p>
                <pre className="mt-4 overflow-x-auto rounded-md bg-elevated p-3 font-mono text-xs text-accent">
                  {active.snippet}
                </pre>
                <h3 className="lattice-eyebrow mt-5">Concern</h3>
                <p className="mt-1 text-sm leading-relaxed">{active.concern}</p>
                <h3 className="lattice-eyebrow mt-4">Recommendation</h3>
                <p className="mt-1 text-sm leading-relaxed">{active.recommendation}</p>
                <p className="mt-4 text-xs text-subtle">Component {active.component}</p>
              </motion.aside>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-32 rounded-md bg-elevated px-3 text-sm capitalize text-fg shadow-[var(--shadow-border)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
