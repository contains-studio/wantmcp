import { expect, type Page } from "@playwright/test";

/** The mock accepts any address and the code 123456. */
export const MOCK_CODE = "123456";
export const DEMO = "demo@example.com"; // seeded owner of the demo lists

let n = 0;
export const freshEmail = (tag: string) => `e2e-${tag}-${Date.now().toString(36)}-${n++}@example.com`;

export async function signIn(page: Page, email: string) {
  await page.goto("/login?next=/app");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await enterCode(page, MOCK_CODE);
  await expect(page).toHaveURL(/\/app/);
}

/**
 * Type the sign-in code. With JavaScript it sends itself at six digits (SPEC 25), so wait for the page to be live first
 * and don't click; without JavaScript, click Sign in as before.
 */
export async function enterCode(page: Page, code: string) {
  const field = page.getByLabel("Code");
  const js = await page.evaluate(() => "__reactRouterContext" in window);
  if (js) await expect.poll(() => field.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps")))).toBe(true);
  await field.fill(code);
  if (!js) await page.getByRole("button", { name: "Sign in" }).click();
}

/** Confirm every confirm() dialog (removing, revoking, making public). */
export function acceptDialogs(page: Page) {
  page.on("dialog", (d) => d.accept());
}

/** Create a list from /app and land on its page; returns the list id. */
export async function createList(page: Page, opts: { format: "Shopping" | "Tasks" | "Research"; title: string; visibility?: "Public" | "Private" }) {
  await page.goto("/app/new");
  const form = page.locator("main form");
  await form.getByRole("radio", { name: new RegExp(`^${opts.format}`) }).check();
  await form.locator('input[name="title"]').fill(opts.title);
  if (opts.visibility) await form.getByRole("radio", { name: new RegExp(`^${opts.visibility}`) }).check();
  await form.getByRole("button", { name: /^Create .* list$/ }).click();
  await expect(page).toHaveURL(/\/l\/[^/?]+(\?new=1)?$/);
  return page.url().split("/l/")[1].split("?")[0];
}

/** Add an item on a list page with the compact add row, then skip the details prompt. */
export async function addItem(page: Page, text: string) {
  const add = page.locator("#add-item");
  await add.locator('input[name="text"]').fill(text);
  await add.getByRole("button", { name: /^Add / }).click();
  await expect(page.getByRole("heading", { name: text })).toBeVisible();
  const skip = add.getByRole("button", { name: "Skip" });
  if (await skip.isVisible()) await skip.click();
}
