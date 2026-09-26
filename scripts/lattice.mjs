#!/usr/bin/env node
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { scanEstate } from "../src/lib/scanner/engine.ts";

function fail(code, message, suggestion, exitCode = 2) {
  process.stderr.write(`${JSON.stringify({ error: true, code, message, suggestion })}\n`);
  process.exitCode = exitCode;
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  process.stdout.write(`${JSON.stringify({
    command: "lattice scan <target-folder>",
    description: "Scan source, configs, direct dependencies, and PEM certificates; write ScanResult JSON to stdout.",
    paths: "Finding paths are relative to the target folder.",
  })}\n`);
} else if (args.length !== 2 || args[0] !== "scan" || !args[1] || args[1].startsWith("-")) {
  fail("USAGE", "Expected: lattice scan <target-folder>", "Pass one existing directory to scan.");
} else {
  try {
    const target = realpathSync(resolve(args[1]));
    if (!statSync(target).isDirectory()) {
      fail("TARGET_NOT_DIRECTORY", "Target is not a directory.", "Pass a directory path.");
    } else {
      const result = scanEstate(target, "");
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  } catch (error) {
    const missing = error && typeof error === "object" && "code" in error && error.code === "ENOENT";
    fail(missing ? "TARGET_NOT_FOUND" : "SCAN_FAILED",
      error instanceof Error ? error.message : "Scan failed.",
      missing ? "Pass an existing directory." : "Check target readability and manifest or certificate validity.",
      missing ? 2 : 1);
  }
}
