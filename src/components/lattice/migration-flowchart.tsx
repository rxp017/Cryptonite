import { useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildChecklist } from "@/lib/scanner/plan";
import type { ChecklistItem, Finding, ScanResult } from "@/lib/scanner/types";
import { ConfidenceMark } from "./confidence-mark";

type Stage = { id: string; title: string; gate: string; items: ChecklistItem[] };
function stageOf(finding: Finding): string {
  if (finding.usage === "certificate") return "certificates";
  if (finding.usage === "key-generation" || finding.usage === "key-exchange" || /\b(?:RSA|ECDSA|ECDH|DSA|ML-KEM|ML-DSA)\b/i.test(finding.algorithm)) return "asymmetric";
  if (finding.usage === "encryption" || finding.usage === "hash" || /\b(?:AES|DES|MD5|SHA|HMAC)\b/i.test(finding.algorithm)) return "symmetric";
  return "review";
}
const definitions = [
  { id: "certificates", title: "Rotate certificates", gate: "Validate chain, expiry, and client trust" },
  { id: "asymmetric", title: "Migrate asymmetric use", gate: "Test peer and protocol compatibility" },
  { id: "symmetric", title: "Review symmetric use", gate: "Test ciphertext and key rotation" },
  { id: "review", title: "Verify remaining references", gate: "Confirm active use before changing" },
];

export function MigrationFlowchart({ scan }: { scan: ScanResult }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { stages, nodes, edges } = useMemo(() => {
    const checklist = buildChecklist(scan);
    const stages: Stage[] = definitions.map((definition) => ({ ...definition,
      items: checklist.filter(({ finding }) => stageOf(finding) === definition.id),
    })).filter((stage) => stage.items.length);
    const nodes: Node[] = [], edges: Edge[] = [];
    stages.forEach((stage, index) => {
      const y = index * 150;
      nodes.push({ id: stage.id, position: { x: 0, y }, data: { label: `${stage.title} · ${stage.items.length} findings` },
        style: { width: 240, background: "var(--color-elevated)", color: "var(--color-fg)",
          border: "1px solid var(--color-accent)", borderRadius: 8 } });
      nodes.push({ id: `gate:${stage.id}`, position: { x: 320, y }, data: { label: `Gate: ${stage.gate}` },
        style: { width: 260, background: "var(--color-surface)", color: "var(--color-muted)",
          border: "1px dashed var(--color-warn)", borderRadius: 8 } });
      edges.push({ id: `${stage.id}:gate`, source: stage.id, target: `gate:${stage.id}`, type: "smoothstep",
        style: { stroke: "var(--color-accent)" } });
      if (index < stages.length - 1) edges.push({ id: `${stage.id}:next`, source: `gate:${stage.id}`, target: stages[index + 1].id,
        type: "smoothstep", style: { stroke: "var(--color-muted)" } });
    });
    return { stages, nodes, edges };
  }, [scan]);
  const current = stages.find((stage) => stage.id === selected || `gate:${stage.id}` === selected);

  return <section className="lattice-card">
    <h2 className="lattice-section-title">Migration flowchart</h2>
    <p className="mt-1 text-xs text-muted">Stages follow the scanner’s priority rule. Arrows are suggested review sequence, not proven software dependencies. Select a stage for numbered findings.</p>
    {stages.length ? <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="h-[26rem] overflow-hidden rounded-lg border border-border bg-bg" aria-label="Interactive migration stages and validation gates">
        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.15 }} nodesDraggable={false} nodesConnectable={false}
          onNodeClick={(_, node) => setSelected(node.id)} colorMode="dark" proOptions={{ hideAttribution: true }}>
          <Background color="var(--color-border)" gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <aside className="max-h-[26rem] overflow-auto rounded-lg bg-elevated p-4">
        <h3 className="text-sm font-medium">{current?.title ?? "Select a stage"}</h3>
        <p className="mt-1 text-xs text-muted">{current?.gate ?? "Each gate requires validation before moving forward."}</p>
        <ol className="mt-3 space-y-3">
          {current?.items.map(({ priority, finding }) => <li key={finding.id} className="border-t border-border pt-3 text-xs">
            <div className="flex items-center gap-2"><span className="font-mono">#{priority}</span><ConfidenceMark confidence={finding.confidence} compact /></div>
            <p className="mt-1">{finding.mechanism}</p>
            <p className="mt-1 break-all font-mono text-subtle">{finding.path}:{finding.line}</p>
          </li>)}
        </ol>
      </aside>
    </div> : <p className="mt-4 text-sm text-muted">No findings to schedule.</p>}
  </section>;
}
