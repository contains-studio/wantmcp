import { expect, test } from "@playwright/test";
import { createList, DEMO, freshEmail, signIn } from "./helpers";

test("known agents show their mark, not a letter tile", async ({ page }) => {
  await page.goto("/l/lst_desk2026");
  await expect(page.locator(".agent-tag .dot-mark img").first()).toBeAttached();
});

test("deleting a list: two steps, no typing, and /app says it's gone", async ({ page }) => {
  await signIn(page, freshEmail("delete-two-step"));
  const id = await createList(page, { format: "Tasks", title: "Temporary" });
  await page.goto(`/app/lists/${id}/settings#danger-h`);
  await page.getByText("Delete list…").click();
  await page.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("status").filter({ hasText: "Deleted “Temporary”." })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Deleted “Temporary”.")).toHaveCount(0);
});

test("account: one Save; what agents should know lives in Skills; delete is a quiet link", async ({ page }) => {
  await signIn(page, freshEmail("one-form"));
  await page.goto("/app/account");
  const profile = page.locator("section[aria-labelledby=profile-h]");
  await expect(profile.getByRole("button", { name: "Save" })).toHaveCount(1);
  // SPEC 18.5: no "For your agents" box; one line to Skills.
  await expect(page.getByLabel("For your agents")).toHaveCount(0);
  await expect(profile.getByRole("link", { name: "Skills" })).toHaveAttribute("href", "/app/skills");
  await profile.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete account" })).not.toBeVisible();
});

test("a look's preview offers to start a list in it", async ({ page }) => {
  await page.goto("/themes/board--christmas?format=shopping");
  await expect(page.getByRole("link", { name: "Start a list with this look" })).toHaveAttribute("href", /\/login\?next=.*look%3Dboard--christmas/);
  await signIn(page, freshEmail("look-start"));
  await page.goto("/themes/board--christmas?format=shopping");
  await page.getByRole("link", { name: "Start a list with this look" }).click();
  await page.locator('input[name="title"]').fill("Christmas board");
  await page.getByRole("button", { name: /^Create .* list$/ }).click();
  await expect(page.locator(".themed").first()).toHaveClass(/\bocc-christmas\b/);
});

test("a private list's 404, signed out, offers to sign in and come back", async ({ page }) => {
  await page.goto("/l/lst_tasks");
  await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fl%2Flst_tasks");
});

test("a question with options: free text is one tap away", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_desk2026");
  const q = page.getByRole("group", { name: "Question for you" }).first();
  await expect(q.getByRole("textbox")).not.toBeVisible();
  await q.getByText("Something else…").click();
  await expect(q.getByRole("textbox")).toBeVisible();
});

test("an empty want stays one row: adding the first product is in its menu", async ({ page }) => {
  await signIn(page, freshEmail("empty-want"));
  const id = await createList(page, { format: "Shopping", title: "Compact wants" });
  await page.locator("#new-item").fill("A desk lamp");
  await page.getByRole("button", { name: "Add want" }).click();
  await expect(page.locator(".item-section", { hasText: "A desk lamp" })).toBeVisible();
  await page.goto(`/l/${id}`);
  const item = page.locator(".item-section", { hasText: "A desk lamp" });
  await expect(item.locator("summary.add-link", { hasText: "Add a product" })).toHaveCount(0);
  await item.getByRole("button", { name: /^More actions for/ }).click();
  await expect(page.locator(":popover-open").getByText("Add a product")).toBeVisible();
});
