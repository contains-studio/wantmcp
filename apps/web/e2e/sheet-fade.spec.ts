import { expect, test } from "@playwright/test";

// The Sheet table's right edge fades only while there are more columns to scroll to, so the last
// column (the price's source: trust information) is never left faded.
const fade = (page: import("@playwright/test").Page) =>
  page.locator(".sheet-scroll").first().evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--sheet-fade")) || 0);

test("on a tablet the edge fades until the table is scrolled to the end", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto("/l/lst_desk2026");
  const box = page.locator(".sheet-scroll").first();
  const overflows = await box.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(overflows).toBe(true);
  expect(await fade(page)).toBeGreaterThan(0);
  await box.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect.poll(() => fade(page)).toBe(0);
});

test("on a desktop the whole table shows, with no fade", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/l/lst_desk2026");
  const mask = await page.locator(".sheet-scroll").first().evaluate((el) => getComputedStyle(el).maskImage);
  expect(mask).toBe("none");
});
