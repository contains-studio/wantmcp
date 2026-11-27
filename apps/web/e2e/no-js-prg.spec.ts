import { expect, test } from "@playwright/test";
import { freshEmail, MOCK_CODE } from "./helpers";

/** Bug audit, 27 Nov 2026: without JavaScript a change must not be repeated by a reload or by back/forward. */
test.use({ javaScriptEnabled: false });

test("without JavaScript, adding an item then reloading and going back and forward leaves one item", async ({ page }) => {
  await page.goto("/login?next=/app/new");
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("nojs"));
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Code").fill(MOCK_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/new/);
  const form = page.locator("main form");
  await form.getByRole("radio", { name: /^Research/ }).check();
  await form.locator('input[name="title"]').fill("No script");
  await form.getByRole("button", { name: /^Create .* list$/ }).click();
  await expect(page).toHaveURL(/\/l\//);

  const text = `Which kettle boils fastest ${Date.now()}`;
  await page.locator("#new-item").fill(text);
  const res = page.waitForResponse((r) => r.request().method() === "POST");
  await page.locator("#add-item").getByRole("button", { name: /^Add / }).click();
  expect((await res).status()).toBe(303); // post/redirect/get
  const items = page.getByRole("heading", { name: text });
  await expect(items).toHaveCount(1);
  await page.reload();
  await expect(items).toHaveCount(1);
  await page.goBack();
  await page.goForward();
  await page.reload();
  await expect(items).toHaveCount(1);
});

test("without JavaScript, ticking an item off redirects too, and a reload doesn't untick it", async ({ page }) => {
  await page.goto("/login?next=/app/new");
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("nojs-tick"));
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Code").fill(MOCK_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("main form").getByRole("radio", { name: /^Tasks/ }).check();
  await page.locator('main form input[name="title"]').fill("No script ticks");
  await page.locator("main form").getByRole("button", { name: /^Create .* list$/ }).click();
  await page.locator("#new-item").fill("Pack the van");
  await page.locator("#add-item").getByRole("button", { name: /^Add / }).click();
  const box = page.getByRole("checkbox", { name: /Pack the van/ }).first();
  const res = page.waitForResponse((r) => r.request().method() === "POST");
  await box.click();
  expect((await res).status()).toBe(303);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /Mark “Pack the van” not done/ })).toHaveCount(1);
});
