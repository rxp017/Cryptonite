#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

export function findingKey(finding) {
  return [finding.path, finding.usage, finding.algorithm, finding.snippet?.trim()].join("\u0000");
}

export function compareScans(current, baseline) {
  const old = new Set((baseline?.findings || []).map(findingKey));
  const introduced = current.findings.filter((finding) => !old.has(findingKey(finding)));
  const relevant = introduced.filter((finding) => ["library", "config", "protocol", "tls"].includes(finding.usage));
  const blocked = relevant.some((finding) => ["config", "protocol", "tls"].includes(finding.usage) &&
    ["critical", "high"].includes(finding.severity));
  return { introduced, relevant, blocked };
}

export function renderDiff(diff, hasBaseline) {
  const lines = ["## Lattice crypto scan difference", "",
    hasBaseline ? `New or changed findings: **${diff.introduced.length}**.` : "No previous commit was available for comparison.",
    "", "A finding is `confirmed` only for a direct algorithm call or parsed certificate field. Config and dependency hints remain `uncertain`.", ""];
  if (hasBaseline && diff.introduced.length === 0) lines.push("No new or changed crypto findings.", "");
  for (const finding of diff.introduced.slice(0, 30)) {
    const path = String(finding.path).replace(/[\r\n|]/g, " ");
    const mechanism = String(finding.mechanism).replace(/[\r\n|]/g, " ");
    lines.push(`- **${finding.confidence} / ${finding.severity}** ${mechanism} — \`${path}:${finding.line}\``);
  }
  if (diff.introduced.length > 30) lines.push(`- ${diff.introduced.length - 30} more findings omitted from this comment.`);
  lines.push("", diff.blocked
    ? "**Gate:** new high-severity configuration or protocol references need review. Their active use is not proven."
    : "**Gate:** no new high-severity configuration or protocol reference was found.",
    "", "This scan does not prove the system is quantum-safe.", "");
  return lines.join("\n");
}

function readJson(filePath) {
  const buf = readFileSync(filePath);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return JSON.parse(buf.toString("utf16le").replace(/^\uFEFF/, ""));
  }
  return JSON.parse(buf.toString("utf8").replace(/^\uFEFF/, ""));
}

if (process.argv[1] && process.argv[1].replaceAll("\\", "/").endsWith("/scan-diff.mjs")) {
  const currentPath = process.argv[2];
  const baselinePath = process.argv[3];
  if (!currentPath || !existsSync(currentPath)) throw new Error("Current scan JSON is required.");
  const current = readJson(currentPath);
  const hasBaseline = Boolean(baselinePath && existsSync(baselinePath));
  const baseline = hasBaseline ? readJson(baselinePath) : null;
  const diff = hasBaseline ? compareScans(current, baseline) : { introduced: [], relevant: [], blocked: false };
  const markdown = renderDiff(diff, hasBaseline);
  writeFileSync("scan-diff.md", markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,
    `changes=${hasBaseline ? diff.introduced.length : 0}\nblocked=${diff.blocked}\n`);
  for (const finding of diff.relevant) {
    const path = String(finding.path).replace(/[\r\n]/g, " ");
    const message = String(finding.mechanism).replace(/[\r\n]/g, " ");
    console.log(`::warning file=${path},line=${finding.line}::New ${finding.confidence} crypto reference: ${message}`);
  }
  console.log(JSON.stringify({ baseline: hasBaseline, newFindings: diff.introduced.length,
    newDependencyOrConfigReferences: diff.relevant.length, blocked: diff.blocked }));
}
