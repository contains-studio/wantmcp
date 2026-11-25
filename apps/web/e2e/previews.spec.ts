import { expect, test } from "@playwright/test";

// Home page previews are pictures of a list: nothing inside them scrolls, they fill their frame,
// and their header is the title only.
for (const width of [1280, 820, 390]) {
  test(`home previews are still pictures at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const report = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".theme-thumb")].map((thumb) => {
        const inner = thumb.querySelector<HTMLElement>(".theme-thumb-inner")!;
        const scrollers = [...thumb.querySelectorAll<HTMLElement>("*")].filter((el) => {
          const st = getComputedStyle(el);
          return /(auto|scroll)/.test(`${st.overflowX} ${st.overflowY}`) && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
        });
        return {
          scrollers: scrollers.map((el) => el.className.toString().slice(0, 60)),
          gap: Math.round(thumb.getBoundingClientRect().width - inner.getBoundingClientRect().width),
          meta: thumb.querySelectorAll(".list-meta, .list-desc").length,
        };
      }),
    );
    expect(report.length).toBeGreaterThan(10);
    for (const r of report) {
      expect(r.scrollers, "scrollable element inside a preview").toEqual([]);
      expect(Math.abs(r.gap), "preview does not reach its frame").toBeLessThanOrEqual(1);
      expect(r.meta, "counts, owner or sample note in a miniature").toBe(0);
    }
  });
}
