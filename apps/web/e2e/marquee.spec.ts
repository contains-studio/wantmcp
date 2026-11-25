import { expect, test, type Page } from "@playwright/test";

/**
 * The "Works with" row on the home page. Whatever the device and its motion setting, every app in
 * the row must be reachable: by waiting (it drifts), by swiping (reduced motion on a touch screen)
 * or because it wraps (reduced motion with a mouse).
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

  test("phone: the row stands still on one line and swipes to the last app @phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "a touch screen only");
    await page.goto("/");
    const start = await measure(page);
    await page.waitForTimeout(800);
    expect((await measure(page)).trackLeft).toBe(start.trackLeft);
    expect(start.height).toBeLessThan(80);
    expect(start.shown).toBeLessThan(start.total);
    // It starts at its beginning, not centred with both ends cut off.
    await expect(row(page).getByText("Works with").first()).toBeInViewport({ ratio: 1 });
    expect(start.overflowX).toBe("auto");
    expect(start.canScroll).toBeGreaterThan(100);

    await row(page).evaluate((nav) => nav.scrollTo({ left: nav.scrollWidth }));
    await expect(row(page).getByRole("link", { name: "Other apps" }).first()).toBeInViewport({ ratio: 1 });
    // The page itself never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test("with a mouse: the row wraps and shows every app", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 800 });
    await page.goto("/");
    const m = await measure(page);
    expect(m.shown).toBe(m.total);
    expect(m.canScroll).toBeLessThanOrEqual(0);
    // Only one copy of the row is left.
    await expect(row(page).getByRole("link", { name: "Other apps" })).toHaveCount(1);
  });
});
