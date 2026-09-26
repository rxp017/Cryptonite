import { useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ConfidenceMark } from "./confidence-mark";
import type { Finding, ScanResult } from "@/lib/scanner/types";

function mechanismName(finding: Finding): string {
  return finding.usage === "library" ? finding.mechanism : finding.algorithm;
}

export function DependencyGraph({ scan }: { scan: ScanResult }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { nodes, edges, evidence } = useMemo(() => {
    const nodes: Node[] = [], edges: Edge[] = [];
    const evidence = new Map<string, Finding[]>();
    const mechanismNames = [...new Set(scan.findings.map(mechanismName))].sort();
    scan.inventory.forEach((component, index) => {
      const id = `component:${component.component}`;
      const findings = scan.findings.filter((item) => item.component === component.component);
      evidence.set(id, findings);
      nodes.push({ id, position: { x: 0, y: index * 120 }, data: { label: `${component.component} · ${component.files.length} files` },
        style: { width: 190, background: "var(--color-elevated)", color: "var(--color-fg)", border: "1px solid var(--color-border-strong)", borderRadius: 8 } });
    });
    const rows = Math.ceil(mechanismNames.length / 2);
    mechanismNames.forEach((name, index) => {
      const id = `mechanism:${name}`;
      const findings = scan.findings.filter((item) => mechanismName(item) === name);
      evidence.set(id, findings);
      nodes.push({ id, position: { x: 330 + Math.floor(index / rows) * 280, y: (index % rows) * 88 }, data: { label: `${name} · ${findings.length}` },
        style: { width: 205, background: "var(--color-elevated)", color: "var(--color-fg)",
          border: `1px solid ${findings.some((f) => f.confidence === "confirmed") ? "var(--color-ok)" : "var(--color-warn)"}`, borderRadius: 8 } });
    });
    for (const component of scan.inventory) {
      for (const name of new Set(scan.findings.filter((item) => item.component === component.component).map(mechanismName))) {
        const matches = scan.findings.filter((item) => item.component === component.component && mechanismName(item) === name);
        edges.push({ id: `${component.component}:${name}`, source: `component:${component.component}`, target: `mechanism:${name}`,
          type: "smoothstep", animated: false,
          style: { stroke: matches.some((f) => f.confidence === "confirmed") ? "var(--color-ok)" : "var(--color-warn)",
            strokeDasharray: matches.every((f) => f.confidence === "uncertain") ? "5 4" : undefined } });
      }
    }
    return { nodes, edges, evidence };
  }, [scan]);
  const current = selected ? evidence.get(selected) ?? [] : [];

  return <section className="lattice-card">
    <h2 className="lattice-section-title">Dependency map</h2>
    <p className="mt-1 text-xs text-muted">Edges reflect observed findings. Dashed amber edges are uncertain references, not proven runtime dependencies. Select a node for file and line evidence.</p>
    {nodes.length ? <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="h-144 overflow-hidden rounded-lg border border-border bg-bg" aria-label="Interactive component to crypto mechanism graph">
        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false} nodesConnectable={false} onNodeClick={(_, node) => setSelected(node.id)}
          colorMode="dark" proOptions={{ hideAttribution: true }}>
          <Background color="var(--color-border)" gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <aside className="max-h-144 overflow-auto rounded-lg bg-elevated p-4">
        <h3 className="text-sm font-medium">{selected ? selected.split(":").slice(1).join(":") : "Select a node"}</h3>
        <p className="mt-1 text-xs text-muted">{selected ? `${current.length} linked findings` : "Evidence appears here."}</p>
        <ul className="mt-3 space-y-3">
          {current.map((finding) => <li key={finding.id} className="border-t border-border pt-3 text-xs">
            <div className="flex items-center gap-2"><ConfidenceMark confidence={finding.confidence} compact /><span>{finding.mechanism}</span></div>
            <p className="mt-1 break-all font-mono text-subtle">{finding.path}:{finding.line}</p>
          </li>)}
        </ul>
      </aside>
    </div> : <p className="mt-4 text-sm text-muted">No matched mechanisms to map.</p>}
  </section>;
}
