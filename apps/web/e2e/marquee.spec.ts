import { expect, test, type Page } from "@playwright/test";

/**
 * The "Works with" row on the home page. Whatever the device and its motion setting, every app in
 * the row must be reachable by waiting: it is one line that drifts, on every device, with or
 * without reduced motion.
 */
const row = (page: Page) => page.getByRole("navigation", { name: "Works with" });

async function measure(page: Page) {
  return row(page).evaluate((nav) => {
    const track = nav.querySelector(".marquee-track")!;
    const box = nav.getBoundingClientRect();
    const items = [...nav.querySelectorAll(".marquee-list:not([aria-hidden]) li")];
    const shown = items.filter((li) => {
      const r = li.getBoundingClientRect();
      return r.width > 0 && r.left >= box.left - 1 && r.right <= box.right + 1;
    });
    return {
      total: items.length,
      shown: shown.length,
      trackLeft: track.getBoundingClientRect().left,
      canScroll: nav.scrollWidth - nav.clientWidth,
      overflowX: getComputedStyle(nav).overflowX,
      height: box.height,
    };
  });
}

test("phone: the row drifts, and a touch on it does not stop it @phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "a touch screen only");
  await page.goto("/");
  const before = await measure(page);
  await page.waitForTimeout(1500);
  const after = await measure(page);
  expect(after.trackLeft).toBeLessThan(before.trackLeft - 10);

  // A touch on the row. On a phone "hover" and focus stick to the logo that was tapped, so a pause
  // on either would freeze the row until the person tapped somewhere else. The row is moving and nearly all of it is
  // links, so touch a point of it and keep the tap from following whichever link is under it.
  await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), true));
  const box = (await row(page).boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  const tapped = await measure(page);
  await page.waitForTimeout(1500);
  expect((await measure(page)).trackLeft).not.toBe(tapped.trackLeft);
});

test("with a keyboard: the row pauses while focus is in it", async ({ page, isMobile }) => {
  test.skip(isMobile, "a keyboard only");
  await page.goto("/");
  const first = row(page).getByRole("link").first();
  for (let i = 0; i < 40 && !(await first.evaluate((a) => a === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  const held = await measure(page);
  await page.waitForTimeout(800);
  expect((await measure(page)).trackLeft).toBe(held.trackLeft);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("phone: the row still drifts, on one line @phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "a touch screen only");
    await page.goto("/");
    const start = await measure(page);
    await page.waitForTimeout(1500);
    const later = await measure(page);
    // One line on a phone cannot show every app, so it keeps moving: the owner's decision.
    expect(later.trackLeft).toBeLessThan(start.trackLeft - 10);
    expect(start.height).toBeLessThan(80);
    // The page itself never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test("with a mouse: still one row, still drifting", async ({ page, isMobile }) => {
    test.skip(isMobile, "a mouse only");
    await page.setViewportSize({ width: 700, height: 800 });
    await page.goto("/");
    const start = await measure(page);
    // One row: every item of the visible copy sits on one centre line, and the strip is one line tall.
    const mids = await row(page).locator(".marquee-list:not([aria-hidden]) li").evaluateAll((lis) => lis.map((li) => { const r = li.getBoundingClientRect(); return (r.top + r.bottom) / 2; }));
    expect(Math.max(...mids) - Math.min(...mids)).toBeLessThan(6);
    expect(start.height).toBeLessThan(80);
    await page.waitForTimeout(1500);
    expect((await measure(page)).trackLeft).toBeLessThan(start.trackLeft - 10);
  });
});

test("the row starts with ChatGPT and ends with Codex, so the two OpenAI products are apart", async ({ page }) => {
  await page.goto("/");
  const names = await row(page).locator(".marquee-list:not([aria-hidden]) a").evaluateAll((links) => links.map((a) => a.textContent!.trim()));
  expect(names[0]).toBe("ChatGPT");
  expect(names.at(-2)).toBe("Codex");
  expect(names.at(-1)).toBe("Other apps");
});
