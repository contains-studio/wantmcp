import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/** SPEC 26.3: what routines tell a person, under "For you" at the top of /app. */

test("notices: grouped by list, above the agents' changes; Open marks it seen and goes to the want; ✕ dismisses", async ({ page }) => {
  await signIn(page, "routines@example.com");
  const forYou = page.getByRole("region", { name: "For you" });
  const price = forYou.getByRole("listitem").filter({ hasText: "At your price: $39.99 at Target" });
  await expect(price).toBeVisible();
  await expect(forYou.getByRole("heading", { name: "Kitchen" })).toBeVisible();
  await expect(forYou.getByRole("heading", { name: "Ana's birthday" })).toBeVisible();
  // Above the agents' changes.
  const first = await price.boundingBox();
  const change = await forYou.getByRole("listitem").filter({ hasText: "reported you said" }).first().boundingBox();
  if (change) expect(first!.y).toBeLessThan(change.y);
  await price.getByRole("link", { name: /^Open/ }).click();
  await expect(page).toHaveURL(/\/l\/lst_rt_kitchen#itm_rt_pan$/);
  await page.goto("/app");
  await expect(page.getByRole("region", { name: "For you" })).not.toContainText("At your price: $39.99");
  const countdown = page.getByRole("region", { name: "For you" }).getByRole("listitem").filter({ hasText: "28 days to Christmas" });
  await countdown.getByRole("button", { name: /^Dismiss/ }).click();
  await expect(page.getByRole("region", { name: "For you" })).not.toContainText("28 days to Christmas");
  await page.reload();
  await expect(page.locator("main")).not.toContainText("28 days to Christmas");
});

test("open: never sends anyone to another site", async ({ page }) => {
  await signIn(page, "routines@example.com");
  await page.goto("/app/notices/ntc_nope/open?to=https://evil.example/x");
  await expect(page).toHaveURL(/\/app$/);
});
