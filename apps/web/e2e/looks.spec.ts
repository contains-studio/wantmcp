import { expect, test } from "@playwright/test";
import { createList, freshEmail, signIn } from "./helpers";

/** Picks a layout (and optionally an occasion) in settings, saves, and checks the list page. */
async function useLook(page: import("@playwright/test").Page, id: string, layout: string, cls: string, occasion?: { name: string; cls: string }) {
  await page.goto(`/app/lists/${id}/settings`);
  const look = page.locator("[data-section='theme-h']");
  // A layout is chosen by tapping its miniature (the radio is behind it).
  const radio = look.getByRole("radio", { name: new RegExp(`^${layout}\\b`) });
  await look.locator(".look-choice", { has: page.getByRole("radio", { name: new RegExp(`^${layout}\\b`) }) }).click();
  await expect(radio).toBeChecked();
  if (occasion) {
    const o = look.getByRole("radio", { name: new RegExp(`^${occasion.name}\\b`) });
    await o.click();
    await expect(o).toBeChecked();
  }
  await look.getByRole("button", { name: "Save", exact: true }).click();
  await expect(look.getByText("Saved. Your list now uses this look.")).toBeVisible();
  await page.goto(`/l/${id}`);
  await expect(page.locator(".themed").first()).toHaveClass(new RegExp(`\\b${cls}\\b`));
  if (occasion) await expect(page.locator(".themed").first()).toHaveClass(new RegExp(`\\b${occasion.cls}\\b`));
}

test("switch layout and occasion", async ({ page }) => {
  await signIn(page, freshEmail("looks"));
  const id = await createList(page, { format: "Shopping", title: "E2E looks" });
  // An undressed shopping list uses Sheet.
  await expect(page.locator(".themed").first()).toHaveClass(/\btpl-sheet\b/);
  await useLook(page, id, "Checklist", "tpl-today");
  await useLook(page, id, "Sections", "tpl-sections");
  await useLook(page, id, "Doc", "tpl-doc");
  await useLook(page, id, "Sheet", "tpl-sheet");
  await useLook(page, id, "Board", "tpl-board", { name: "Christmas", cls: "occ-christmas" });
});

/**
 * The look gallery (owner, 25 Nov 2026: "completely visual"): every layout is a miniature of the list, occasions are
 * one row of chips that re-dress all of them, a tap selects and Save commits. Same stored values as before.
 */
async function openLook(page: import("@playwright/test").Page, id: string) {
  await page.goto(`/app/lists/${id}/settings#theme-h`);
  return page.locator("[data-section='theme-h']");
}

test("gallery: tap a miniature, Save, and the list wears it; an occasion re-dresses every miniature", async ({ page }) => {
  await signIn(page, freshEmail("gallery"));
  const id = await createList(page, { format: "Shopping", title: "Gallery" });
  const look = await openLook(page, id);
  const minis = look.locator(".look-gallery [data-list-theme]");
  await expect(minis).toHaveCount(8);
  // The default is marked in words, the chosen one with a ring and a check.
  await expect(look.locator(".look-choice.is-on .look-note")).toHaveText(/default$/);
  await expect(look.locator(".look-choice.is-on .look-check")).toHaveCount(1);

  await look.getByRole("radio", { name: "Christmas" }).check({ force: true });
  await expect.poll(() => minis.evaluateAll((els) => els.filter((e) => e.getAttribute("data-list-theme")!.endsWith("--christmas")).length)).toBe(8);

  await look.locator(".look-choice", { hasText: "Board" }).click();
  await expect(look.getByRole("radio", { name: /^Board\b/ })).toBeChecked();
  await expect(look.getByText("Not saved yet.")).toBeVisible();
  await look.getByRole("button", { name: "Save", exact: true }).click();
  await expect(look.getByText("Saved. Your list now uses this look.")).toBeVisible();
  await page.goto(`/l/${id}`);
  await expect(page.locator(".themed").first()).toHaveAttribute("data-list-theme", "board--christmas");
});

test("gallery: the keyboard moves within each group, with a visible focus", async ({ page }) => {
  await signIn(page, freshEmail("gallery-keys"));
  const id = await createList(page, { format: "Shopping", title: "Keys" });
  const look = await openLook(page, id);
  const sheet = look.getByRole("radio", { name: /^Sheet\b/ });
  await sheet.focus();
  await page.keyboard.press("ArrowRight");
  await expect(look.getByRole("radio", { name: /^Checklist\b/ })).toBeChecked();
  await expect(look.getByRole("radio", { name: /^Checklist\b/ })).toBeFocused();
  const outline = await look.locator(".look-choice.is-on .look-frame").evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe("solid");
});

test("gallery without JavaScript: the radios and Save still choose the look", async ({ browser }) => {
  const js = await browser.newContext();
  const page = await js.newPage();
  await signIn(page, freshEmail("gallery-nojs"));
  const id = await createList(page, { format: "Shopping", title: "No script" });
  const state = await js.storageState();
  const ctx = await browser.newContext({ javaScriptEnabled: false, storageState: state });
  const p = await ctx.newPage();
  await p.goto(`/app/lists/${id}/settings`);
  const look = p.locator("[data-section='theme-h']");
  // Without JavaScript the section starts closed; a details element still opens on a tap.
  if (!(await look.evaluate((d) => (d as HTMLDetailsElement).open))) await look.locator("> summary").click();
  await look.locator(".look-choice", { has: p.getByRole("radio", { name: /^Doc\b/ }) }).click();
  await look.locator(".look-occasions label", { hasText: "New Year" }).click();
  await look.getByRole("button", { name: "Save", exact: true }).click();
  await p.goto(`/l/${id}`);
  await expect(p.locator(".themed").first()).toHaveAttribute("data-list-theme", "doc--new-year");
  await ctx.close();
  await js.close();
});

test("gallery: a tasks list shows only the layouts tasks lists offer (no Sheet)", async ({ page }) => {
  await signIn(page, freshEmail("gallery-tasks"));
  const id = await createList(page, { format: "Tasks", title: "Tasks gallery" });
  const look = await openLook(page, id);
  await expect(look.locator(".look-gallery .look-choice")).toHaveCount(7);
  await expect(look.getByRole("radio", { name: /^Sheet\b/ })).toHaveCount(0);
});

test("gallery on a phone: no sideways scroll but the occasion row, nothing scrolls inside a miniature", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, freshEmail("gallery-phone"));
  const id = await createList(page, { format: "Shopping", title: "Phone gallery" });
  await openLook(page, id);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const scrollers = await page.locator(".look-gallery").evaluate((g) =>
    [...g.querySelectorAll("*")].filter((el) => { const s = getComputedStyle(el); return (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) || (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1); }).length);
  expect(scrollers).toBe(0);
});
