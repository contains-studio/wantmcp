import { expect, test } from "@playwright/test";
import { acceptDialogs, createList, DEMO, freshEmail, signIn } from "./helpers";

test("new list: the title is focused and Create is on the first phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, freshEmail("fast-new"));
  await page.goto("/app/new");
  await expect(page.locator('input[name="title"]')).toBeFocused();
  const box = await page.getByRole("button", { name: /^Create .* list$/ }).boundingBox();
  expect(box!.y + box!.height).toBeLessThan(844);
});

test("a private list's Share says who can open it and makes it public in one step", async ({ page }) => {
  acceptDialogs(page);
  await signIn(page, freshEmail("share-public"));
  const id = await createList(page, { format: "Shopping", title: "For the team" });
  await page.goto(`/l/${id}`);
  await page.getByRole("button", { name: "Share" }).click();
  const menu = page.locator(":popover-open");
  await expect(menu.getByText("Only you and people you invite can open this list.")).toBeVisible();
  await menu.getByRole("button", { name: "Make it public…" }).click();
  await expect(page).toHaveURL(new RegExp(`/l/${id}$`));
  // Public now: no lock in the header, and Share copies the link (with ?ref=share).
  await expect(page.locator(".list-hero")).not.toContainText("Private");
});

test("settings: who can see it is two plain choices, the current one marked", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app/lists/lst_tasks/settings#sharing-h");
  await expect(page.getByRole("button", { name: "Private", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("You", { exact: true }).first()).toBeVisible();
});

test("/connect: what to say next follows the list's format", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/connect?app=claude&list=lst_tasks");
  await expect(page.getByText("“Do the next open task on my Want MCP list.”")).toBeVisible();
});
