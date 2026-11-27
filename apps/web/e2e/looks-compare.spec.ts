import AxeBuilder from "@axe-core/playwright";
import { expect, test, webkit, type Page } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

/**
 * /themes/compare (branch looks-impeccable): the eight looks beside a redesign of each, and the redesigned set itself.
 * The current looks' own pages are covered by looks-unchanged.spec.ts.
 */
const LOOKS: Array<[slug: string, name: string, natural: string]> = [
  ["sheet", "Sheet", "shopping"],
  ["today", "Checklist", "tasks"],
  ["doc", "Doc", "research"],
  ["board", "Board", "tasks"],
  ["sections", "Sections", "tasks"],
  ["heat", "Heat", "tasks"],
  ["tracker", "Tracker", "tasks"],
  ["gallery", "Gallery", "shopping"],
];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/themes/compare renders every pair without sideways scroll @phone", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/themes/compare");
    await expect(page.getByRole("heading", { level: 1, name: "The looks, side by side" })).toBeVisible();
    await expect(page.locator(".cmp-pair")).toHaveCount(LOOKS.length);
    for (const [slug, name, natural] of LOOKS) {
      const pair = page.locator(`#look-${slug}`);
      await expect(pair.getByRole("heading", { level: 2, name })).toBeVisible();
      // What changed and why, and the verdict, are on the page under the pair.
      await expect(pair.locator(".cmp-caption")).not.toBeEmpty();
      await expect(pair.locator(".cmp-verdict")).toContainText(/is better|Even/);
      for (const [version, label, cls] of [
        ["current", "current", `tpl-${slug}`],
        ["next", "redesigned", `nx-${slug}`],
      ] as const) {
        const frame = pair.locator(`iframe[title="${name}, ${label}"]`);
        await frame.scrollIntoViewIfNeeded();
        await expect(frame).toHaveAttribute("src", new RegExp(`^/themes/compare/frame/${version}/${slug}\\?format=${natural}$`));
        // The frame holds the look itself: the same list, in that version's own classes, nothing wider than a phone.
        const inner = frame.contentFrame();
        const look = inner.locator(".themed");
        await expect(look).toBeVisible();
        await expect(look).toHaveClass(new RegExp(`(^| )${cls}( |$)`));
        await expect(inner.locator("h1")).toBeVisible();
        expect(await inner.locator("html").evaluate((el) => el.scrollWidth - el.clientWidth), `${name}, ${label}: sideways scroll inside the frame`).toBeLessThanOrEqual(0);
        // On a 390px screen the two stack and each fits the screen's width.
        const box = (await frame.locator("xpath=..").boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390);
      }
      expect(await sideways(page), `${name}: the page scrolls sideways`).toBeLessThanOrEqual(0);
    }
  });

  test("the same holds for desktop-width frames, an occasion and dark @phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/themes/compare?format=shopping&mode=dark&width=desktop&occasion=black-friday");
    const first = page.locator("#look-board iframe").first();
    await first.scrollIntoViewIfNeeded();
    await expect(first).toHaveAttribute("src", "/themes/compare/frame/current/board--black-friday?format=shopping&mode=dark");
    await expect(first.contentFrame().locator(".themed")).toBeVisible();
    // A 1280px page drawn in a phone-wide frame: scaled, never wider than the screen.
    const box = (await first.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(390);
    expect(await first.contentFrame().locator("html").evaluate((el) => el.clientWidth)).toBe(1280);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test("the controls switch both frames at once, without JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto("/themes/compare");
  const frames = page.locator("#look-doc iframe");
  await expect(frames).toHaveCount(2);
  const controls = page.getByRole("navigation", { name: "What the frames show" });

  await controls.getByRole("link", { name: "Tasks" }).click();
  await expect(page).toHaveURL(/format=tasks/);
  for (const i of [0, 1]) await expect(frames.nth(i)).toHaveAttribute("src", /format=tasks/);
  await expect(controls.getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "true");

  await controls.getByRole("link", { name: "Dark" }).click();
  for (const i of [0, 1]) {
    await expect(frames.nth(i)).toHaveAttribute("src", /format=tasks&mode=dark/);
    // The frame is dark although the device is light, and only the frame: the page around it follows the device.
    await expect(frames.nth(i).contentFrame().locator("html")).toHaveAttribute("data-theme", "dark");
  }
  expect(await page.locator("html").getAttribute("data-theme")).toBeNull();

  await controls.getByRole("link", { name: "Desktop" }).click();
  await expect(page.locator("#look-doc .cmp-frames")).toHaveClass(/is-desktop/);
  expect(await frames.first().contentFrame().locator("html").evaluate((el) => el.clientWidth)).toBe(1280);

  await controls.getByLabel("Occasion").selectOption("christmas");
  await controls.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/occasion=christmas/);
  for (const i of [0, 1]) await expect(frames.nth(i)).toHaveAttribute("src", /\/doc--christmas\?format=tasks&mode=dark/);
  await ctx.close();
});

test("the compare page is not indexed, not linked and not in the sitemap; only its frames may be framed", async ({ request }) => {
  const page = await request.get("/themes/compare");
  expect(page.headers()["x-robots-tag"]).toBe("noindex");
  expect(await page.text()).toContain('<meta name="robots" content="noindex"/>');
  expect(page.headers()["x-frame-options"]).toBe("DENY");
  for (const path of ["/", "/themes", "/sitemap.xml", "/robots.txt", "/llms.txt"]) {
    expect(await (await request.get(path)).text(), `${path} links to the compare page`).not.toContain("themes/compare");
  }
  const frame = await request.get("/themes/compare/frame/next/sheet");
  expect(frame.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(frame.headers()["x-robots-tag"]).toBe("noindex");
  // Every other page still refuses to be framed, and a forced appearance is the frames' alone.
  for (const path of ["/themes/sheet?mode=dark", "/themes?mode=dark", "/?mode=dark"]) {
    const res = await request.get(path);
    expect(res.headers()["x-frame-options"], path).toBe("DENY");
    expect(await res.text(), path).not.toContain('data-theme="dark"');
  }
  expect((await request.get("/themes/compare/frame/other/sheet")).status()).toBe(404);
  expect((await request.get("/themes/compare/frame/next/not-a-look")).status()).toBe(404);
});

test("the compare page and every redesigned look have no accessibility violations, light and dark", async ({ page }) => {
  test.setTimeout(180_000);
  const audit = async (path: string) => {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = result.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help} (${v.nodes[0]?.target.join(" ")})`);
    expect(summary, `${path}\n${summary.join("\n")}`).toEqual([]);
  };
  for (const mode of ["light", "dark"]) {
    for (const [slug, , natural] of LOOKS) await audit(`/themes/compare/frame/next/${slug}?format=${natural}&mode=${mode}`);
    // Every look with a kind of list that is not its own, and dressed for an occasion.
    await audit(`/themes/compare/frame/next/sheet?format=research&mode=${mode}`);
    await audit(`/themes/compare/frame/next/today?format=shopping&mode=${mode}`);
    await audit(`/themes/compare/frame/next/board--christmas?format=shopping&mode=${mode}`);
    await audit(`/themes/compare/frame/next/heat--black-friday?format=tasks&mode=${mode}`);
  }
  // The page itself, frames included (axe looks inside same-site frames once they have loaded).
  await page.goto("/themes/compare?mode=dark");
  for (const f of await page.locator("iframe").all()) {
    await f.scrollIntoViewIfNeeded();
    await expect(f.contentFrame().locator(".themed")).toBeVisible();
  }
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help} (${v.nodes[0]?.target.join(" ")})`)).toEqual([]);
});

test("the redesigned looks render without JavaScript, with every trust detail of the current Sheet", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const words = async (version: string) => {
    await page.goto(`/themes/compare/frame/${version}/sheet?format=shopping`);
    return (await page.locator(".themed").innerText()).replace(/\s+/g, " ");
  };
  const next = await words("next");
  // Who found it, when, where the price was seen, the lowest marker, and whole product and store names.
  for (const t of ["Muse", "checked 3 hr. ago", "checked on the store's page", "Lowest", "Brightline 65\" QLED 4K", "Harbor Electronics", "Code HOLIDAY25", "$649.99"]) expect(next).toContain(t);
  // The same words as the current look: the redesign restyles, it does not cut.
  expect(next).toBe(await words("current"));
  for (const [slug, , natural] of LOOKS) {
    await page.goto(`/themes/compare/frame/next/${slug}?format=${natural}`);
    await expect(page.locator(`.themed.nx-${slug}`)).toBeVisible();
    await expect(page.locator(`link[rel="stylesheet"][href^="/theme-css/next/${slug}.css"]`)).toHaveCount(1);
    // No name is cut: nothing in the look is clipped with an ellipsis or clamped.
    const cut = await page.evaluate(() =>
      [...document.querySelectorAll(".themed :is(.sheet-title, .sheet-retailer, .gal-title, .gal-store, .ix-title, .item-title, .entry-card h3, .entry-card p)")].filter((el) => {
        const cs = getComputedStyle(el);
        return (cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none") && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight + 1);
      }).length,
    );
    expect(cut, `${slug}: names cut`).toBe(0);
  }
  await ctx.close();
});

test("?look=next shows a real list in the redesigned set; the redesigned Checklist ticks and unticks", async ({ page }) => {
  await signIn(page, freshEmail("next-check"));
  const id = await createList(page, { format: "Tasks", title: "Tasks to check off" });
  for (const t of ["One", "Two"]) await addItem(page, t);
  // Without the flag: the current Checklist, exactly as before.
  await expect(page.locator(".themed")).toHaveClass(/(^| )tpl-today( |$)/);
  await expect(page.locator('link[href*="/theme-css/next/"]')).toHaveCount(0);

  await page.goto(`/l/${id}?look=next`);
  await expect(page.locator(".themed")).toHaveClass(/(^| )nx-today( |$)/);
  await expect(page.locator(".themed")).not.toHaveClass(/tpl-today/);
  const box = page.getByRole("checkbox", { name: "Mark “One” done" });
  await expect(box).toHaveAttribute("aria-checked", "false");
  // A real control with a full touch target around the drawn circle.
  const hit = await box.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const before = getComputedStyle(el, "::before");
    return { drawn: r.width, target: Math.max(r.width, parseFloat(before.width)), radius: getComputedStyle(el).borderRadius };
  });
  expect(hit.drawn).toBe(24);
  expect(hit.target).toBeGreaterThanOrEqual(44);
  await box.click();
  const done = page.locator(".done-row-wrap").getByRole("checkbox", { name: "Mark “One” not done" });
  await expect(done).toHaveAttribute("aria-checked", "true");
  await expect(page).toHaveURL(/look=next/);
  await done.click();
  await expect(page.getByRole("checkbox", { name: "Mark “One” done" })).toHaveAttribute("aria-checked", "false");
});

/**
 * A title must keep most of its row. (The redesigned Sections once kept the wide table's columns on a phone, which left
 * each title about 50px, one word or part of a word per line.) For every redesigned look and kind of list at 390px: each
 * item's title, in whichever shape the look gives an item (a row, a card, a bar, a section), is at least 60% as wide as
 * that item.
 */
const KINDS = ["shopping", "tasks", "research"];
function narrowTitles() {
  const SHAPES: Array<[title: string, item: string]> = [
    [".ix-row .ix-title", ".ix-row"],
    [".ix-card .ix-title", ".ix-card"],
    [".ix-bar .ix-title", ".ix-bar"],
    [".gal-card .gal-title", ".gal-card"],
    [".item-section .item-title", ".item-section"],
  ];
  const narrow: string[] = [];
  let seen = 0;
  for (const [title, item] of SHAPES)
    for (const el of document.querySelectorAll(`.themed ${title}`)) {
      const t = el.getBoundingClientRect();
      const row = el.closest(item)?.getBoundingClientRect();
      // Not drawn (an item waiting in the closed panel) or kept only for screen readers (an opened done row).
      if (!row || t.width <= 1 || row.width <= 1) continue;
      seen++;
      const share = t.width / row.width;
      if (share < 0.6) narrow.push(`${title} “${(el.textContent ?? "").slice(0, 30)}” ${Math.round(t.width)}px of ${Math.round(row.width)}px`);
    }
  return { seen, narrow };
}
async function expectTitlesWide(page: Page, base = "") {
  for (const [slug, name] of LOOKS)
    for (const kind of KINDS) {
      await page.goto(`${base}/themes/compare/frame/next/${slug}?format=${kind}&mode=dark`);
      await expect(page.locator(".themed h1")).toBeVisible();
      const { seen, narrow } = await page.evaluate(narrowTitles);
      expect(seen, `${name}, ${kind}: titles found`).toBeGreaterThan(0);
      expect(narrow, `${name}, ${kind}: titles squeezed`).toEqual([]);
      expect(await sideways(page), `${name}, ${kind}: sideways scroll`).toBeLessThanOrEqual(0);
    }
}

test("every redesigned look gives a title at least 60% of its row at 390px", async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: "dark", reducedMotion: "reduce" });
  await expectTitlesWide(await ctx.newPage(), test.info().project.use.baseURL);
  await ctx.close();
});

test("the same in WebKit, as on an iPhone (dark, touch, Reduce Motion)", async ({}, info) => {
  test.setTimeout(180_000);
  // CI installs Chromium only. Where WebKit is installed (pnpm exec playwright install webkit) this runs; elsewhere it says so.
  // (The project runs installed Chrome through `channel`; WebKit has no channels, so it is cleared here.)
  let why = "";
  const engine = await webkit.launch({ channel: "" }).catch((e: Error) => ((why = e.message.split("\n")[0]), null));
  // Only a missing browser is a reason to skip; any other failure to start is a failure.
  if (!engine && !/Executable doesn't exist|playwright install/i.test(why)) throw new Error(`WebKit did not start: ${why}`);
  test.skip(!engine, "Playwright's WebKit is not installed here");
  const ctx = await engine!.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: "dark", reducedMotion: "reduce", extraHTTPHeaders: { "x-wantmcp-check": "1" } });
  await expectTitlesWide(await ctx.newPage(), info.project.use.baseURL);
  await engine!.close();
});
