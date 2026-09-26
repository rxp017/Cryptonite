import assert from "node:assert/strict";
import { test } from "node:test";
import { runProvider, type SuiteId } from "./providers.ts";

for (const suite of ["classical", "post-quantum", "hybrid"] as SuiteId[]) {
  test(`${suite} performs real establishment, encryption, and signing without returning secret bytes`, async () => {
    const result = await runProvider(suite, "cryptonite-provider-test");
    assert.equal(result.suite, suite);
    assert.equal(result.decapsulationMatched, true);
    assert.equal(result.encryptionRoundTrip, true);
    assert.equal(result.signatureVerified, true);
    assert.ok(result.sizes.every(({ bytes }) => Number.isInteger(bytes) && bytes > 0));
    assert.ok(!Object.keys(result).some((key) => /secret|preview|signatureBytes/i.test(key)));
    assert.ok(!JSON.stringify(result).includes("cryptonite-provider-test"));
  });
}
