import { expect, test, type Page } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

/** Owner, 26 Nov 2026: "check list theme to have check boxes i can check off", and a photo pin board as a look. */

async function useLook(page: Page, id: string, template: string) {
  await page.goto(`/app/lists/${id}/settings#theme-h`);
  // Nothing to choose or save when the list already has this look (a tasks list starts as a Checklist).
  if (!(await page.locator(`input[name=template][value=${template}]`).isChecked())) {
    await page.locator(`label:has(input[name=template][value=${template}])`).first().click();
    await page.locator("#theme-h").locator("xpath=ancestor::details[1]").getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  }
  await page.goto(`/l/${id}`);
}

for (const [format, word] of [
  ["Shopping", "bought"],
  ["Tasks", "done"],
  ["Research", "answered"],
] as const) {
  test(`Checklist on a ${format.toLowerCase()} list: a box to check off, Undo right after, the Done group folds after three`, async ({ page }) => {
    await signIn(page, freshEmail(`check-${format}`));
    const id = await createList(page, { format, title: `${format} to check off` });
    for (const t of ["One", "Two", "Three", "Four", "Five"]) await addItem(page, t);
    await useLook(page, id, "today");
    const box = page.getByRole("checkbox", { name: `Mark “One” ${word}` });
    await expect(box).toHaveAttribute("aria-checked", "false");
    await box.click();
    // Checked off: below the open ones, struck through, and Undo is offered at once.
    const bar = page.getByRole("status").filter({ hasText: "“One”" });
    await expect(bar).toContainText("Undo");
    await expect(page.locator(".bought-group details.done-row", { hasText: "One" })).toBeVisible();
    await bar.getByRole("button", { name: /^Undo/ }).click();
    await expect(page.getByRole("checkbox", { name: `Mark “One” ${word}` })).toHaveAttribute("aria-checked", "false");
    // Four checked: three show, the fourth folds behind "Show 1 more".
    for (const t of ["One", "Two", "Three", "Four"]) {
      await page.getByRole("checkbox", { name: `Mark “${t}” ${word}` }).click();
      await expect(page.locator(".bought-group", { hasText: t })).toBeAttached();
    }
    await expect(page.locator(".done-more > summary")).toHaveText(`Show 1 more ${word}`);
    // A tick unticks: the done row's own box, beside its summary (never inside it), back to open.
    const done = page.locator(".done-row-wrap").first().getByRole("checkbox");
    await expect(done).toHaveAttribute("aria-checked", "true");
    const name = (await done.getAttribute("aria-label"))!;
    expect(name).toMatch(new RegExp(` not ${word}$`));
    expect(await done.evaluate((el) => !!el.closest("summary"))).toBe(false);
    await done.click();
    await expect(page.getByRole("checkbox", { name: name.replace(` not ${word}`, ` ${word}`) })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("status").filter({ hasText: "Undo" })).toHaveCount(0);
  });
}

test("Checklist: visitors on a public list see the state, with nothing to tap", async ({ page, browser }) => {
  await signIn(page, freshEmail("check-public"));
  const id = await createList(page, { format: "Shopping", title: "Public checklist", visibility: "Public" });
  await addItem(page, "A kettle");
  await useLook(page, id, "today");
  const visitor = await browser.newPage();
  await visitor.goto(`/l/${id}`);
  await expect(visitor.getByRole("heading", { name: "A kettle" })).toBeVisible();
  await expect(visitor.getByRole("checkbox")).toHaveCount(0);
  await visitor.close();
});

test.describe("Gallery", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("a pin board: photo cards at natural height, text cards without, two columns on a phone; a card opens its want", async ({ page }) => {
    await signIn(page, "tesla@example.com");
    await useLook(page, "lst_tesla", "gallery");
    // The seeded list is shared with other specs: back to Sheet afterwards, pass or fail.
    try {
    const grid = page.locator(".gal-grid");
    await expect(grid).toHaveCSS("column-count", "2");
    const cards = grid.locator(".gal-card");
    await expect(cards).toHaveCount(5);
    // Floor mats: the cheapest has no photo and one photo is broken, so the card falls through to one that loads.
    const mats = cards.filter({ hasText: "All-weather floor mats" });
    await expect(mats.locator("img")).toHaveAttribute("src", /mock-images/);
    // The sunshade has nothing found: a text card, no empty image box.
    const shade = cards.filter({ hasText: "A glass roof sunshade" });
    await expect(shade).toHaveClass(/is-text/);
    await expect(shade.locator("img")).toHaveCount(0);
    await mats.locator("a").click();
    await expect(page).toHaveURL(/#itm_ty_mats$/);
    await expect(page.locator("section#itm_ty_mats")).toBeVisible();
    } finally {
      await useLook(page, "lst_tesla", "sheet");
    }
  });

  test("tasks in the Gallery are text cards in the same grid", async ({ page }) => {
    await signIn(page, freshEmail("gal-tasks"));
    const id = await createList(page, { format: "Tasks", title: "Gallery tasks" });
    await addItem(page, "Book the van");
    await useLook(page, id, "gallery");
    await expect(page.locator(".gal-card.is-text")).toHaveCount(1);
  });
});

test("Gallery is offered with the other layouts, and its preview carries share tags", async ({ page }) => {
  await page.goto("/themes");
  await expect(page.getByText("Photo cards")).toBeVisible();
  await page.goto("/themes/gallery");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Gallery look/);
  await expect(page.locator(".gal-card").first()).toBeVisible();
});

test("every look preview ends in the same full-size start button: full width on a phone, on the tabs row on desktop", async ({ page }) => {
  for (const [slug, name] of [
    ["gallery", "Start a list with this look"],
    ["sheet--black-friday", "Start a Black Friday list"],
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/themes/${slug}`);
    const start = page.getByRole("link", { name, exact: true });
    const phone = (await start.boundingBox())!;
    expect(phone.height).toBeGreaterThanOrEqual(44);
    expect(phone.width).toBeGreaterThan(340);
    await page.setViewportSize({ width: 1280, height: 900 });
    const desk = (await start.boundingBox())!;
    const tabs = (await page.getByRole("navigation", { name: "Sample list format" }).boundingBox())!;
    expect(Math.abs(desk.y + desk.height / 2 - (tabs.y + tabs.height / 2))).toBeLessThan(6);
  }
});
