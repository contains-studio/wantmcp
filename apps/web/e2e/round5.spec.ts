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
  const group = page.locator("tbody.sheet-group").first();
  await expect(group.locator(".sheet-detail")).not.toBeVisible();
  await group.locator("td").nth(1).click(); // the price cell: anywhere on the row
  await expect(group.locator(".sheet-detail")).toBeVisible();
  await expect(page.getByText("Details and price history")).toHaveCount(0);
});
