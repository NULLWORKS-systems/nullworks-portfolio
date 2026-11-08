import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.DOGFOOD_BASE_URL || "http://127.0.0.1:3100";
const browser = await chromium.launch({ headless: true });
const failures = [];
await mkdir("dogfood-artifacts", { recursive: true });
async function scenario(name, run) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  try {
    await run(page);
    assert.deepEqual(errors, [], "Browser runtime exceptions");
    console.log("PASS", name);
  } catch (error) {
    const filename = "dogfood-artifacts/" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".png";
    await page.screenshot({ path: filename, fullPage: true }).catch(() => {});
    failures.push({ name, error: String(error), screenshot: filename, browserErrors: errors });
    console.error("FAIL", name, error);
  } finally { await context.close(); }
}
await scenario("Triage: progression requires an explicit answer", async page => {
  const response = await page.goto(base + "/triage");
  assert.equal(response.status(), 200);
  const next = page.getByRole("button", { name: "Continue" });
  assert.equal(await next.isDisabled(), true, "Continue must be disabled before an answer");
  await page.locator("button.choice").first().click();
  assert.equal(await next.isEnabled(), true, "Continue must enable after an answer");
  await next.click();
  await page.getByText("2 of 12").waitFor();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByText("1 of 12").waitFor();
  assert.equal(await page.locator("button.choice.selected").count(), 1, "Back must preserve selection");
});
await scenario("Triage: zero-risk completion, receipt, and reset", async page => {
  const response = await page.goto(base + "/triage");
  assert.equal(response.status(), 200);
  for (let i = 0; i < 12; i++) {
    await page.locator("button.choice").first().click();
    await page.getByRole("button", { name: i === 11 ? "See triage result" : "Continue" }).click();
  }
  await page.getByText("GREEN triage result").waitFor();
  assert.match(await page.locator("article.result .score").innerText(), /0\s*\/\s*36/);
  assert.match(await page.locator("article.result pre").innerText(), /GREEN/);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt" }).click();
  assert.match((await download).suggestedFilename(), /NULLWORKS-Triage-GREEN\.txt/);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByText("1 of 12").waitFor();
});
await scenario("Triage: critical override and persisted draft", async page => {
  await page.goto(base + "/triage");
  await page.locator("button.choice").first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.reload();
  await page.getByText("2 of 12").waitFor();
  // Force a high-risk complete questionnaire to exercise critical result.
  for (let i = 1; i < 12; i++) {
    await page.locator("button.choice").last().click();
    await page.getByRole("button", { name: i === 11 ? "See triage result" : "Continue" }).click();
  }
  await page.getByText("CRITICAL triage result").waitFor();
});
await scenario("Fitness: unknown coverage remains unscored", async page => {
  const response = await page.goto(base + "/fitness");
  assert.equal(response.status(), 200);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "View my snapshot" }).click();
  await page.getByText("Insufficient information for an overall indicator").waitFor();
});
await scenario("Fitness: completed answers produce scored snapshot", async page => {
  await page.goto(base + "/fitness");
  for (let step = 0; step < 3; step++) {
    const fields = page.locator("fieldset");
    for (let i = 0; i < await fields.count(); i++) {
      const radio = fields.nth(i).locator('input[type="radio"]').first();
      if (await radio.count()) await radio.check();
    }
    await page.getByRole("button", { name: step === 2 ? "View my snapshot" : "Next", exact: true }).click();
  }
  await page.getByText("YOUR PRELIMINARY SNAPSHOT").waitFor();
  assert.match(await page.locator("main").innerText(), /\d+ \/ 100/);
});
await browser.close();
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exitCode = 1; }
else console.log("DOGFOOD browser suite: 5 scenarios passed");
