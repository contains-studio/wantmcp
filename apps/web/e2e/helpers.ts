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
  await page.getByLabel("Code").fill(MOCK_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

/** Confirm every confirm() dialog (removing, revoking, making public). */
export function acceptDialogs(page: Page) {
  page.on("dialog", (d) => d.accept());
}

/** Create a list from /app and land on its page; returns the list id. */
export async function createList(page: Page, opts: { format: "Shopping" | "Tasks" | "Research"; title: string; visibility?: "Public" | "Private" }) {
  await page.goto("/app");
  const form = page.locator("#new-list");
  if (!(await form.evaluate((d) => (d as { open?: boolean }).open))) await form.locator("summary").click();
  await form.getByRole("radio", { name: new RegExp(`^${opts.format}`) }).check();
  await form.locator('input[name="title"]').fill(opts.title);
  if (opts.visibility) await form.getByRole("radio", { name: new RegExp(`^${opts.visibility}`) }).check();
  await form.getByRole("button", { name: /^Create .* list$/ }).click();
  await expect(page).toHaveURL(/\/l\/[^/]+$/);
  return page.url().split("/l/")[1];
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
