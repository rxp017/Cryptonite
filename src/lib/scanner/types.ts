export type Confidence = "confirmed" | "uncertain";
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Usage =
  | "key-generation"
  | "key-exchange"
  | "signature"
  | "encryption"
  | "hash"
  | "tls"
  | "certificate"
  | "library"
  | "protocol"
  | "wrapper"
  | "config";

export type Finding = {
  id: string;
  path: string;
  line: number;
  snippet: string;
  mechanism: string;
  algorithm: string;
  keySize?: number;
  signatureOid?: string;
  expiresAt?: string;
  usage: Usage;
  confidence: Confidence;
  severity: Severity;
  concern: string;
  recommendation: string;
  component: string;
  evidence: string;
  hidden?: boolean;
};

export type SampleFile = {
  path: string;
  language: string;
  component: string;
  content: string;
};

export type PackageDep = {
  name: string;
  version: string;
  ecosystem: "pypi" | "npm" | "go" | "other";
  crypto: boolean;
  concern?: string;
};

export type ComponentInventory = {
  component: string;
  files: string[];
  mechanisms: string[];
  packages: PackageDep[];
  findingCount: number;
  highestSeverity: Severity;
};

export type ScanResult = {
  scannedAt: string;
  files: number;
  findings: Finding[];
  inventory: ComponentInventory[];
  packages: PackageDep[];
  stats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    confirmed: number;
    uncertain: number;
    hidden: number;
  };
};

export type ChecklistItem = {
  priority: number;
  finding: Finding;
};

export type GraphNode = {
  id: string;
  label: string;
  order: number;
  path: string;
  line: number;
  confidence: Confidence;
};

export type GraphEdge = {
  from: string;
  to: string;
};
