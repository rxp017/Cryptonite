import { ESTATE_NAME } from "./samples.ts";
import { buildChecklist } from "./plan.ts";
import type { ChecklistItem, Finding, ScanResult } from "./types.ts";

export const QUANTUM_SAFETY_DISCLAIMER =
  "This report does not prove the system is quantum-safe, PQC-ready, or FIPS-validated.";

export const REPORT_LIMITATIONS = [
  "This is a static inventory of source patterns, direct manifest dependencies, and parsed PEM-formatted certificate fields (.pem or .crt). Absence of a finding is not evidence of absence.",
  "A dependency or wrapper finding identifies a possible capability, not actual algorithm use. Transitive dependencies and general call graphs are not inspected.",
  "Runtime paths, HSMs, sidecars, firmware, CDN TLS, managed services, certificate trust chains, and revocation are outside this scan.",
  "Source evidence does not prove that the matching path runs in production.",
];

export type ReportModel = {
  title: string;
  estateName: string;
  generatedAt: string;
  fileCount: number;
  findingCount: number;
  confirmed: Finding[];
  uncertain: Finding[];
  confirmedWork: ChecklistItem[];
  uncertainWork: ChecklistItem[];
  compatibilityRisks: string[];
  testingSteps: string[];
  limitations: readonly string[];
  disclaimer: string;
};

export function buildReportModel(scan: ScanResult, estateName = ESTATE_NAME): ReportModel {
  const work = buildChecklist(scan);
  const confirmedWork = work.filter((item) => item.finding.confidence === "confirmed");
  const uncertainWork = work.filter((item) => item.finding.confidence === "uncertain");
  const compatibilityRisks: string[] = [];
  if (scan.findings.some((finding) => finding.usage === "certificate")) {
    compatibilityRisks.push("If the listed certificates are deployed, test replacement chains and client trust before rotation.");
  }
  if (scan.findings.some((finding) => finding.usage === "key-generation" || finding.usage === "signature")) {
    compatibilityRisks.push("If generated keys or signatures cross system boundaries, test formats and verification with consumers before cutover.");
  }
  if (scan.findings.some((finding) => finding.usage === "encryption")) {
    compatibilityRisks.push("If ciphertext is stored or exchanged, test that existing data remains readable during an encryption change.");
  }
  if (scan.findings.some((finding) => finding.usage === "protocol" || finding.usage === "tls")) {
    compatibilityRisks.push("If protocol settings are active, test client connections before disabling legacy options.");
  }
  if (compatibilityRisks.length === 0) compatibilityRisks.push("No specific compatibility risk was inferred from this scan; review deployments manually.");

  const testingSteps = [
    "After each change, re-run the scanner and compare the file and line evidence with this report.",
    ...(uncertainWork.length ? ["Inspect every uncertain call site or configuration before treating it as active algorithm use."] : []),
    ...(scan.findings.some((finding) => finding.usage === "certificate")
      ? ["Parse replacement certificates and check their signature OID, key size, and expiry; test client trust separately."] : []),
    "Run application and interoperability tests for the changed crypto paths; this static scan cannot validate runtime behavior.",
  ];

  return {
    title: "Crypto migration report", estateName,
    generatedAt: scan.scannedAt, fileCount: scan.files, findingCount: scan.findings.length,
    confirmed: confirmedWork.map((item) => item.finding),
    uncertain: uncertainWork.map((item) => item.finding),
    confirmedWork, uncertainWork, compatibilityRisks, testingSteps,
    limitations: REPORT_LIMITATIONS, disclaimer: QUANTUM_SAFETY_DISCLAIMER,
  };
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}<>#|]/g, "\\$&")
    .replaceAll("[", "\\[").replaceAll("]", "\\]").replace(/\r?\n/g, " ");
}

function findingLines(findings: Finding[]): string[] {
  return findings.length ? findings.map((finding) =>
    `- **${escapeMarkdown(finding.mechanism)}** (${finding.confidence}, ${finding.severity}) — ${escapeMarkdown(finding.path)}:${finding.line}. ${escapeMarkdown(finding.concern)}`)
    : ["- None in this scan."];
}

function workLines(items: ChecklistItem[]): string[] {
  return items.length ? items.map(({ priority, finding }) =>
    `${priority}. ${escapeMarkdown(finding.recommendation)} — ${escapeMarkdown(finding.path)}:${finding.line} (${finding.confidence}; ${escapeMarkdown(finding.mechanism)}).`)
    : ["- None in this scan."];
}

export function renderMarkdownReport(report: ReportModel): string {
  const date = report.generatedAt ? report.generatedAt.slice(0, 10) : "Scan pending";
  return [
    `# ${report.title}`,
    "",
    `Estate: ${escapeMarkdown(report.estateName)}`,
    `Generated: ${date} | Files: ${report.fileCount} | Findings: ${report.findingCount}`,
    "",
    "## Confirmed findings", "", ...findingLines(report.confirmed), "",
    "## Uncertain findings — verify usage", "", ...findingLines(report.uncertain), "",
    "## Confirmed migration actions", "", ...workLines(report.confirmedWork), "",
    "## Uncertain migration actions — verify first", "", ...workLines(report.uncertainWork), "",
    "## Compatibility risks to test", "", ...report.compatibilityRisks.map((risk) => `- ${escapeMarkdown(risk)}`), "",
    "## Testing steps", "", ...report.testingSteps.map((step, index) => `${index + 1}. ${escapeMarkdown(step)}`), "",
    "## Limitations", "", ...report.limitations.map((limit) => `- ${escapeMarkdown(limit)}`), "",
    `**${report.disclaimer}**`, "",
  ].join("\n");
}

export function reportFileName(report: ReportModel): string {
  return `cryptonite-migration-report-${report.generatedAt.slice(0, 10)}.md`;
}
