import { expect, test, type Page } from "@playwright/test";
import { DEMO, freshEmail, MOCK_CODE } from "./helpers";

/**
 * "Email me about new features" starts ticked wherever an account is made (owner, 25 Nov 2026), except for visitors
 * from the EU, the EEA, the UK and Switzerland, where a pre-ticked box isn't valid consent. It applies to new accounts
 * only: signing in to an existing account never changes the stored choice.
 */
const box = (page: Page) => page.getByRole("checkbox", { name: "Email me about new features" });

/** The signed-in person's stored choice, as the root loader received it from GET /me. */
async function storedOptIn(page: Page): Promise<boolean | undefined> {
  return page.evaluate(() => (window as unknown as { __reactRouterDataRouter?: { state: { loaderData: { root?: { user?: { updates_opt_in?: boolean } } } } } }).__reactRouterDataRouter?.state.loaderData.root?.user?.updates_opt_in);
}

async function finish(page: Page, email: string, untick = false) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  if (untick) await box(page).uncheck();
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Code").fill(MOCK_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test("plain sign-up: starts ticked and stores yes; unticking stores no", async ({ page }) => {
  await page.goto("/login?next=/app");
  await expect(box(page)).toBeChecked();
  await finish(page, freshEmail("optin-yes"));
  expect(await storedOptIn(page)).toBe(true);

  await page.context().clearCookies();
  await page.goto("/login?next=/app");
  await finish(page, freshEmail("optin-no"), true);
  expect(await storedOptIn(page)).toBe(false);
});

test("sign-up from a claim link: ticked, and the list is kept with yes stored", async ({ page }) => {
  await page.goto(`/claim/clm_e2e_unclaimed_optin${Date.now()}`);
  await page.getByRole("button", { name: "Keep this list" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fclaim|\/login\?next=\/claim/);
  await expect(box(page)).toBeChecked();
  await finish(page, freshEmail("optin-claim"));
  await expect(page).toHaveURL(/\/l\/lst_/);
  expect(await storedOptIn(page)).toBe(true);
});

test("sign-up from Start a list, and from an invite link: the same ticked choice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start a list" }).first().click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(box(page)).toBeChecked();
  await finish(page, freshEmail("optin-start"));
  expect(await storedOptIn(page)).toBe(true);

  await page.context().clearCookies();
  await page.goto("/invite/inv_seed_from_agent");
  const signIn = page.getByRole("link", { name: /sign in|sign up|join/i }).first();
  if (await signIn.count()) await signIn.click();
  else await page.goto("/login?next=%2Finvite%2Finv_seed_from_agent");
  await expect(page).toHaveURL(/\/login/);
  await expect(box(page)).toBeChecked();
});

test("unticked stays unticked when the code was wrong", async ({ page }) => {
  await page.goto("/login?next=/app");
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("optin-wrong"));
  await box(page).uncheck();
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Code").fill("000000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Code").fill(MOCK_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
  expect(await storedOptIn(page)).toBe(false);
});

for (const country of ["DE", "GB"]) {
  test(`a visitor from ${country} starts unticked, and stores no unless they tick it`, async ({ browser }) => {
    const ctx = await browser.newContext({ extraHTTPHeaders: { "cf-ipcountry": country } });
    const page = await ctx.newPage();
    await page.goto("/login?next=/app");
    await expect(box(page)).not.toBeChecked();
    await page.getByLabel("Email", { exact: true }).fill(freshEmail(`optin-${country}`));
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.getByLabel("Code").fill(MOCK_CODE);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app/);
    expect(await storedOptIn(page)).toBe(false);
    await ctx.close();
  });
}

test("the ticked box works without JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/login?next=/app");
  await expect(box(page)).toBeChecked();
  await ctx.close();
});

test("signing in to an existing account never changes its stored choice", async ({ page }) => {
  // The demo person said no; signing in with the box ticked (the default) keeps it no.
  await page.goto("/login?next=/app");
  await expect(box(page)).toBeChecked();
  await finish(page, DEMO);
  expect(await storedOptIn(page)).toBe(false);
  // Heron said yes; signing in with it unticked keeps it yes.
  await page.context().clearCookies();
  await page.goto("/login?next=/app");
  await finish(page, "heron@example.com", true);
  expect(await storedOptIn(page)).toBe(true);
});

test("the choice is easy to untick on a phone: a 44px row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  const row = page.locator("label.check", { has: box(page) });
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
