import type { ChecklistItem, Finding, GraphEdge, GraphNode, ScanResult, Severity } from "./types";

const ASYMMETRIC = /\b(?:RSA|ECDSA|ECDH|DSA|ML-KEM|ML-DSA|X25519|X448|Ed25519)\b/i;
const SYMMETRIC = /\b(?:AES|DES|3DES|RC4|ChaCha|MD5|SHA|HMAC)\b/i;
const INTERNET_FACING = /(?:^|\/)(?:server|api|routes?|edge|gateway|ingress|nginx|public)(?:\/|[._-])/i;
const SEVERITY: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function isInternetFacingPath(path: string): boolean {
  return INTERNET_FACING.test(path);
}

function algorithmPriority(finding: Finding): number {
  if (finding.usage === "certificate" || finding.usage === "key-generation" ||
      finding.usage === "key-exchange" || ASYMMETRIC.test(finding.algorithm)) return 0;
  if (finding.usage === "encryption" || finding.usage === "hash" ||
      SYMMETRIC.test(finding.algorithm)) return 1;
  return 2;
}

function expiry(finding: Finding): number {
  const value = finding.expiresAt ? Date.parse(finding.expiresAt) : Number.NaN;
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
}

export function compareMigrationPriority(a: Finding, b: Finding): number {
  const algorithmDifference = algorithmPriority(a) - algorithmPriority(b);
  if (algorithmDifference) return algorithmDifference;

  const aCertificate = a.usage === "certificate";
  const bCertificate = b.usage === "certificate";
  if (aCertificate && bCertificate) {
    const expiryDifference = expiry(a) - expiry(b);
    if (expiryDifference) return expiryDifference;
  } else if (aCertificate !== bCertificate) {
    return aCertificate ? -1 : 1;
  }

  const facingDifference = Number(isInternetFacingPath(b.path)) - Number(isInternetFacingPath(a.path));
  if (facingDifference) return facingDifference;

  return SEVERITY[a.severity] - SEVERITY[b.severity] ||
    a.path.localeCompare(b.path) || a.line - b.line || a.id.localeCompare(b.id);
}

export function buildChecklist(scan: ScanResult): ChecklistItem[] {
  return [...scan.findings].sort(compareMigrationPriority).map((finding, index) => ({
    priority: index + 1,
    finding,
  }));
}

export function buildGraph(scan: ScanResult): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = buildChecklist(scan).map(({ priority, finding }) => ({
    id: finding.id,
    label: finding.mechanism,
    order: priority,
    path: finding.path,
    line: finding.line,
    confidence: finding.confidence,
  }));
  const edges = nodes.slice(1).map((node, index) => ({ from: nodes[index].id, to: node.id }));
  return { nodes, edges };
}
