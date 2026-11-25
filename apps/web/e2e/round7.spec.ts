import { expect, test, type Page } from "@playwright/test";
import { createList, DEMO, freshEmail, signIn } from "./helpers";

test("a claim or invite link that can't be checked right now says so, with a reference", async ({ page }) => {
  for (const path of ["/claim/clm_fail_x123", "/invite/inv_fail_x123"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /We couldn't check this (link|invite) just now/ })).toBeVisible();
    await expect(page.getByText(/Reference: /)).toBeVisible();
    await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
  }
});

async function noSidewaysScroll(page: Page, path: string) {
  await page.goto(path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${path} scrolls sideways by ${overflow}px at 320`).toBeLessThanOrEqual(1);
}

test("320px wide, a 140-character title and 30 wants: nothing scrolls sideways", async ({ page }) => {
  test.setTimeout(150_000);
  await signIn(page, freshEmail("narrow"));
  const long = "A very long list title that keeps going to see what happens to every header and card when it wraps across lines".slice(0, 140);
  const id = await createList(page, { format: "Shopping", title: long });
  for (let i = 1; i <= 30; i++) {
    await page.locator("#new-item").fill(`Want number ${i}: a reasonably descriptive thing with a size, a colour and a budget under ${i * 10} dollars`);
    await page.getByRole("button", { name: "Add want" }).click();
    await expect(page.locator(".item-section", { hasText: `Want number ${i}:` })).toBeVisible();
    const skip = page.getByRole("button", { name: "Skip" });
    if (await skip.isVisible()) await skip.click();
  }
  await page.setViewportSize({ width: 320, height: 640 });
  const signedIn = ["/", "/app", "/app/new", "/app/activity", `/l/${id}`, `/app/lists/${id}/settings`, "/app/account", "/connect", "/connect?app=claude-code", "/for", "/for/black-friday-shopping-list", "/themes"];
  for (const path of signedIn) await noSidewaysScroll(page, path);
  await page.context().clearCookies();
  const signedOut = ["/", "/login?next=/app/new", "/claim/clm_seed_unclaimed", "/invite/inv_seed_from_agent", "/l/lst_desk2026", "/unsubscribe/unsub_x1234"];
  for (const path of signedOut) await noSidewaysScroll(page, path);
});

test("the demo account's pages at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await signIn(page, DEMO);
  for (const path of ["/app", "/l/lst_desk2026", "/l/lst_tasks", "/l/lst_research", "/app/lists/lst_desk2026/settings"]) await noSidewaysScroll(page, path);
});
