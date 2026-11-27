import { expect, test, type Page } from "@playwright/test";
import { createList, freshEmail, signIn } from "./helpers";

/** SPEC 20.5, 20.8, 20.14: Keys, How I hear and Time zone on the account page, and the key line in For you. */

const GOOD = "exa-test-key-good-7777";

async function saveKey(page: Page, key: string) {
  await page.goto("/app/account#keys");
  const keys = page.getByRole("region", { name: "Keys" });
  const replace = keys.locator("summary", { hasText: "Replace key" });
  if (await replace.count()) await replace.click();
  await keys.getByLabel(/^(New )?Exa key$/).fill(key);
  await keys.getByRole("button", { name: /^Save (new )?key$/ }).click();
  return keys;
}

test("Keys: write-only, checked with Exa on saving; the last 4, status, use this month, cap and Remove", async ({ page }) => {
  await signIn(page, freshEmail("routines-keys"));
  const keys = page.getByRole("region", { name: "Keys" });
  // A refused key saves nothing.
  await saveKey(page, "a-bad-key-1234");
  await expect(keys.getByRole("alert")).toHaveText("Exa didn't accept that key. Check it on your Exa dashboard and paste it again.");
  await expect(keys).not.toContainText("ending in");
  await saveKey(page, GOOD);
  await expect(keys.getByRole("status")).toHaveText("Saved. Exa accepted the key ending in 7777.");
  await expect(keys).toContainText("Exa key ending in 7777");
  await expect(keys).toContainText("Working");
  await expect(keys).toContainText("0 of 100 searches used this month");
  // Never shown again: not in the page, not in the address, the field empty.
  await page.reload();
  expect(await page.content()).not.toContain(GOOD);
  expect(page.url()).not.toContain("7777");
  await keys.getByLabel("Monthly limit (searches)").fill("250");
  await keys.getByRole("button", { name: "Save limit" }).click();
  await expect(keys.getByRole("status")).toHaveText("Saved. Up to 250 searches a month.");
  await keys.locator("summary", { hasText: /^Remove key/ }).click();
  await keys.getByRole("button", { name: "Yes, remove" }).click();
  await expect(keys.getByLabel("Exa key", { exact: true })).toBeVisible();
});

test("out of credit: its routines stop, For you says so with Change key, and Check again starts them", async ({ page }) => {
  await signIn(page, freshEmail("routines-credit"));
  await saveKey(page, GOOD);
  const id = await createList(page, { format: "Shopping", title: "Camping" });
  await page.goto(`/app/lists/${id}/settings#routines`);
  await page.locator("summary", { hasText: "New routine" }).click();
  await page.getByRole("button", { name: "Make this routine" }).click();
  await expect(page.locator("article").filter({ hasText: "your Exa key" })).toBeVisible();
  const keys = await saveKey(page, "empty-credit-key-0000");
  await expect(keys).toContainText("Out of credit");
  await page.goto("/app");
  const line = page.getByRole("region", { name: "For you" }).getByRole("listitem").filter({ hasText: "Your Exa account ran out of credit" });
  await expect(line).toContainText("1 routine is stopped");
  await line.getByRole("link", { name: "Change key" }).click();
  await expect(page).toHaveURL(/\/app\/account#keys$/);
  await keys.getByRole("button", { name: "Check again" }).click();
  await expect(keys.getByRole("status")).toHaveText("Exa accepted it: your stopped routines start again.");
  await page.goto("/app/routines");
  await expect(page.locator("main")).toContainText(/Next: /);
});

test("How I hear: key emails off and unlooked-at emails on by default; choices are kept", async ({ page }) => {
  await signIn(page, freshEmail("routines-hear"));
  await page.goto("/app/account#email");
  const hear = page.getByRole("region", { name: "How I hear" });
  const key = hear.getByLabel(/Email me if my Exa key stops working/);
  const unattended = hear.getByLabel(/Email me when nobody has looked/);
  await expect(key).not.toBeChecked();
  await expect(unattended).toBeChecked();
  await key.check();
  await unattended.uncheck();
  await hear.getByRole("button", { name: "Save" }).click();
  await expect(hear.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(key).toBeChecked();
  await expect(unattended).not.toBeChecked();
});

test.describe("time zone", () => {
  test.use({ timezoneId: "Europe/Lisbon" });
  test("the browser's is preselected but not saved until Save", async ({ page }) => {
    await signIn(page, freshEmail("routines-tz"));
    await page.goto("/app/account");
    const tz = page.getByRole("region", { name: "Time zone" });
    await expect(tz.getByLabel("Time zone")).toHaveValue("Europe/Lisbon");
    await expect(tz).toContainText("Not saved yet: this is your browser's.");
    await tz.getByLabel("Time zone").selectOption("Asia/Tokyo");
    await tz.getByRole("button", { name: "Save" }).click();
    await expect(tz.getByRole("status")).toContainText("Saved.");
    await page.reload();
    await expect(tz.getByLabel("Time zone")).toHaveValue("Asia/Tokyo");
    await expect(tz).not.toContainText("Not saved yet");
  });
});
