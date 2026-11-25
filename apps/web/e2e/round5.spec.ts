import { expect, test } from "@playwright/test";

test("a bought want is one line, with everything else behind it", async ({ page }) => {
  await page.goto("/l/lst_desk2026");
  const row = page.locator("details.done-row", { hasText: "Quiet mechanical keyboard" });
  await expect(row.locator("> summary")).toContainText(/Bought · \$89\.00 at Example Keys · /);
  await expect(row.locator(".item-section")).not.toBeVisible();
  await row.locator("> summary").click();
  await expect(row.locator(".item-section")).toBeVisible();
});

test("a Sheet row opens in place: tap the row, its details show under it", async ({ page }) => {
  await page.goto("/l/lst_desk2026");
  // The Sheet is a list of product rows now (no table: one to three products is the common case).
  const group = page.locator(".sheet-group").first();
  await expect(group.locator(".sheet-detail")).not.toBeVisible();
  await group.locator(".sheet-price").click(); // the price: anywhere on the row
  await expect(group.locator(".sheet-detail")).toBeVisible();
  await expect(page.getByText("Details and price history")).toHaveCount(0);
});
