import { expect, test } from "@playwright/test";
import { acceptDialogs, createList, freshEmail, signIn } from "./helpers";

test("create a write key, copy the prompt, then revoke it", async ({ page }) => {
  acceptDialogs(page);
  await signIn(page, freshEmail("keys"));
  const id = await createList(page, { format: "Tasks", title: "E2E keys" });
  await page.goto(`/app/lists/${id}/settings`);
  await page.getByLabel("Agent name").fill("E2E bot");
  await page.getByRole("button", { name: "Create write key" }).click();
  await expect(page.getByText(/wk_[A-Za-z0-9]{8,}/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy prompt" })).toBeVisible();
  await page.getByRole("link", { name: /saved it/ }).click();
  const row = page.locator("li", { hasText: "E2E bot" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Revoke/ }).click();
  await expect(page.locator("li", { hasText: "E2E bot" })).toHaveCount(0);
});

test("invite a member, who accepts; then remove them", async ({ page, browser }) => {
  acceptDialogs(page);
  const owner = freshEmail("owner");
  const member = freshEmail("member");
  await signIn(page, owner);
  const id = await createList(page, { format: "Shopping", title: "E2E members" });
  await page.goto(`/app/lists/${id}/settings`);
  await page.getByLabel("Invite by email").fill(member);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByRole("button", { name: "Cancel invite" })).toBeVisible();

  const ctx = await browser.newContext();
  const m = await ctx.newPage();
  await signIn(m, member);
  await m.getByRole("button", { name: /Accept/ }).click();
  await expect(m).toHaveURL(new RegExp(`/l/${id}`));
  await ctx.close();

  await page.reload();
  const removeButtons = page.getByRole("button", { name: "Remove", exact: true });
  await expect(removeButtons).toHaveCount(1);
  await removeButtons.click();
  await expect(page.getByRole("button", { name: "Remove", exact: true })).toHaveCount(0);
});
