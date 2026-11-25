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
  for (const path of ["/", "/login", "/connect"]) await audit(page, path);
});

test("a list page in every layout has no accessibility violations", async ({ page }) => {
  const layouts: Array<[string, string]> = [
    ["default", "shopping"],
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
