import { expect, test } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

/** Clean-eyes review, batch 2 (25 Nov 2026): looks, the holiday tiles and the /for pages. */

test("a holiday tile opens its preview, whose one button starts that occasion's list @phone", async ({ page }) => {
  await page.goto("/");
  await page.locator("section[aria-labelledby=season-h]").getByRole("link", { name: "Black Friday", exact: true }).click();
  await expect(page).toHaveURL(/\/themes\/sheet--black-friday$/);
  const start = page.getByRole("link", { name: "Start a Black Friday list" });
  await expect(start).toHaveAttribute("href", `/login?next=${encodeURIComponent("/start?occasion=black-friday")}`);
  const box = await start.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  // One primary button: the generic one gives way.
  await expect(page.getByRole("link", { name: "Start a list with this look" })).toHaveCount(0);
});

test("sign-in names the occasion being started; anything else keeps the generic title", async ({ page }) => {
  await page.goto(`/login?next=${encodeURIComponent("/start?occasion=black-friday")}`);
  await expect(page.getByRole("heading", { level: 1, name: "Start your Black Friday list" })).toBeVisible();
  await page.goto(`/login?next=${encodeURIComponent("/start?occasion=no-such-day")}`);
  await expect(page.getByRole("heading", { level: 1, name: "Start your list" })).toBeVisible();
});

test("a /for task page opens on its task list", async ({ page }) => {
  await page.goto("/for/task-list-for-multiple-coding-agents");
  await expect(page.getByRole("navigation", { name: "Sample lists" }).getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 2, name: "Task list", exact: true })).toBeVisible();
});

test("look pages are called looks and carry share tags", async ({ page }) => {
  await page.goto("/themes/sheet");
  await expect(page).toHaveTitle("Sheet look · The Want MCP");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /look/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\/home\.png/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await page.goto("/themes");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Looks");
});

test("Board: no colour-only bars; the opened item uses the sheet's full width @phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/themes/board");
  await expect(page.locator(".ix-label")).toHaveCount(0);
  await page.locator(".ix-card a").first().click();
  const section = page.locator(".ix-panel .item-section:target");
  await expect(section).toBeVisible();
  const box = (await section.boundingBox())!;
  expect(box.x).toBeLessThanOrEqual(17);
  expect(box.width).toBeGreaterThanOrEqual(390 - 34);
});

test("Sections on a phone: no lone dashes or status chips, no leading dot @phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/themes/sections");
  const visible = await page.locator(".ix-row .ix-cell").evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.textContent?.trim()));
  expect(visible).not.toContain("–");
  await expect(page.locator(".ix-row .ix-status").first()).toBeHidden();
  // Visitors get no unnamed mark in front of each row.
  await expect(page.locator(".ix-row .check-toggle")).toHaveCount(0);
});

test("Sections: the writer's tick is named and 44px to tap; no decorative rail on desktop", async ({ page }) => {
  await signIn(page, freshEmail("sections-tick"));
  const id = await createList(page, { format: "Tasks", title: "Sections tick" });
  await addItem(page, "Book the movers");
  const res = await page.request.post(`/app/lists/${id}/settings`, { form: { intent: "theme", theme: "sections" }, headers: { origin: new URL(page.url()).origin } });
  expect(res.ok()).toBe(true);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(`/l/${id}`);
  const tick = page.locator(".ix-row").getByRole("checkbox", { name: /Book the movers/ });
  await expect(tick).toBeVisible();
  const hit = await tick.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el, "::before");
    return r.width - 2 * parseFloat(s.left);
  });
  expect(hit).toBeGreaterThanOrEqual(43.5);
  const rail = await page.locator(".themed").first().evaluate((el) => getComputedStyle(el, "::before").content);
  expect(rail === "none" || rail === "normal").toBe(true);
});
