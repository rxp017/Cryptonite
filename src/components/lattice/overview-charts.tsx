import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScanResult, Severity } from "@/lib/scanner/types";

const severityOrder: Severity[] = ["critical", "high", "medium", "low", "info"];
const severityColor: Record<Severity, string> = {
  critical: "var(--color-risk)", high: "var(--color-warn)", medium: "var(--color-info)",
  low: "var(--color-ok)", info: "var(--color-subtle)",
};
const palette = ["var(--color-risk)", "var(--color-warn)", "var(--color-info)", "var(--color-ok)", "var(--color-accent)", "var(--color-subtle)"];
const axis = { fill: "var(--color-muted)", fontSize: 11 };
const tooltip = { backgroundColor: "var(--color-elevated)", border: "1px solid var(--color-border)", color: "var(--color-fg)" };

export function OverviewCharts({ scan }: { scan: ScanResult }) {
  const severity = severityOrder.map((name) => ({ name, count: scan.stats[name] }));
  const mechanismCounts = new Map<string, number>();
  for (const finding of scan.findings) {
    const name = finding.usage === "library" ? finding.mechanism.replace(/ direct dependency$/, "") : finding.algorithm;
    mechanismCounts.set(name, (mechanismCounts.get(name) || 0) + 1);
  }
  const sorted = [...mechanismCounts].sort((a, b) => b[1] - a[1]);
  const distribution = sorted.slice(0, 5).map(([name, value]) => ({ name, value }));
  if (sorted.length > 5) distribution.push({ name: "Other", value: sorted.slice(5).reduce((sum, [, count]) => sum + count, 0) });
  const components = scan.inventory.map(({ component }) => ({
    name: component,
    confirmed: scan.findings.filter((f) => f.component === component && f.confidence === "confirmed").length,
    uncertain: scan.findings.filter((f) => f.component === component && f.confidence === "uncertain").length,
  }));

  return <section className="grid gap-3 lg:grid-cols-3" aria-label="Live scan charts">
    <article className="lattice-card min-w-0">
      <h2 className="lattice-section-title">Findings by concern</h2>
      <p className="mt-1 text-xs text-muted">Severity of current findings</p>
      <div className="mt-4 h-56" role="img" aria-label={severity.map((d) => `${d.name}: ${d.count}`).join(", ")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={severity} margin={{ top: 4, right: 5, left: -24, bottom: 2 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltip} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {severity.map((item) => <Cell key={item.name} fill={severityColor[item.name]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
    <article className="lattice-card min-w-0">
      <h2 className="lattice-section-title">Algorithm / library mix</h2>
      <p className="mt-1 text-xs text-muted">Finding counts; references can be uncertain</p>
      <div className="mt-4 h-56" role="img" aria-label={distribution.map((d) => `${d.name}: ${d.value}`).join(", ") || "No findings"}>
        {distribution.length ? <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
              {distribution.map((item, index) => <Cell key={item.name} fill={palette[index % palette.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer> : <p className="pt-20 text-center text-xs text-muted">No matched mechanisms</p>}
      </div>
    </article>
    <article className="lattice-card min-w-0">
      <h2 className="lattice-section-title">Review queue by component</h2>
      <p className="mt-1 text-xs text-muted">Confirmed evidence vs uncertain references</p>
      <div className="mt-4 h-56" role="img" aria-label={components.map((d) => `${d.name}: ${d.confirmed} confirmed, ${d.uncertain} uncertain`).join("; ")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={components} layout="vertical" margin={{ top: 4, right: 5, left: 18, bottom: 2 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis type="number" allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={90} tick={axis} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="confirmed" stackId="queue" fill="var(--color-ok)" />
            <Bar dataKey="uncertain" stackId="queue" fill="var(--color-warn)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  </section>;
}
