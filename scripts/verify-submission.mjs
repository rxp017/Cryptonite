import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { strToU8, zipSync } from "fflate";

const baseUrl = process.argv[2] || "http://127.0.0.1:8080/";
const screenshots = resolve("screenshots");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath: chrome });
const temporary = mkdtempSync(join(tmpdir(), "lattice-verify-"));
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl);
  await page.getByRole("heading", { name: "Seeded Crypto Estate" }).waitFor();
  await page.getByText("11", { exact: true }).first().waitFor();
  assert.match(await page.locator("main").innerText(), /11[\s\S]*15[\s\S]*5[\s\S]*10/);
  assert.equal(await page.locator(".recharts-wrapper").count(), 3);
  for (const [tab, name, heading] of [["Overview", "overview", "Seeded Crypto Estate"], ["Inventory", "inventory", "Dependency inventory"], ["Migration", "plan", "Migration plan"]]) {
    await page.getByRole("link", { name: tab, exact: true }).click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await page.waitForTimeout(250);
    if (name !== "overview") await page.locator(".react-flow__node").first().waitFor();
    if (name === "inventory") await page.locator(".react-flow__node").filter({ hasText: "MD5" }).click();
    if (name === "plan") await page.locator(".react-flow__node").filter({ hasText: "Rotate certificates" }).click();
    await page.screenshot({ path: join(screenshots, `submission-${name}.png`), fullPage: true });
    await (name === "overview" ? page.locator('[aria-label="Live scan charts"]')
      : page.getByRole("heading", { name: name === "inventory" ? "Dependency map" : "Migration flowchart" })).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(screenshots, `submission-${name}-focus.png`) });
  }
  await page.locator(".react-flow__node").filter({ hasText: "Rotate certificates" }).click();
  assert.match(await page.locator("aside").innerText(), /legacy-rsa1024-sha1\.pem:1/);
  await page.getByRole("link", { name: "Inventory", exact: true }).click();
  await page.locator(".react-flow__node").filter({ hasText: "MD5" }).click();
  assert.match(await page.locator("aside").innerText(), /hash\.ts:4/);

  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByLabel("Upload repository folder").setInputFiles(resolve("demo/seeded-estate"));
  await page.getByRole("heading", { name: "seeded-estate" }).waitFor();
  assert.match(await page.locator("main").innerText(), /Files\s+11\s+Findings\s+15\s+Confirmed\s+5\s+Uncertain\s+10/);

  const zip = zipSync({ "repo/src/hash.ts": strToU8(readFileSync("demo/seeded-estate/src/legacy/hash.ts", "utf8")) });
  const zipPath = join(temporary, "small-repo.zip");
  writeFileSync(zipPath, zip);
  await page.getByLabel("Upload repository ZIP").setInputFiles(zipPath);
  await page.getByRole("heading", { name: "small-repo.zip" }).waitFor();
  assert.match(await page.locator("main").innerText(), /Files\s+1\s+Findings\s+1\s+Confirmed\s+1\s+Uncertain\s+0/);

  await page.getByRole("link", { name: "Report", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"), page.getByRole("link", { name: "Download report" }).click(),
  ]);
  const markdown = readFileSync(await download.path(), "utf8");
  assert.match(markdown, /Estate: small-repo\.zip/);
  assert.match(markdown, /repo\/src\/hash\.ts:4/);
  assert.match(markdown, /does not prove the system is quantum-safe/);
  assert.match(markdown, /## Limitations/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Reset estate" }).click();
  await page.getByRole("heading", { name: "Seeded Crypto Estate" }).waitFor();
  for (const [tab, name, heading] of [["Overview", "overview", "Seeded Crypto Estate"], ["Inventory", "inventory", "Dependency inventory"], ["Migration", "plan", "Migration plan"]]) {
    await page.getByRole("link", { name: tab, exact: true }).click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await page.waitForTimeout(250);
    if (name !== "overview") await page.locator(".react-flow__node").first().waitFor();
    if (name === "inventory") await page.locator(".react-flow__node").filter({ hasText: "MD5" }).click();
    if (name === "plan") await page.locator(".react-flow__node").filter({ hasText: "Rotate certificates" }).click();
    await page.screenshot({ path: join(screenshots, `submission-${name}-mobile.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, baseUrl, folder: "11 files / 15 findings / 5 confirmed / 10 uncertain",
    zip: "1 file / 1 confirmed finding", graphClicks: true, reportDownload: true,
    screenshots: 9, pageErrors: errors }, null, 2));
} finally {
  rmSync(temporary, { recursive: true, force: true });
  await browser.close();
}
