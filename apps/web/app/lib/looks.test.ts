import assert from "node:assert/strict";
import { test } from "node:test";
import { getThemeView, lookSlug, occasionViews, OFFERED_OCCASIONS, resolveLook, TEMPLATES } from "../themes/catalogue.server.ts";

test("Cards is no longer offered", () => {
  assert.deepEqual(
    TEMPLATES.map((t) => t.slug),
    ["sheet", "today", "doc", "board", "sections", "heat", "tracker", "gallery"],
  );
});

test("a retired, missing or unknown layout falls back to the format's layout, keeping the occasion", () => {
  const cases: Array<[string | null, "shopping" | "tasks" | "research", string]> = [
    ["default", "shopping", "sheet"],
    ["default", "tasks", "today"],
    ["default", "research", "doc"],
    [null, "tasks", "today"],
    ["no-such-look", "research", "doc"],
    ["default--christmas", "shopping", "sheet--christmas"],
    ["default--chanukah", "tasks", "today--chanukah"],
    ["christmas", "research", "doc--christmas"],
    ["board--kwanzaa", "tasks", "board--kwanzaa"],
  ];
  for (const [stored, format, slug] of cases) assert.equal(resolveLook(stored, format).slug, slug, `${stored} on ${format}`);
});

test("the rendered view uses the fallback layout", () => {
  const v = getThemeView("default--christmas", "shopping");
  assert.equal(v.template, "sheet");
  assert.equal(v.occasion, "christmas");
  assert.match(v.className, /\btpl-sheet\b/);
  assert.doesNotMatch(v.className, /tpl-default/);
});

test("slugs always name a layout", () => {
  assert.equal(lookSlug("sheet", "christmas"), "sheet--christmas");
  assert.equal(lookSlug("default", null, "tasks"), "today");
});

test("Valentine's Day and Halloween are not offered, but still render where used", () => {
  assert.deepEqual(
    OFFERED_OCCASIONS.map((o) => o.slug),
    ["black-friday", "cyber-monday", "chanukah", "christmas", "kwanzaa", "new-year", "birthday"],
  );
  assert.equal(occasionViews().length, 7);
  const v = getThemeView("sheet--valentines", "shopping");
  assert.equal(v.occasion, "valentines");
});
