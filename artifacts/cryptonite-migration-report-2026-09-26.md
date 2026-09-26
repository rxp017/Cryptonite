# Crypto migration report

Estate: Seeded Crypto Estate
Generated: 2026-09-26 | Files: 11 | Findings: 15

## Confirmed findings

- **Certificate: sha1WithRSAEncryption, 1024-bit key** (confirmed, critical) — demo/seeded-estate/certs/legacy-rsa1024-sha1.pem:1. The parsed certificate uses a weak signature or undersized key.
- **Certificate: sha256WithRSAEncryption, 2048-bit key** (confirmed, high) — demo/seeded-estate/certs/modern-rsa2048-sha256.pem:1. This RSA certificate needs quantum migration planning.
- **RSA key generation** (confirmed, high) — demo/seeded-estate/src/legacy/rsa.ts:4. RSA is vulnerable to a cryptographically relevant quantum computer.
- **MD5 hash** (confirmed, high) — demo/seeded-estate/src/legacy/hash.ts:4. MD5 is collision-broken.
- **AES-CBC cipher instantiation** (confirmed, medium) — demo/seeded-estate/src/legacy/cipher.py:10. CBC needs separate authentication; this fixture also uses a fixed IV.

## Uncertain findings — verify usage

- **Key material embedded in source** (uncertain, high) — demo/seeded-estate/src/legacy/cipher.py:5. A literal key appears in source.
- **TLS certificate verification disabled** (uncertain, high) — demo/seeded-estate/src/legacy/network.py:5. The client configuration appears to skip certificate verification.
- **1024-bit key setting** (uncertain, high) — demo/seeded-estate/src/legacy/rsa.ts:5. The source configures a 1024-bit key; verify its use.
- **node-forge direct dependency** (uncertain, low) — demo/seeded-estate/package.json:9. Cryptography and PKI APIs; inspect caller algorithms.
- **selfsigned direct dependency** (uncertain, low) — demo/seeded-estate/package.json:10. Certificate generator; inspect generated certificate fields.
- **bcrypt direct dependency** (uncertain, low) — demo/seeded-estate/requirements.txt:1. Password hashing package; inventory only.
- **pycryptodome direct dependency** (uncertain, low) — demo/seeded-estate/requirements.txt:3. Cipher APIs; inspect the selected algorithm and mode.
- **Cryptography library import** (uncertain, low) — demo/seeded-estate/src/legacy/cipher.py:1. An import does not establish which algorithm is used.
- **Cryptography library import** (uncertain, low) — demo/seeded-estate/src/legacy/cipher.py:2. An import does not establish which algorithm is used.
- **Cryptography library import** (uncertain, low) — demo/seeded-estate/tools/generate-certs.mjs:4. An import does not establish which algorithm is used.

## Confirmed migration actions

1. Replace this certificate and key promptly. — demo/seeded-estate/certs/legacy-rsa1024-sha1.pem:1 (confirmed; Certificate: sha1WithRSAEncryption, 1024-bit key).
2. Plan certificate rotation and client compatibility testing. — demo/seeded-estate/certs/modern-rsa2048-sha256.pem:1 (confirmed; Certificate: sha256WithRSAEncryption, 2048-bit key).
3. Inventory consumers before planning a post-quantum replacement. — demo/seeded-estate/src/legacy/rsa.ts:4 (confirmed; RSA key generation).
4. Replace cryptographic MD5 use with SHA-256 or SHA-3. — demo/seeded-estate/src/legacy/hash.ts:4 (confirmed; MD5 hash).
5. Use authenticated encryption such as AES-256-GCM and rotate the key. — demo/seeded-estate/src/legacy/cipher.py:10 (confirmed; AES-CBC cipher instantiation).

## Uncertain migration actions — verify first

6. Rotate this key and load replacement material from a protected store. — demo/seeded-estate/src/legacy/cipher.py:5 (uncertain; Key material embedded in source).
7. Enable verification and configure the intended trust store. — demo/seeded-estate/src/legacy/network.py:5 (uncertain; TLS certificate verification disabled).
8. Replace undersized asymmetric keys. — demo/seeded-estate/src/legacy/rsa.ts:5 (uncertain; 1024-bit key setting).
9. Inspect actual call sites before inferring an algorithm. — demo/seeded-estate/package.json:9 (uncertain; node-forge direct dependency).
10. Inspect actual call sites before inferring an algorithm. — demo/seeded-estate/package.json:10 (uncertain; selfsigned direct dependency).
11. Inspect actual call sites before inferring an algorithm. — demo/seeded-estate/requirements.txt:1 (uncertain; bcrypt direct dependency).
12. Inspect actual call sites before inferring an algorithm. — demo/seeded-estate/requirements.txt:3 (uncertain; pycryptodome direct dependency).
13. Inspect actual calls before assigning migration work. — demo/seeded-estate/src/legacy/cipher.py:1 (uncertain; Cryptography library import).
14. Inspect actual calls before assigning migration work. — demo/seeded-estate/src/legacy/cipher.py:2 (uncertain; Cryptography library import).
15. Inspect actual calls before assigning migration work. — demo/seeded-estate/tools/generate-certs.mjs:4 (uncertain; Cryptography library import).

## Compatibility risks to test

- If the listed certificates are deployed, test replacement chains and client trust before rotation.
- If generated keys or signatures cross system boundaries, test formats and verification with consumers before cutover.
- If ciphertext is stored or exchanged, test that existing data remains readable during an encryption change.

## Testing steps

1. After each change, re-run the scanner and compare the file and line evidence with this report.
2. Inspect every uncertain call site or configuration before treating it as active algorithm use.
3. Parse replacement certificates and check their signature OID, key size, and expiry; test client trust separately.
4. Run application and interoperability tests for the changed crypto paths; this static scan cannot validate runtime behavior.

## Limitations

- This is a static inventory of source patterns, direct manifest dependencies, and parsed PEM certificate fields. Absence of a finding is not evidence of absence.
- A dependency or wrapper finding identifies a possible capability, not actual algorithm use. Transitive dependencies and general call graphs are not inspected.
- Runtime paths, HSMs, sidecars, firmware, CDN TLS, managed services, certificate trust chains, and revocation are outside this scan.
- Source evidence does not prove that the matching path runs in production.

**This report does not prove the system is quantum-safe, PQC-ready, or FIPS-validated.**
