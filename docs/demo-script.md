# Lattice judge walkthrough

## Opening statement

“Lattice is a static crypto inventory and migration planning demo. The app scans a seeded estate bundled at build time; the CLI can scan another local folder. Findings have file and line evidence. `confirmed` means the scanner matched a direct algorithm call or parsed a certificate field. It does **not** mean the code runs in production. Dependency, wrapper, and protocol hints remain `uncertain`. This report does not prove the system is quantum-safe, PQC-ready, or FIPS-validated.”

## Walkthrough (about five minutes)

1. **Overview — real scan.** Show the file, finding, and confidence counts. Open the scanned-file list: it comes from files bundled from `demo/seeded-estate/`. The weak source files, modern negative controls, manifests, and two PEM certificates are real files. Rebuild to include estate changes in a deployed app. You can paste a source snippet; the server scans it in memory as `pasted-input` alongside the estate. Reset or reload clears it. The browser cannot select an arbitrary local folder; use the CLI for that.
2. **Findings — real evidence.** Open an MD5 call and a certificate finding. Show their source path, line, evidence text, concern, and confidence. The certificate signature OID, RSA key length, and expiry come from parsing the PEM with `node-forge`. Show an `uncertain` dependency or configuration finding beside them. `confirmed` identifies the evidence type, not a proven deployment risk.
3. **Inventory — limited but real.** Direct entries are read from `package.json` and `requirements.txt` and checked against a short fixed package table. The table records crypto capability hints; it does not establish a package’s actual algorithm use. No transitive dependency graph or general wrapper tracing is performed. Component names are path-based labels for the demo estate.
4. **Migration — real, heuristic ordering.** The checklist and graph are rebuilt from the current findings. Confirmed and uncertain work are separate. The sort puts asymmetric items first, certificates by nearest expiry, and paths resembling public server/API routes before internal paths. Graph links show proposed review order, **not** runtime dependencies or a validated deployment sequence.
5. **Sandbox — real crypto operations.** Click **Run provider** in each mode. Classical executes browser Web Crypto ECDH P-256, ECDSA P-256, and AES-GCM. Post-Quantum executes `ml_kem768` and `ml_dsa65` from installed `@noble/post-quantum`, plus Web Crypto AES-GCM. Hybrid executes that library’s `ml_kem768_x25519` X-Wing key establishment, with separate ECDSA and ML-DSA signature checks. Each run tests matching keys, encryption/decryption, and signature verification. The panel shows algorithm names, byte sizes, and pass/fail; it does not reveal the shared secret. This is a sandbox demo, not interoperability, deployment, certification, or a composite-signature implementation. These are JavaScript library names, not .NET `MLDsa` or `CompositeMLDsa` types.
6. **CLI / CI status — real CLI, no PR automation.** The displayed `npm run --silent scan -- demo/seeded-estate` command writes JSON from the same scanner engine. The high-risk rows shown in the tab are from the current in-app scan. They are **not** CLI process output, PR diff results, or a GitHub check. There is no GitHub Actions workflow or automated PR comment yet; the repository has no configured remote at this audit.
7. **Report — real Markdown export.** The on-screen findings, actions, risks, testing steps, limitations, and disclaimer come from the current scan. **Download report** creates a Markdown blob from that same report model. The report explicitly says it does not prove quantum safety. PDF export is not implemented.

## Answer likely judge questions plainly

- **Does this discover every crypto use?** No. It uses a small set of source patterns, direct manifest entries, and PEM certificate parsing. It does not analyze every language, AST, runtime path, transitive package, HSM, managed service, trust chain, or call graph. Files over 1 MiB and unsupported extensions are skipped.
- **Are these systems quantum-safe?** Unknown. The scanner cannot establish that, and a passing sandbox run cannot establish it.
- **Is X-Wing interoperable with our services?** Untested. The sandbox uses the installed library implementation; peers still need compatible wire formats and integration tests.
- **Is there an active GitHub PR gate?** No. Only the local JSON CLI is implemented.
- **Is the package table evidence of a weak algorithm?** No. Its findings are always `uncertain` until an actual call or certificate field is inspected.
- **Is the hosted Vercel deployment verified?** No. The Vercel CLI was unavailable for a `vercel build` check. The local Vite/Nitro build embeds all 11 estate files in a server bundle, and its preview scanned them without depending on the project working directory. A hosted Vercel run remains untested.

## Pre-presentation check

Run the local tests, typecheck, build, and scanner CLI. Open every tab, run all three sandbox modes, and check the current estate counts before stating a number aloud. Do not describe the CI status tab as an active gate.
