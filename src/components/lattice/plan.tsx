import { Badge } from "@/components/ui/badge";
import { ConfidenceMark } from "@/components/lattice/confidence-mark";
import { buildChecklist, buildGraph } from "@/lib/scanner/plan";
import type { ChecklistItem, Confidence } from "@/lib/scanner/types";
import { useLattice } from "@/lib/store";

function ChecklistGroup({
  title,
  confidence,
  items,
}: {
  title: string;
  confidence: Confidence;
  items: ChecklistItem[];
}) {
  return (
    <section
      className={
        confidence === "confirmed"
          ? "rounded-xl border border-ok/35 bg-ok/5 p-4 sm:p-5"
          : "rounded-xl border border-warn/35 bg-warn/5 p-4 sm:p-5"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceMark confidence={confidence} compact />
        <h2 className="lattice-section-title">{title}</h2>
        <Badge tone={confidence === "confirmed" ? "ok" : "warn"}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No findings in this group.</p>
      ) : null}
      <ol className="mt-4 space-y-3">
        {items.map(({ priority, finding }) => (
          <li key={finding.id} className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs tabular-nums text-muted">#{priority}</span>
              <ConfidenceMark confidence={confidence} compact />
              <Badge
                tone={
                  finding.severity === "critical"
                    ? "risk"
                    : finding.severity === "high"
                      ? "warn"
                      : "neutral"
                }
              >
                {finding.severity}
              </Badge>
            </div>
            <h3 className="mt-3 text-sm font-medium">{finding.recommendation}</h3>
            <p className="mt-2 text-sm text-muted">{finding.concern}</p>
            <p className="mt-3 break-all font-mono text-xs text-subtle">
              {finding.path}:{finding.line} · {finding.mechanism}
            </p>
            {finding.expiresAt ? (
              <p className="mt-1 text-xs text-subtle">Expires {finding.expiresAt.slice(0, 10)}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Plan() {
  const scan = useLattice((s) => s.scan);
  const items = buildChecklist(scan);
  const graph = buildGraph(scan);

  return (
    <div className="lattice-page">
      <header>
        <h1 className="lattice-title">Migration plan</h1>
        <p className="lattice-lede">
          One action per live finding. Priority puts asymmetric cryptography first, then
          certificates by expiry, then internet-facing paths before internal paths. Review uncertain
          evidence before changing code.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChecklistGroup
          title="Confirmed actions"
          confidence="confirmed"
          items={items.filter((item) => item.finding.confidence === "confirmed")}
        />
        <ChecklistGroup
          title="Needs verification"
          confidence="uncertain"
          items={items.filter((item) => item.finding.confidence === "uncertain")}
        />
      </div>

      <section>
        <h2 className="lattice-section-title">Migration order graph</h2>
        <p className="mt-1 text-sm text-muted">
          Each node is a finding. Arrows show review order, not software dependencies.
        </p>
        {graph.nodes.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No findings to order.</p>
        ) : null}
        <ol className="mt-4 max-w-3xl">
          {graph.nodes.map((node, index) => (
            <li key={node.id}>
              <div
                className={
                  node.confidence === "confirmed"
                    ? "rounded-lg border border-ok/35 bg-surface p-3"
                    : "rounded-lg border border-warn/35 bg-surface p-3"
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted">#{node.order}</span>
                  <ConfidenceMark confidence={node.confidence} compact />
                  <span className="text-sm font-medium">{node.label}</span>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-subtle">
                  {node.path}:{node.line}
                </p>
              </div>
              {graph.edges[index] ? (
                <div aria-hidden="true" className="py-1 pl-4 text-sm text-muted">
                  ↓
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
