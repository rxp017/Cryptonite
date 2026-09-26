import { useLattice } from "@/lib/store";
import { ConfidenceMark } from "@/components/lattice/confidence-mark";

export function CiGate() {
  const scan = useLattice((state) => state.scan);
  const highRisk = scan.findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  );
  return (
    <div className="lattice-page">
      <div>
        <h1 className="lattice-title">Scanner CLI and CI status</h1>
        <p className="lattice-lede">
          The local scanner CLI runs. A GitHub workflow is in the repository for PR and push
          comparisons, but no GitHub run has been verified for this revision. This tab does not
          show PR diff results.
        </p>
      </div>
      <section className="lattice-card">
        <h2 className="lattice-section-title">Run the scanner</h2>
        <code className="mt-3 block overflow-x-auto rounded-md bg-elevated p-3 text-xs">
          npm run --silent scan -- demo/seeded-estate
        </code>
        <p className="mt-2 text-xs text-muted">
          JSON goes to standard output. Evidence paths are relative to the target folder.
        </p>
      </section>
      <section className="lattice-card">
        <h2 className="lattice-section-title">Workflow in source</h2>
        <p className="mt-2 text-sm text-muted">
          <span className="font-mono">.github/workflows/crypto-ci.yml</span> scans the current and base
          revisions, warns on new dependency/config references, and gates new high-severity config
          or protocol references. Same-repository PRs receive a findings comment. Hosted execution
          is unverified until a GitHub Actions run completes.
        </p>
      </section>
      <section className="lattice-card">
        <h2 className="lattice-section-title">Current in-app scan: high-risk findings</h2>
        <p className="mt-1 text-xs text-muted">
          These rows come from the live estate scan, not a CI run or PR comparison.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {highRisk.map((finding) => (
            <li
              key={finding.id}
              className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0"
            >
              <span className="font-medium">{finding.mechanism}</span>
              <span className="font-mono text-xs text-muted">
                {finding.path}:{finding.line}
              </span>
              <ConfidenceMark confidence={finding.confidence} compact className="sm:ml-auto" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
