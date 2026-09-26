import { Badge } from "@/components/ui/badge";
import { ConfidenceMark } from "@/components/lattice/confidence-mark";
import { Button } from "@/components/ui/button";
import { buildReportModel, renderMarkdownReport, reportFileName } from "@/lib/scanner/report";
import type { ChecklistItem, Finding } from "@/lib/scanner/types";
import { useLattice } from "@/lib/store";
import { useEffect, useState } from "react";

function FindingList({
  title,
  findings,
  confirmed,
}: {
  title: string;
  findings: Finding[];
  confirmed: boolean;
}) {
  return (
    <section
      className={
        confirmed
          ? "rounded-xl border border-ok/35 bg-ok/5 p-5"
          : "rounded-xl border border-warn/35 bg-warn/5 p-5"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceMark confidence={confirmed ? "confirmed" : "uncertain"} compact />
        <h2 className="lattice-section-title">{title}</h2>
        <Badge tone={confirmed ? "ok" : "warn"}>{findings.length}</Badge>
      </div>
      {findings.length === 0 ? <p className="mt-3 text-sm text-muted">None in this scan.</p> : null}
      <ul className="mt-3 space-y-3">
        {findings.map((finding) => (
          <li
            key={finding.id}
            className="rounded-lg bg-surface p-3 text-sm shadow-[var(--shadow-border)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{finding.mechanism}</span>
              <ConfidenceMark confidence={finding.confidence} compact />
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
            <p className="mt-1 break-all font-mono text-xs text-subtle">
              {finding.path}:{finding.line}
            </p>
            <p className="mt-2 text-muted">{finding.concern}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WorkList({
  title,
  items,
  confirmed,
}: {
  title: string;
  items: ChecklistItem[];
  confirmed: boolean;
}) {
  return (
    <section
      className={
        confirmed
          ? "rounded-xl border border-ok/35 bg-ok/5 p-5"
          : "rounded-xl border border-warn/35 bg-warn/5 p-5"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceMark confidence={confirmed ? "confirmed" : "uncertain"} compact />
        <h2 className="lattice-section-title">{title}</h2>
      </div>
      {items.length === 0 ? <p className="mt-3 text-sm text-muted">None in this scan.</p> : null}
      <ol className="mt-3 space-y-3">
        {items.map(({ priority, finding }) => (
          <li
            key={finding.id}
            className="rounded-lg bg-surface p-3 text-sm shadow-[var(--shadow-border)]"
          >
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted">#{priority}</span>
              <ConfidenceMark confidence={finding.confidence} compact />
              <span>{finding.recommendation}</span>
            </p>
            <p className="mt-1 break-all font-mono text-xs text-subtle">
              {finding.path}:{finding.line} · {finding.mechanism}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Report() {
  const scan = useLattice((state) => state.scan);
  const report = buildReportModel(scan);
  const markdown = renderMarkdownReport(report);
  const [downloadUrl, setDownloadUrl] = useState("");
  useEffect(() => {
    if (!scan.scannedAt) return;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [markdown, scan.scannedAt]);

  return (
    <article className="lattice-page mx-auto max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="lattice-eyebrow">Lattice report</p>
          <h1 className="lattice-title mt-2">{report.title}</h1>
          <p className="mt-1 text-sm text-muted">{report.estateName}</p>
          <p className="mt-2 text-sm text-muted">
            Generated {report.generatedAt ? report.generatedAt.slice(0, 10) : "Scan pending"} ·{" "}
            {report.fileCount} files · {report.findingCount} findings
          </p>
        </div>
        {downloadUrl && report.generatedAt ? (
          <Button asChild>
            <a href={downloadUrl} download={reportFileName(report)}>
              Download report
            </a>
          </Button>
        ) : (
          <Button disabled>Download report</Button>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <FindingList title="Confirmed findings" findings={report.confirmed} confirmed />
        <FindingList
          title="Uncertain findings — verify usage"
          findings={report.uncertain}
          confirmed={false}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WorkList title="Confirmed migration actions" items={report.confirmedWork} confirmed />
        <WorkList
          title="Uncertain migration actions — verify first"
          items={report.uncertainWork}
          confirmed={false}
        />
      </div>

      <section>
        <h2 className="lattice-section-title">Compatibility risks to test</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {report.compatibilityRisks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="lattice-section-title">Testing steps</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {report.testingSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-risk/40 bg-risk/10 p-5">
        <h2 className="lattice-section-title text-risk">Limitations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {report.limitations.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-medium">{report.disclaimer}</p>
      </section>
    </article>
  );
}
