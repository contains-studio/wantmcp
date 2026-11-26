import { expect, test } from "@playwright/test";
import { acceptDialogs, createList, freshEmail, signIn } from "./helpers";

test("settings › Agents: make a key with the Share step, then remove the agent in two steps", async ({ page }) => {
  await signIn(page, freshEmail("keys"));
  const id = await createList(page, { format: "Tasks", title: "E2E keys" });
  await page.goto(`/app/lists/${id}/settings#keys-h`);
  const sec = page.locator('details[data-section="keys-h"]');
  await sec.locator("details.choice-other > summary").click();
  await sec.getByLabel("Or its name").fill("E2E bot");
  await sec.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(sec.getByText("The key is shown this once.")).toBeVisible();
  await expect(sec.locator(".prompt-facts")).toContainText(/Bearer wk_[A-Za-z0-9]{8,}/);
  const row = sec.locator(".access-row", { hasText: "E2E bot" });
  await expect(row).toContainText("With a key · never used yet");
  await row.locator("summary", { hasText: "Remove" }).click();
  await row.getByRole("button", { name: "Yes, remove" }).click();
  await expect(sec.locator(".access-row", { hasText: "E2E bot" })).toHaveCount(0);
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
  await expect(page.locator("summary", { hasText: "Cancel invite" })).toBeVisible();

  const ctx = await browser.newContext();
  const m = await ctx.newPage();
  await signIn(m, member);
  await m.getByRole("button", { name: /Accept/ }).click();
  await expect(m).toHaveURL(new RegExp(`/l/${id}`));
  await ctx.close();

  await page.reload();
  // People and agents share one row shape (AccessRow); Remove is two steps.
  const sharing = page.locator('details[data-section="sharing-h"]');
  const removes = sharing.locator(".access-row summary", { hasText: "Remove" });
  await expect(removes).toHaveCount(1);
  await removes.click();
  await sharing.getByRole("button", { name: "Yes, remove" }).click();
  await expect(sharing.locator(".access-row summary", { hasText: "Remove" })).toHaveCount(0);
});
