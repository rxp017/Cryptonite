import assert from "node:assert/strict";
import { test } from "node:test";
import { compareScans, renderDiff } from "./scan-diff.mjs";

const base = { findings: [{ path: "src/config.yaml", line: 2, usage: "protocol", algorithm: "TLS 1.0",
  snippet: "tls: TLSv1", mechanism: "TLS 1.0 reference", confidence: "uncertain", severity: "high" }] };

test("line shifts are not new findings, but changed config evidence is gated", () => {
  const shifted = { findings: [{ ...base.findings[0], line: 8 }] };
  assert.equal(compareScans(shifted, base).introduced.length, 0);
  const changed = { findings: [{ ...base.findings[0], line: 8, snippet: "protocol: TLSv1" }] };
  const result = compareScans(changed, base);
  assert.equal(result.introduced.length, 1);
  assert.equal(result.blocked, true);
  assert.match(renderDiff(result, true), /uncertain \/ high/);
});

test("a new direct package is warned but does not fail the config gate", () => {
  const result = compareScans({ findings: [{ path: "package.json", line: 4, usage: "library",
    algorithm: "Dependency capability", snippet: '"node-forge": "1.4.0"',
    mechanism: "node-forge direct dependency", confidence: "uncertain", severity: "low" }] }, { findings: [] });
  assert.equal(result.relevant.length, 1);
  assert.equal(result.blocked, false);
});
