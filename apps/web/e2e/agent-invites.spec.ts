import { expect, test } from "@playwright/test";
import { DEMO, signIn } from "./helpers";

/** SPEC 21.5: the owner's agent invites and the email goes out at once; Sharing says which agent, and it can be cancelled. */
test("a pending invitation an agent sent says so in Sharing, and the owner can cancel it", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app/lists/lst_desk2026/settings#sharing-h");
  await page.locator("#sharing-h").click();
  const row = page.locator(".access-row", { hasText: "maya@example.com" });
  await expect(row).toContainText("Claude invited them · pending");
  // A person's own invitation still reads as before.
  await expect(page.locator(".access-row", { hasText: "sam@example.com" })).toContainText("Invite sent");
  await row.locator("details.row-remove > summary").click();
  await row.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page.locator(".access-row", { hasText: "maya@example.com" })).toHaveCount(0);
});

test("on a phone every Sharing address shows whole, wrapping rather than cut", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, DEMO);
  await page.goto("/app/lists/lst_desk2026/settings");
  const sharing = page.locator("#sharing-h").locator("xpath=ancestor::details[1]");
  if (!(await sharing.evaluate((d: HTMLDetailsElement) => d.open))) await page.locator("#sharing-h").click();
  const names = sharing.locator(".access-row .access-name");
  await expect(names.filter({ hasText: "sam@example.com" })).toHaveCount(1);
  for (const cut of await names.evaluateAll((els) => els.map((e) => e.scrollWidth > e.clientWidth + 1 || getComputedStyle(e).textOverflow === "ellipsis"))) expect(cut).toBe(false);
});
