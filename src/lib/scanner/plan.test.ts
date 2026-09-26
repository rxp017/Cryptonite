import assert from "node:assert/strict";
import test from "node:test";
import { scanEstate } from "./engine.ts";
import { buildChecklist, buildGraph, isInternetFacingPath } from "./plan.ts";
import { buildReportModel, renderMarkdownReport } from "./report.ts";

test("migration checklist and graph contain exactly the live scan findings", () => {
  const scan = scanEstate();
  const checklist = buildChecklist(scan);
  const graph = buildGraph(scan);
  assert.deepEqual(new Set(checklist.map((item) => item.finding.id)), new Set(scan.findings.map((finding) => finding.id)));
  assert.deepEqual(graph.nodes.map((node) => node.id), checklist.map((item) => item.finding.id));
  assert.equal(graph.edges.length, Math.max(0, scan.findings.length - 1));
  assert.deepEqual(buildGraph({ ...scan, findings: [] }), { nodes: [], edges: [] });
});

test("asymmetric findings precede symmetric ones and certificates follow expiry order", () => {
  const checklist = buildChecklist(scanEstate());
  const firstSymmetric = checklist.findIndex(({ finding }) =>
    finding.usage === "encryption" || finding.usage === "hash");
  assert.ok(firstSymmetric >= 0);
  assert.ok(checklist.filter(({ finding }) => finding.usage === "certificate" ||
    finding.usage === "key-generation").every(({ priority }) => priority - 1 < firstSymmetric));
  const expiries = checklist.filter(({ finding }) => finding.usage === "certificate")
    .map(({ finding }) => Date.parse(finding.expiresAt ?? ""));
  assert.ok(expiries.length >= 2);
  assert.deepEqual(expiries, [...expiries].sort((a, b) => a - b));
});

test("internet-facing path classification distinguishes API routes from internal code", () => {
  assert.equal(isInternetFacingPath("src/routes/api/scan.ts"), true);
  assert.equal(isInternetFacingPath("config/server.conf"), true);
  assert.equal(isInternetFacingPath("src/internal/crypto.ts"), false);
  assert.equal(isInternetFacingPath("tests/crypto.test.ts"), false);
});

test("report Markdown mirrors live evidence groups and carries the disclaimer", () => {
  const scan = scanEstate();
  const report = buildReportModel(scan);
  const markdown = renderMarkdownReport(report);
  assert.equal(report.confirmed.length + report.uncertain.length, scan.findings.length);
  assert.ok(markdown.includes("## Confirmed findings"));
  assert.ok(markdown.includes("## Uncertain findings — verify usage"));
  assert.ok(markdown.includes("## Limitations"));
  assert.ok(markdown.includes(report.disclaimer));
  for (const finding of scan.findings) assert.ok(markdown.includes(`${finding.path}:${finding.line}`));
});
