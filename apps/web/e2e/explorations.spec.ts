import AxeBuilder from "@axe-core/playwright";
import { expect, test, webkit, type Page } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

/**
 * /explorations and its first interactive essay, /explorations/redesigning-the-looks; and the looks themselves after
 * that redesign (six adopted, Doc and Heat kept with small fixes).
 */
const ESSAY = "/explorations/redesigning-the-looks";
const FRAME = `${ESSAY}/frame`;
const CREDIT = "The redesign and the critique follow the method of Impeccable (Apache 2.0), a design skill for coding agents. None of its files are in this site.";
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
const ADOPTED = ["sheet", "today", "board", "sections", "tracker", "gallery"];
const KINDS = ["shopping", "tasks", "research"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: "dark" as const, reducedMotion: "reduce" as const };
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** The frame of an exhibit's side that is showing. */
const shown = (page: Page, id: string) => page.locator(`#ex-${id}-after`).locator("xpath=..").locator(".ex-side:visible iframe");

test.describe("the essay at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("first screen: what it is, and the credit in the owner's words @phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ESSAY);
    await expect(page.getByRole("heading", { level: 1, name: "Redesigning the looks" })).toBeVisible();
    await expect(page.locator(".essay-kicker")).toContainText("An interactive essay");
    const credit = page.locator(".essay-credit");
    await expect(credit).toHaveText(CREDIT);
    await expect(credit.getByRole("link", { name: "Impeccable" })).toHaveAttribute("href", "https://github.com/pbakaus/impeccable");
    // Directly under the title and standfirst, before the first section, whole within the first screen, at body size.
    const box = (await credit.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    expect(box.y).toBeGreaterThan((await page.locator(".essay-standfirst").boundingBox())!.y);
    expect(box.y).toBeLessThan((await page.getByRole("heading", { level: 2 }).first().boundingBox())!.y);
    expect(await credit.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    // Said once: not again, in these or other words, lower down.
    expect((await page.locator("main").innerText()).split("Apache 2.0").length - 1).toBe(1);
    // The bar that travels says what is showing; nothing scrolls sideways.
    await expect(page.locator(".vb-summary")).toContainText("Usual lists · Auto · Phone");
    // Something to use, not only to read, starts on the first screen: the eight tops and their Before / After switch.
    expect((await page.locator(".ex").first().boundingBox())!.y).toBeLessThan(844);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  test("every look has its words and its live pair, and nothing scrolls sideways @phone", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ESSAY);
    for (const [slug, name, natural] of LOOKS) {
      const section = page.locator(`#look-${slug}`);
      await expect(section.getByRole("heading", { level: 2 })).toContainText(name);
      await expect(section.locator(".essay-tag")).toHaveText(ADOPTED.includes(slug) ? "Adopted" : "Kept as it was");
      await expect(section.locator(".essay-try")).toContainText("Try it.");
      // After shows first; the switch brings Before, on the same list.
      const frame = shown(page, slug);
      await frame.scrollIntoViewIfNeeded();
      await expect(frame).toHaveAttribute("src", `${FRAME}/after/${slug}?format=${natural}`);
      await expect(frame.contentFrame().locator(`.themed.tpl-${slug}`)).toBeVisible();
      // An adopted look switches to Before; a kept one (the same page before and after) to what was proposed.
      const [other, version, cls] = ADOPTED.includes(slug) ? ["Before", "before", `was-${slug}`] : ["Proposed", "proposed", `prop-${slug}`];
      await section.locator(".ex-switch-label", { hasText: other }).click();
      await expect(shown(page, slug)).toHaveAttribute("src", `${FRAME}/${version}/${slug}?format=${natural}`);
      await expect(shown(page, slug).contentFrame().locator(`.themed.${cls}`)).toBeVisible();
      const box = (await shown(page, slug).locator("xpath=..").boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(await sideways(page), `${name}: the page scrolls sideways`).toBeLessThanOrEqual(0);
    }
  });

  test("a phone holds a few live pages at a time, and the page is light @phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const res = await page.goto(ESSAY);
    // The essay itself (its words and its frame addresses) and its stylesheet; the frames are separate pages.
    expect((await res!.body()).length).toBeLessThan(160_000);
    expect((await (await page.request.get("/theme-css/explorations/essay.css")).body()).length).toBeLessThan(20_000);
    await expect(page.locator("iframe")).toHaveCount(34);
    const live = () => page.locator("iframe[data-live]").count();
    // At the top, the frames near the screen are the eight tops (and at most the next example).
    await expect.poll(live).toBeLessThanOrEqual(9);
    // Far down, the headers have been let go and a look's own frame is live.
    await page.locator("#look-tracker .ex").scrollIntoViewIfNeeded();
    await expect(shown(page, "tracker")).toHaveAttribute("data-live", "");
    await expect(shown(page, "tracker").contentFrame().locator(".themed")).toBeVisible();
    await expect.poll(live).toBeLessThanOrEqual(3);
    await expect(page.locator("#ex-glance-after").locator("xpath=..").locator("iframe[data-live]")).toHaveCount(0);
  });
});

test("the reader can test the claims: the eight tops in view at once, and the bug as first drawn", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ESSAY);
  const glance = page.locator("#ex-glance-after").locator("xpath=..");
  await expect(glance.locator(".ex-side:visible .ex-caption")).toHaveText(LOOKS.map(([, name]) => name));
  await expect(glance.locator(".ex-side:visible iframe").first()).toHaveAttribute("src", `${FRAME}/after/sheet?format=tasks&head=1`);
  // All eight in view together, two across on a phone, each wide enough to tell apart; nothing moves sideways.
  const boxes = await glance.locator(".ex-side:visible .ex-device").evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.x, right: r.right, w: r.width })));
  expect(boxes).toHaveLength(8);
  for (const b of boxes) {
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(390);
    expect(b.w).toBeGreaterThanOrEqual(160);
  }
  expect(new Set(boxes.map((b) => Math.round(b.x))).size).toBe(2);
  await glance.locator(".ex-switch-label", { hasText: "Before" }).click();
  await expect(glance.locator(".ex-side:visible iframe").first()).toHaveAttribute("src", `${FRAME}/before/sheet?format=tasks&head=1`);
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  // Sections as first drawn: the title squeezed; fixed: most of its row.
  const share = async (version: string) => {
    await page.goto(`${FRAME}/${version}/sections?format=shopping&mode=dark`);
    return page.locator(".ix-row .ix-title").first().evaluate((el) => el.getBoundingClientRect().width / el.closest(".ix-row")!.getBoundingClientRect().width);
  };
  expect(await share("first-drawn")).toBeLessThan(0.25);
  expect(await share("after")).toBeGreaterThan(0.6);
});

test("the exhibits behave: a tick ticks, a product row opens, the board scrolls sideways; nothing is saved", async ({ page }) => {
  // 440 wide, so the 390px frame is drawn at full size: Playwright cannot aim a click inside a frame that CSS has scaled.
  await page.setViewportSize({ width: 440, height: 844 });
  await page.goto(ESSAY);
  const list = shown(page, "today");
  await list.scrollIntoViewIfNeeded();
  const frame = list.contentFrame();
  const box = frame.getByRole("checkbox", { name: "Mark “Reserve a parking spot for the moving truck” done" });
  await expect(box).toHaveAttribute("aria-checked", "false");
  await box.click();
  await expect(frame.locator(".done-row-wrap").getByRole("checkbox", { name: "Mark “Reserve a parking spot for the moving truck” not done" })).toHaveAttribute("aria-checked", "true");
  // Ticked there and back; the tick lives in the frame's own address, the essay's address is untouched.
  await frame.locator(".done-row-wrap").getByRole("checkbox", { name: /Reserve a parking spot.* not done/ }).click();
  await expect(frame.getByRole("checkbox", { name: "Mark “Reserve a parking spot for the moving truck” done" })).toHaveAttribute("aria-checked", "false");
  expect(new URL(page.url()).search).toBe("");
  await expect(page.locator("#look-today .ex-note")).toContainText("Nothing is saved");

  // A product row opens in place.
  await page.goto(`${FRAME}/after/sheet?format=shopping`);
  const row = page.locator(".sheet-group").first();
  await expect(row.locator(".sheet-detail")).toBeHidden();
  await row.locator("summary.row-toggle-btn").click();
  await expect(row.locator(".sheet-detail")).toBeVisible();
  // The board's columns move sideways inside the board.
  await page.goto(`${FRAME}/after/board?format=tasks`);
  const columns = page.locator(".ix-columns");
  expect(await columns.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await columns.evaluate((el) => el.scrollTo({ left: 200 }));
  expect(await columns.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  // Anything else in an exhibit answers that it is a sample.
  const res = await page.request.post(`${FRAME}/after/today?format=tasks`, { form: { intent: "add-item", text: "x" }, headers: { accept: "application/json" } });
  expect(await res.text()).toContain("This is a sample list. Nothing is saved.");
});

test("without JavaScript: the essay reads start to finish, After showing, Before a tap or a plain link away", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(ESSAY);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "The rule: its own at a glance",
    "How it was made and reviewed",
    "The bug the blind review missed",
    ...["Sheet", "Checklist", "Board", "Sections", "Tracker", "Gallery"].map((n) => `${n} Adopted`),
    ...["Doc", "Heat"].map((n) => `${n} Kept as it was`),
    "What we decided",
    "What we did not test",
  ]);
  const doc = page.locator("#look-doc");
  await expect(shown(page, "doc")).toHaveAttribute("src", `${FRAME}/after/doc?format=research`);
  // Plain links to each version on its own.
  for (const [name, version] of [["Before", "before"], ["Kept", "after"], ["Proposed", "proposed"]]) {
    await expect(doc.locator(".ex-note").getByRole("link", { name: new RegExp(`^${name}`) })).toHaveAttribute("href", `${FRAME}/${version}/doc?format=research`);
  }
  // The switch is radio buttons: it works with no script.
  await doc.locator(".ex-switch-label", { hasText: "Proposed" }).click();
  await expect(shown(page, "doc")).toHaveAttribute("src", `${FRAME}/proposed/doc?format=research`);
  // "Try it" sets the view it talks about with a plain link, and comes back to the same section.
  await expect(page.locator("#look-sheet .essay-try").getByRole("link", { name: "Show a shopping list at phone width" })).toHaveAttribute("href", `${ESSAY}?format=shopping#look-sheet`);

  // One set of controls changes every example at once, and the address keeps the view.
  await page.locator(".vb-summary").click();
  const bar = page.getByRole("navigation", { name: "What every example shows" });
  await bar.getByRole("link", { name: "Tasks" }).click();
  await expect(page).toHaveURL(/format=tasks/);
  await page.locator(".vb-summary").click();
  await bar.getByRole("link", { name: "Dark" }).click();
  await page.locator(".vb-summary").click();
  await bar.getByRole("link", { name: "Desktop" }).click();
  await page.locator(".vb-summary").click();
  await bar.locator("select:visible").selectOption("christmas");
  await bar.locator("button:visible", { hasText: "Show" }).click();
  await expect(page).toHaveURL(/format=tasks&mode=dark&width=desktop&occasion=christmas/);
  await expect(page.locator(".vb-summary")).toContainText("Tasks · Dark · Desktop · Christmas");
  for (const slug of ["sheet", "heat"]) {
    await expect(shown(page, slug)).toHaveAttribute("src", `${FRAME}/after/${slug}--christmas?format=tasks&mode=dark`);
    await expect(page.locator(`#look-${slug} .ex`)).toHaveClass(/is-desktop/);
  }
  // A frame is dark because the essay asked, although the device is light; the essay around it follows the device.
  await shown(page, "sheet").scrollIntoViewIfNeeded();
  await expect(shown(page, "sheet").contentFrame().locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await shown(page, "sheet").contentFrame().locator("html").evaluate((el) => el.clientWidth)).toBe(1280);
  expect(await page.locator("html").getAttribute("data-theme")).toBeNull();
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  // A tick without scripts: a form, a redirect, the list drawn with it flipped.
  await page.goto(`${FRAME}/after/today?format=tasks`);
  await page.getByRole("checkbox", { name: "Mark “Reserve a parking spot for the moving truck” done" }).click();
  await expect(page).toHaveURL(/flip=itm_sample_3/);
  await expect(page.locator(".done-row-wrap").getByRole("checkbox", { name: /Reserve a parking spot.* not done/ })).toBeVisible();
  await ctx.close();
});

test("with JavaScript the bar keeps the reader's place and closes after a choice", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ESSAY);
  await page.locator("#look-board").scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(2000);
  // Sticky: still in reach this far down.
  await expect(page.locator(".vb-summary")).toBeInViewport();
  await page.locator(".vb-summary").click();
  await page.getByRole("navigation", { name: "What every example shows" }).getByRole("link", { name: "Shopping" }).click();
  await expect(page).toHaveURL(/format=shopping/);
  await expect(page.locator(".vb-small")).not.toHaveAttribute("open", "");
  await expect(shown(page, "board")).toHaveAttribute("src", `${FRAME}/after/board?format=shopping`);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThan(400);
});

test("published: indexable, in the sitemap, linked from /themes and the footer, with a share image", async ({ request, page }) => {
  for (const path of ["/explorations", ESSAY]) {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect(res.headers()["x-robots-tag"]).toBeUndefined();
    const html = await res.text();
    expect(html).not.toContain('name="robots"');
    expect(html).toMatch(new RegExp(`<link rel="canonical" href="[^"]*${path}"`));
    expect(html).toContain('property="og:image"');
    expect(res.headers()["x-frame-options"]).toBe("DENY");
  }
  const essay = await (await request.get(ESSAY)).text();
  expect(essay).toContain("<title>Redesigning the looks: an interactive essay · The Want MCP</title>");
  expect(essay).toMatch(/name="description" content="An interactive essay: /);
  // A view a reader has set is the same essay: not indexed separately.
  expect(await (await request.get(`${ESSAY}?mode=dark`)).text()).toContain('<meta name="robots" content="noindex, follow"/>');
  const image = await request.get("/og/explorations/redesigning-the-looks.png");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/explorations</loc>");
  expect(sitemap).toContain(`${ESSAY}</loc>`);
  expect(sitemap).not.toContain("/frame/");
  expect(await (await request.get("/themes")).text()).toContain(`href="${ESSAY}"`);
  // The index: what explorations are, one entry, the same credit.
  await page.goto("/explorations");
  await expect(page.getByRole("heading", { level: 1, name: "Explorations" })).toBeVisible();
  await expect(page.locator(".expl-entry")).toHaveCount(1);
  await expect(page.locator(".expl-entry")).toContainText("An interactive essay");
  await expect(page.locator(".expl-entry")).toContainText(CREDIT);
  await page.locator(".expl-entry").getByRole("link", { name: "Redesigning the looks" }).click();
  await expect(page).toHaveURL(ESSAY);
  // The footer's small print, on every page; its row of five links stays one row on a 360px phone.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await expect(page.locator("footer").getByRole("link", { name: "Explorations" })).toHaveAttribute("href", "/explorations");
  const tops = await page.locator('footer nav[aria-label="Footer"] a').evaluateAll((els) => els.map((a) => Math.round(a.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test("the comparison's old address goes to the essay; only exhibit frames may be framed or forced dark", async ({ request }) => {
  for (const path of ["/themes/compare", "/themes/compare?format=tasks", "/themes/compare/frame/next/sheet"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(301);
    expect(res.headers()["location"]).toBe(ESSAY);
  }
  const frame = await request.get(`${FRAME}/after/sheet?mode=dark`);
  expect(frame.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(frame.headers()["x-robots-tag"]).toBe("noindex");
  expect(await frame.text()).toContain('data-theme="dark"');
  for (const path of ["/themes/sheet?mode=dark", "/themes?mode=dark", "/?mode=dark", `${ESSAY}?mode=dark`]) {
    const res = await request.get(path);
    expect(res.headers()["x-frame-options"], path).toBe("DENY");
    expect(await res.text(), path).not.toContain('data-theme="dark"');
  }
  for (const path of [`${FRAME}/other/sheet`, `${FRAME}/after/not-a-look`, `${FRAME}/proposed/sheet`, `${FRAME}/first-drawn/board`]) expect((await request.get(path)).status(), path).toBe(404);
});

test("the essay, the index and every exhibit have no accessibility violations, light and dark", async ({ page }) => {
  test.setTimeout(240_000);
  const violations = async () => (await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help} (${v.nodes[0]?.target.join(" ")})`);
  for (const mode of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: mode });
    await page.goto("/explorations");
    expect(await violations(), `/explorations ${mode}`).toEqual([]);
    for (const [slug, , natural] of LOOKS) {
      for (const version of ["before", "after"]) {
        await page.goto(`${FRAME}/${version}/${slug}?format=${natural}&mode=${mode}`);
        expect(await violations(), `${version} ${slug} ${mode}`).toEqual([]);
      }
    }
    for (const path of [`proposed/doc?format=research`, `proposed/heat?format=tasks`, `first-drawn/sections?format=shopping`, `after/sheet?format=research`, `after/today?format=shopping`, `after/board--christmas?format=shopping`, `after/heat--black-friday?format=tasks`, `after/gallery?format=tasks&head=1`]) {
      await page.goto(`${FRAME}/${path}&mode=${mode}`);
      expect(await violations(), `${path} ${mode}`).toEqual([]);
    }
    // The essay itself, with the frames that are live.
    await page.goto(`${ESSAY}?mode=${mode}`);
    await expect(page.locator("#ex-glance-after").locator("xpath=..").locator(".ex-side:visible iframe").first().contentFrame().locator(".themed")).toBeVisible();
    expect(await violations(), `essay ${mode}`).toEqual([]);
  }
});

/**
 * A title must keep most of its row. (The redrawn Sections once kept the wide table's columns on a phone, which left each
 * title about 50px, one word or part of a word per line.) For every look and kind of list at 390px: each item's title,
 * in whichever shape the look gives an item (a row, a card, a bar, a section), is at least 60% as wide as that item.
 */
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
      if (t.width / row.width < 0.6) narrow.push(`${title} “${(el.textContent ?? "").slice(0, 30)}” ${Math.round(t.width)}px of ${Math.round(row.width)}px`);
    }
  return { seen, narrow };
}
async function expectTitlesWide(page: Page, base = "") {
  // Heat is kept as it was, and on a phone it still sets a title beside its count (about 150px of a bar). The fix is
  // easy to see, so it waits for the owner; until then Heat is the one look this does not hold.
  for (const [slug, name] of LOOKS.filter(([s]) => s !== "heat"))
    for (const kind of KINDS) {
      await page.goto(`${base}/themes/${slug}?format=${kind}`);
      await expect(page.locator(".themed h1")).toBeVisible();
      const { seen, narrow } = await page.evaluate(narrowTitles);
      expect(seen, `${name}, ${kind}: titles found`).toBeGreaterThan(0);
      expect(narrow, `${name}, ${kind}: titles squeezed`).toEqual([]);
      expect(await sideways(page), `${name}, ${kind}: sideways scroll`).toBeLessThanOrEqual(0);
    }
}

test("every look but Heat gives a title at least 60% of its row at 390px", async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext(PHONE);
  await expectTitlesWide(await ctx.newPage(), test.info().project.use.baseURL);
  await ctx.close();
});

test("the same in WebKit, as on an iPhone (dark, touch, Reduce Motion)", async ({}, info) => {
  test.setTimeout(180_000);
  // CI installs Chromium only. Where WebKit is installed (pnpm exec playwright install webkit) this runs; elsewhere it
  // says so. (The project runs installed Chrome through `channel`; WebKit has no channels, so it is cleared here.)
  let why = "";
  const engine = await webkit.launch({ channel: "" }).catch((e: Error) => ((why = e.message.split("\n")[0]), null));
  // Only a missing browser is a reason to skip; any other failure to start is a failure.
  if (!engine && !/Executable doesn't exist|playwright install/i.test(why)) throw new Error(`WebKit did not start: ${why}`);
  test.skip(!engine, "Playwright's WebKit is not installed here");
  const ctx = await engine!.newContext({ ...PHONE, extraHTTPHeaders: { "x-wantmcp-check": "1" } });
  await expectTitlesWide(await ctx.newPage(), info.project.use.baseURL);
  await engine!.close();
});

test("the six adopted looks are the product; Doc and Heat are as they were; the old versions load only in exhibits", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  for (const [slug, , natural] of LOOKS) {
    await page.goto(`/themes/${slug}?format=${natural}`);
    const look = page.locator(`.themed.tpl-${slug}`);
    await expect(look).toBeVisible();
    const sheets = await page.locator('link[rel="stylesheet"][href^="/theme-css/"]').evaluateAll((ls) => ls.map((l) => l.getAttribute("href")!.split("?")[0]));
    // The shared rules and the look's own for the six; Doc and Heat keep their one stylesheet. Never an exhibit's.
    expect(sheets, slug).toEqual(ADOPTED.includes(slug) ? ["/theme-css/common.css", `/theme-css/${slug}.css`] : [`/theme-css/${slug}.css`]);
    expect(await look.evaluate((el) => el.classList.contains("t-common")), slug).toBe(ADOPTED.includes(slug));
    // The flag from the exploration is gone: it changes nothing.
    await page.goto(`/themes/${slug}?format=${natural}&look=next`);
    await expect(page.locator(`.themed.tpl-${slug}`)).toBeVisible();
    // No name is cut: nothing in the look is clipped with an ellipsis or clamped.
    const cut = await page.evaluate(() =>
      [...document.querySelectorAll(".themed :is(.sheet-title, .sheet-retailer, .gal-title, .gal-store, .ix-title, .item-title, .entry-card h3)")].filter((el) => {
        const cs = getComputedStyle(el);
        return (cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none") && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight + 1);
      }).length,
    );
    expect(cut, `${slug}: names cut`).toBe(0);
    // An exhibit of the old version: its own class and its frozen stylesheet.
    await page.goto(`${FRAME}/before/${slug}?format=${natural}`);
    await expect(page.locator(`.themed.was-${slug}`)).toBeVisible();
    await expect(page.locator(`link[href^="/theme-css/explorations/looks-before/${slug}.css"]`)).toHaveCount(slug === "gallery" ? 0 : 1);
    await expect(page.locator(`link[href^="/theme-css/${slug}.css"]`)).toHaveCount(0);
  }
  // Doc and Heat keep what makes each itself.
  await page.goto("/themes/doc?format=research");
  expect(await page.locator(".item-title").first().evaluate((el) => getComputedStyle(el, "::before").content)).toContain("counter(doc-item)");
  expect(await page.locator(".text-entry").first().evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe("3px");
  await page.goto("/themes/heat?format=tasks");
  await expect(page.locator(".themed.tpl-heat")).toHaveClass(/scheme-dark/);
  expect(await page.locator(".themed.tpl-heat").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(0, 0, 0)");
  // Trust details on the Sheet: who found it, when, where the price was seen, the lowest marker, whole names.
  await page.goto("/themes/sheet?format=shopping");
  const words = (await page.locator(".themed").innerText()).replace(/\s+/g, " ");
  for (const t of ["Muse", "checked 3 hr. ago", "checked on the store's page", "Lowest", "Brightline 65\" QLED 4K", "Harbor Electronics", "Code HOLIDAY25", "$649.99"]) expect(words).toContain(t);
  expect(await page.locator(".sheet-title .lowest").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(11);
  await ctx.close();
});

test("three faults in shared parts are fixed in every look", async ({ page }) => {
  // Gallery: a bought want says what was paid and where, not its cheapest offer.
  await page.goto("/themes/gallery?format=shopping");
  const bought = page.locator(".gal-card.is-done");
  await expect(bought).toContainText("$612");
  await expect(bought).toContainText("Northway Tire");
  await expect(bought).not.toContainText("Route 9 Auto");
  // A status and the line under it write a duration the same way.
  await page.goto("/themes/today?format=tasks");
  await expect(page.locator(".item-status .chip").first()).toHaveText(/In progress · Claude, 2 hr\.$/);
  await expect(page.locator(".entry-meta time").first()).toHaveText("2 hr. ago");
  // Where a price was seen: each dot is tied to the words before it, so no wrapped line starts with one.
  await page.goto("/themes/board?format=shopping");
  const line = await page.locator(".provenance").first().evaluate((el) => el.textContent ?? "");
  expect(line).toContain(" · ");
  expect(line).not.toMatch(/[^ ]· /);
});

test("the Checklist ticks and unticks on a real list", async ({ page }) => {
  await signIn(page, freshEmail("looks-check"));
  await createList(page, { format: "Tasks", title: "Tasks to check off" });
  for (const t of ["One", "Two"]) await addItem(page, t);
  await expect(page.locator(".themed")).toHaveClass(/(^| )tpl-today( |$)/);
  const box = page.getByRole("checkbox", { name: "Mark “One” done" });
  await expect(box).toHaveAttribute("aria-checked", "false");
  // A real control: a 24px circle with a full touch target around it.
  const hit = await box.evaluate((el) => ({ drawn: el.getBoundingClientRect().width, target: Math.max(el.getBoundingClientRect().width, parseFloat(getComputedStyle(el, "::before").width)), radius: getComputedStyle(el).borderRadius }));
  expect(hit.drawn).toBe(24);
  expect(hit.target).toBeGreaterThanOrEqual(44);
  expect(hit.radius).toBe("50%");
  await box.click();
  const done = page.locator(".done-row-wrap").getByRole("checkbox", { name: "Mark “One” not done" });
  await expect(done).toHaveAttribute("aria-checked", "true");
  await done.click();
  await expect(page.getByRole("checkbox", { name: "Mark “One” done" })).toHaveAttribute("aria-checked", "false");
});
