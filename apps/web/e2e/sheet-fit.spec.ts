import { expect, test } from "@playwright/test";

// The Sheet used to be a wide table that scrolled sideways on tablets, with a fading edge to say so. Its products are
// rows now (owner review, 25 Nov 2026): at every width they fit, so nothing scrolls sideways and nothing fades.
for (const width of [390, 800, 1280, 1600]) {
  test(`at ${width}px the Sheet fits: no sideways scroll on the page or inside a want`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/l/lst_desk2026");
    await expect(page.locator(".sheet-row").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const inner = await page.locator(".sheet-list").evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    expect(inner).toBe(0);
  });
}
