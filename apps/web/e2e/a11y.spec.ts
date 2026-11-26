import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { DEMO, signIn } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = result.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);
  expect(summary, `${path}\n${summary.join("\n")}`).toEqual([]);
}

test("public pages have no accessibility violations @phone", async ({ page }) => {
  for (const path of ["/", "/login", "/connect", "/themes", "/for", "/for/black-friday-shopping-list"]) await audit(page, path);
});

test("a list page in every layout has no accessibility violations", async ({ page }) => {
  const layouts: Array<[string, string]> = [
    ["sheet", "shopping"],
    ["today", "tasks"],
    ["sections", "tasks"],
    ["board", "tasks"],
    ["heat", "tasks"],
    ["doc", "research"],
    ["tracker", "tasks"],
  ];
  for (const [slug, format] of layouts) await audit(page, `/themes/${slug}?format=${format}`);
});

test("/app has no accessibility violations", async ({ page }) => {
  await signIn(page, DEMO);
  await audit(page, "/app");
  await audit(page, "/l/lst_desk2026");
});

// A miniature of a list holds links of its own. Wrapped in a link, the HTML parser splits the outer link and
// leaves it empty, so the tile cannot be clicked. Check the server's HTML as the browser parses it, without scripts.
test("look tiles stay whole links in the server HTML", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const path of ["/", "/themes"]) {
    await page.goto(path);
    const empty = await page.evaluate(
      () => [...document.querySelectorAll("a")].filter((a) => !a.closest("[aria-hidden=true]") && !(a.textContent ?? "").trim() && !a.getAttribute("aria-label")).length,
    );
    expect(empty, `${path}: links with no text`).toBe(0);
  }
  await page.goto("/");
  // 7 layouts and the season's 5 occasions each link to their previews.
  const layouts = page.locator("section[aria-labelledby=looks-h] .look-tile a.stretched-link");
  await expect(layouts).toHaveCount(7);
  await expect(layouts.first()).toHaveAttribute("href", /^\/themes\//);
  const occasions = page.locator("section[aria-labelledby=season-h] .look-tile a.stretched-link");
  await expect(occasions).toHaveCount(5);
  await expect(occasions.first()).toHaveAttribute("href", /^\/themes\/sheet--/);
  await expect(page.locator(".look-tile .stretched-link")).toHaveCount(12);
  await ctx.close();
});
