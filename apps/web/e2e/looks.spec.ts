import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

/**
 * List settings › Look. One large picture of the list in the chosen look, the layouts as a small grid of named
 * swatches under it (each layout's structure in its own colours), the occasion as a menu, and Save while there is
 * something to save: a tap previews, Save commits. Same stored values as before.
 */
async function openLook(page: Page, id: string) {
  await page.goto(`/app/lists/${id}/settings#theme-h`);
  const look = page.locator("[data-section='theme-h']");
  await expect(look.locator(".look-stage")).toBeVisible();
  return look;
}

const option = (look: Locator, layout: string) => look.locator("label.look-opt", { has: look.page().getByRole("radio", { name: new RegExp(`^${layout}\\b`) }) });
const picture = (look: Locator) => look.locator(".look-stage [data-list-theme]");
const save = (look: Locator) => look.getByRole("button", { name: "Save", exact: true });
const savedNote = (look: Locator) => look.getByText("Saved.", { exact: true });

/** Picks a layout (and optionally an occasion) in settings, saves, and checks the list page. */
async function useLook(page: Page, id: string, layout: string, cls: string, occasion?: { name: string; cls: string }) {
  const look = await openLook(page, id);
  await option(look, layout).click();
  await expect(look.getByRole("radio", { name: new RegExp(`^${layout}\\b`) })).toBeChecked();
  if (occasion) await look.getByLabel("Occasion").selectOption({ label: occasion.name });
  await save(look).click();
  await expect(savedNote(look)).toBeVisible();
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

test("structure: one picture of the list's own look, eight named layouts in their own colours, the occasion", async ({ page }) => {
  await signIn(page, freshEmail("look-structure"));
  const id = await createList(page, { format: "Shopping", title: "Structure" });
  const look = await openLook(page, id);
  // The row itself says which look the list has, in words, with the look's swatch and no miniature.
  await expect(look.locator("> summary")).toContainText("Sheet");
  await expect(look.locator("> summary svg.look-glyph")).toHaveCount(1);
  await expect(look.locator("> summary [data-list-theme]")).toHaveCount(0);
  // One picture, of the look the list has now, named, with what kind of page it is.
  await expect(picture(look)).toHaveCount(1);
  await expect(picture(look)).toHaveAttribute("data-list-theme", "sheet");
  await expect(look.locator(".look-cap")).toHaveText("SheetPrice table");
  // Every layout is one radio with its name and a swatch; the list's own is the checked one.
  const radios = look.getByRole("group", { name: "Layout" }).getByRole("radio");
  await expect(radios).toHaveCount(8);
  for (const name of ["Sheet", "Checklist", "Doc", "Board", "Sections", "Heat", "Tracker", "Gallery"]) {
    await expect(option(look, name).locator("svg.look-glyph")).toHaveCount(1);
  }
  await expect(look.getByRole("radio", { name: /^Sheet\b/ })).toBeChecked();
  await expect(look.getByLabel("Occasion")).toHaveValue("");
  // The swatches differ in colour as the looks do (Board's band, Heat's bars), and an occasion re-colours every one.
  const paint = (name: string, part: string) => option(look, name).locator(`svg.look-glyph ${part}`).first().evaluate((el) => getComputedStyle(el).fill);
  const paper = (name: string) => option(look, name).locator("svg.look-glyph").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await paint("Board", ".g-band")).not.toBe(await paint("Sheet", ".g-want"));
  // Heat is its gradient, hot to cool (owner, 27 Nov 2026), in the swatch and in the picture.
  const stop = (part: string) => option(look, "Heat").locator(`svg.look-glyph stop${part}`).evaluate((el) => getComputedStyle(el).stopColor);
  expect(await stop(".g-hot")).not.toBe(await stop(".g-cool"));
  expect(await option(look, "Heat").locator("svg.look-glyph rect").first().getAttribute("fill")).toMatch(/^url\(#lg/);
  const plain = await paper("Checklist");
  await look.getByLabel("Occasion").selectOption({ label: "Christmas" });
  await expect.poll(() => paper("Checklist")).not.toBe(plain);
  await look.getByLabel("Occasion").selectOption({ label: "None" });
  // Nothing to save yet, so no Save.
  await expect(save(look)).toHaveCount(0);
  // The picture is a picture: nothing in it can be reached or clicked.
  expect(await look.locator(".look-stage .theme-thumb").evaluate((el) => (el as HTMLElement).inert && el.getAttribute("aria-hidden"))).toBe("true");
  // A new list has nothing to draw yet, so the picture is the sample and says so.
  await expect(look.locator(".look-stage")).toContainText("Shown on a sample list until yours has two wants.");
});

test("a tap previews, Keep goes back, Save commits and the page says so", async ({ page }) => {
  await signIn(page, freshEmail("look-pick"));
  const id = await createList(page, { format: "Shopping", title: "Pick a look" });
  for (const t of ["A lamp", "A chair"]) await addItem(page, t);
  const look = await openLook(page, id);
  // With two wants of its own, the picture is this list, not the sample.
  await expect(look.locator(".look-stage")).toContainText("A lamp");
  await expect(look.locator(".look-stage")).not.toContainText("sample list");

  // Trying a look changes the picture and says it is only a preview; nothing is saved yet.
  await option(look, "Board").click();
  await expect(picture(look)).toHaveAttribute("data-list-theme", "board");
  await expect(look.locator(".look-cap")).toContainText("Board");
  await expect(look.locator(".look-cap")).toContainText("Preview, not saved");
  await expect(look.locator("> summary")).toContainText("Sheet");
  await expect(save(look)).toBeVisible();
  // Going back is one tap, and then there is nothing to save again.
  await look.getByRole("button", { name: "Keep Sheet" }).click();
  await expect(look.getByRole("radio", { name: /^Sheet\b/ })).toBeChecked();
  await expect(picture(look)).toHaveAttribute("data-list-theme", "sheet");
  await expect(look.locator(".look-cap")).not.toContainText("Preview");
  await expect(look.getByRole("button", { name: /^Keep / })).toHaveCount(0);
  await expect(save(look)).toHaveCount(0);

  // A layout and an occasion together; the picture wears both.
  await option(look, "Board").click();
  await look.getByLabel("Occasion").selectOption({ label: "Christmas" });
  await expect(picture(look)).toHaveAttribute("data-list-theme", "board--christmas");
  await save(look).click();
  await expect(savedNote(look)).toBeVisible();
  // Saved shows in words, in the row's own summary, and by Save and "Preview, not saved" going away.
  await expect(look.locator(".look-cap")).not.toContainText("Preview");
  await expect(look.locator("> summary")).toContainText("Board · Christmas");
  await expect(look.getByRole("button", { name: /^Keep / })).toHaveCount(0);
  await expect(save(look)).toHaveCount(0);
  await look.getByRole("link", { name: "View your list" }).click();
  await expect(page).toHaveURL(new RegExp(`/l/${id}$`));
  await expect(page.locator(".themed").first()).toHaveAttribute("data-list-theme", "board--christmas");

  // And it is reversible: back to the default, which is stored as "no look of its own".
  const again = await openLook(page, id);
  await expect(again.getByRole("radio", { name: /^Board\b/ })).toBeChecked();
  await expect(again.getByLabel("Occasion")).toHaveValue("christmas");
  await option(again, "Sheet").click();
  await again.getByLabel("Occasion").selectOption({ label: "None" });
  await save(again).click();
  await expect(savedNote(again)).toBeVisible();
  await page.goto(`/l/${id}`);
  await expect(page.locator(".themed").first()).toHaveAttribute("data-list-theme", "sheet");
});

test("the keyboard moves between layouts, with a visible focus", async ({ page }) => {
  await signIn(page, freshEmail("look-keys"));
  const id = await createList(page, { format: "Shopping", title: "Keys" });
  const look = await openLook(page, id);
  const sheet = look.getByRole("radio", { name: /^Sheet\b/ });
  await sheet.focus();
  await page.keyboard.press("ArrowRight");
  await expect(look.getByRole("radio", { name: /^Checklist\b/ })).toBeChecked();
  await expect(look.getByRole("radio", { name: /^Checklist\b/ })).toBeFocused();
  await expect(picture(look)).toHaveAttribute("data-list-theme", "today");
  const outline = await option(look, "Checklist").evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe("solid");
});

test("without JavaScript: the radios, the menu and Save still choose the look", async ({ browser }) => {
  const js = await browser.newContext();
  const page = await js.newPage();
  await signIn(page, freshEmail("look-nojs"));
  const id = await createList(page, { format: "Shopping", title: "No script" });
  const state = await js.storageState();
  const ctx = await browser.newContext({ javaScriptEnabled: false, storageState: state });
  const p = await ctx.newPage();
  await p.goto(`/app/lists/${id}/settings`);
  const look = p.locator("[data-section='theme-h']");
  // Without JavaScript the section starts closed; a details element still opens on a tap.
  if (!(await look.evaluate((d) => (d as HTMLDetailsElement).open))) await look.locator("> summary").click();
  await option(look, "Doc").click();
  // The chosen layout is marked from the radio itself, and the page says why the picture has not moved.
  expect(await option(look, "Doc").evaluate((el) => getComputedStyle(el).fontWeight)).toBe("600");
  // (Playwright turns scripts off without telling the parser, so the noscript note is checked as served, not as drawn.)
  expect(await look.locator("noscript").evaluate((n) => n.textContent)).toContain("The picture changes when you save.");
  await look.getByLabel("Occasion").selectOption({ label: "New Year" });
  await save(look).click();
  // Back on the Look row, which now names the new look.
  await expect(p).toHaveURL(new RegExp(`/app/lists/${id}/settings#theme-h$`));
  await expect(p.locator("[data-section='theme-h'] > summary")).toContainText("Doc · New Year");
  await p.goto(`/l/${id}`);
  await expect(p.locator(".themed").first()).toHaveAttribute("data-list-theme", "doc--new-year");
  await ctx.close();
  await js.close();
});

test("a tasks list offers only the layouts tasks lists have (no Sheet)", async ({ page }) => {
  await signIn(page, freshEmail("look-tasks"));
  const id = await createList(page, { format: "Tasks", title: "Tasks look" });
  const look = await openLook(page, id);
  await expect(look.locator("label.look-opt")).toHaveCount(7);
  await expect(look.getByRole("radio", { name: /^Sheet\b/ })).toHaveCount(0);
  await expect(look.getByRole("radio", { name: /^Checklist\b/ })).toBeChecked();
});

test("on a phone the whole picker is one screen: no sideways scroll, full-size targets, nothing scrolls inside @phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, freshEmail("look-phone"));
  const id = await createList(page, { format: "Shopping", title: "A list with quite a long title to wrap on a phone" });
  const look = await openLook(page, id);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  // Try a look: Save and the way back appear under the choices.
  await option(look, "Board").click();
  await expect(save(look)).toBeVisible();
  // From the top of the picture to the bottom of Save, with room to spare for a browser's own bars under the top bar.
  const top = (await look.locator(".look-stage").boundingBox())!.y;
  const btn = (await save(look).boundingBox())!;
  expect(btn.y + btn.height - top).toBeLessThanOrEqual(844 - 64 - 120);
  // Every control is at least 44px, and the eight layouts sit in two rows of four.
  for (const el of [...(await look.locator("label.look-opt").all()), look.getByLabel("Occasion"), save(look), look.getByRole("button", { name: /^Keep / })]) {
    const box = (await el.boundingBox())!;
    expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
  }
  const rows = new Set(await look.locator("label.look-opt").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top))));
  expect(rows.size).toBe(2);
  // Nothing in the section scrolls on its own, sideways or down.
  const scrollers = await look.evaluate((g) =>
    [...g.querySelectorAll("*")].filter((el) => { const s = getComputedStyle(el); return (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) || (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1); }).length);
  expect(scrollers).toBe(0);
  // Trying looks never moves the controls under the thumb.
  const before = (await save(look).boundingBox())!.y;
  for (const name of ["Sections", "Tracker", "Gallery"]) {
    await option(look, name).click();
    await expect(look.locator(".look-cap")).toContainText(name);
    expect(Math.abs((await save(look).boundingBox())!.y - before)).toBeLessThanOrEqual(1);
  }
});

test("Heat shows its gradient: the picture holds the run of bars from hot to cool, not one bar @phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, freshEmail("look-heat"));
  const id = await createList(page, { format: "Tasks", title: "Heat" });
  // Real wants are sentences: at full size one such bar filled the picture, all one colour.
  for (const t of [
    "Call the movers and get three written quotes before Friday",
    "Move the internet service to the new address and book the install",
    "Set up mail forwarding and tell the bank and the insurer",
    "Measure the new living room for the sofa and the bookshelves",
  ])
    await addItem(page, t);
  const look = await openLook(page, id);
  await option(look, "Heat").click();
  await expect(picture(look)).toHaveAttribute("data-list-theme", "heat");
  // The bars that lie whole inside the picture's frame, and their colours: at least three, running from one colour
  // to another. (At full size a single bar filled the picture.)
  const frame = (await look.locator(".look-stage .look-frame").boundingBox())!;
  const bars = await look.locator(".look-stage .ix-bar .ix-link").evaluateAll(
    (els, f) => els.filter((el) => { const r = el.getBoundingClientRect(); return r.top >= f.y && r.bottom <= f.y + f.height; }).map((el) => getComputedStyle(el).backgroundColor),
    frame,
  );
  const colours = [...new Set(bars)];
  expect(colours.length, `bar colours inside the picture: ${colours.join(" | ")}`).toBeGreaterThanOrEqual(3);
});

test("the picker still fits under a phone browser's own bars (390 by 664) @phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await signIn(page, freshEmail("look-short"));
  const id = await createList(page, { format: "Shopping", title: "Short screen" });
  const look = await openLook(page, id);
  await option(look, "Board").click();
  await expect(save(look)).toBeVisible();
  const top = (await look.locator(".look-stage").boundingBox())!.y;
  const btn = (await save(look).boundingBox())!;
  expect(btn.y + btn.height - top).toBeLessThanOrEqual(664 - 64);
});

for (const [name, viewport, colorScheme] of [
  ["a phone, dark", { width: 390, height: 844 }, "dark"],
  ["a desktop, light", { width: 1280, height: 900 }, "light"],
] as const) {
  test(`the Look section has no accessibility violations on ${name}, closed, open and with a look being tried`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport, colorScheme, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await signIn(page, freshEmail("look-axe"));
    const id = await createList(page, { format: "Shopping", title: "Axe" });
    const audit = async (state: string) => {
      const result = await new AxeBuilder({ page }).include("[data-section='theme-h']").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
      const summary = result.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);
      expect(summary, `${state}\n${summary.join("\n")}`).toEqual([]);
    };
    const look = await openLook(page, id);
    await audit("open");
    await option(look, "Heat").click();
    await look.getByLabel("Occasion").selectOption({ label: "Christmas" });
    await expect(look.locator(".look-cap")).toContainText("Preview, not saved");
    await audit("a look being tried");
    await save(look).click();
    await expect(savedNote(look)).toBeVisible();
    await audit("saved");
    await look.evaluate((d) => ((d as HTMLDetailsElement).open = false));
    await audit("closed");
    await ctx.close();
  });
}
