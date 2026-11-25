import { expect, test, type Page } from "@playwright/test";
import { createList, DEMO, freshEmail, signIn } from "./helpers";

// Each test signs in as a fresh person and works on its own lists; seeded lists are only read.

const OFFERED = ["black-friday", "cyber-monday", "chanukah", "christmas", "kwanzaa", "new-year", "birthday"];

/** Sets a list's look the way list settings does (the page must already be on this site). */
async function setLook(page: Page, id: string, look: string) {
  const res = await page.request.post(`/app/lists/${id}/settings`, { form: { intent: "theme", theme: look }, headers: { origin: new URL(page.url()).origin } });
  expect(res.ok(), look).toBe(true);
}

test("a done task's box is visibly ticked in every layout, light and dark", async ({ page }) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const look of ["today", "sections", "today--christmas", "today--chanukah", "sections--kwanzaa"]) {
      await page.goto(`/themes/${look}?format=tasks`);
      const box = page.locator('.check-toggle.is-checked, .check-toggle[aria-checked="true"]').first();
      await expect(box, `${look} ${scheme}`).toBeAttached();
      const { bg, fg, card } = await box.evaluate((el) => {
        const s = getComputedStyle(el);
        const probe = document.createElement("span");
        probe.style.color = getComputedStyle(el.closest(".themed")!).getPropertyValue("--card");
        document.body.append(probe);
        const card = getComputedStyle(probe).color;
        probe.remove();
        return { bg: s.backgroundColor, fg: s.color, card };
      });
      expect(bg, `${look} ${scheme}: filled`).not.toBe(card);
      expect(fg, `${look} ${scheme}: tick visible`).not.toBe(bg);
    }
  }
});

// One test per layout, each on its own list, so no test leans on another's leftovers or nears the timeout.
const LAYOUTS = [
  ["sheet", "Shopping"],
  ["today", "Tasks"],
  ["sections", "Tasks"],
  ["board", "Tasks"],
  ["heat", "Tasks"],
  ["tracker", "Tasks"],
  ["doc", "Research"],
] as const;

for (const [tpl, format] of LAYOUTS) {
  test(`occasion art never covers the title or the header controls: ${tpl}`, async ({ page }) => {
    await signIn(page, freshEmail(`art-${tpl}`));
    const id = await createList(page, { format, title: `Art check ${tpl}` });
    for (const occ of OFFERED) {
      await setLook(page, id, `${tpl}--${occ}`);
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/l/${id}`);
        const problems = await page.evaluate(() => {
          const out: string[] = [];
          // The art is drawn in its own band: never positioned over the header's content.
          for (const el of document.querySelectorAll(".list-hero, .list-hero > .wrap")) {
            for (const ps of ["::before", "::after"]) {
              const st = getComputedStyle(el, ps);
              if (st.content !== "none" && st.position === "absolute") out.push(`${el.className.toString().slice(0, 30)}${ps} is absolute`);
            }
          }
          const hero = document.querySelector(".list-hero") as HTMLElement;
          if (getComputedStyle(hero).backgroundImage.includes("url(")) out.push("art painted behind the header");
          const controls = document.querySelectorAll<HTMLElement>(".list-actions a, .list-actions button, .list-title-text");
          if (!controls.length) out.push("no header controls found");
          for (const el of controls) {
            el.scrollIntoView({ block: "center" });
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (!hit || !(el === hit || el.contains(hit))) out.push(`${el.className || el.tagName} covered`);
          }
          return out;
        });
        expect(problems, `${tpl}--${occ} at ${width}`).toEqual([]);
      }
    }
  });
}

test("a bad invite link says so before anyone signs in", async ({ page }) => {
  await page.goto("/invite/inv_not_a_real_token");
  await expect(page.getByRole("heading", { name: "This invite link doesn't work" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in to accept/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start a list" }).last()).toBeVisible();
});

test("price history plots when prices were checked, and says how much they changed", async ({ page }) => {
  await page.goto("/l/lst_desk2026");
  // Product rows open in place: open them all, then read the first chart.
  for (const s of await page.locator("details.row-toggle summary:visible").all()) await s.click();
  const caption = page.locator(".price-sparkline figcaption").first();
  await expect(caption).toBeVisible();
  await expect(caption).not.toContainText("$0");
  await expect(caption).toContainText(/ on /);
});

test("a list nobody has worked on says so once, and empty wants stay compact", async ({ page }) => {
  await signIn(page, freshEmail("quiet"));
  const id = await createList(page, { format: "Shopping", title: "Quiet list" });
  for (const w of ["A desk lamp", "A footrest", "A monitor arm"]) {
    await page.locator("#new-item").fill(w);
    await page.getByRole("button", { name: "Add want" }).click();
    await expect(page.locator(".item-section", { hasText: w })).toBeVisible();
    const skip = page.getByRole("button", { name: "Skip" });
    if (await skip.isVisible()) await skip.click();
  }
  await page.goto(`/l/${id}`);
  // The one next step comes first; once dismissed, one line for the whole list.
  await expect(page.getByRole("heading", { name: "Give this list to your agent" })).toBeVisible();
  await expect(page.locator(".list-nothing-yet")).toHaveCount(0);
  await page.getByRole("button", { name: /Not now/ }).click();
  await expect(page.getByRole("heading", { name: "Give this list to your agent" })).toHaveCount(0);
  await expect(page.locator(".list-nothing-yet")).toHaveCount(1);
  await expect(page.locator(".entries-empty")).toHaveCount(0);
  // No comment box per want until there are comments: it's in each want's menu.
  await expect(page.locator(".item-comments")).toHaveCount(0);
});

test("people see 'you', not their own handle", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_desk2026");
  // The keyboard was bought by the demo owner.
  // A bought want is one line: "Bought · $89.00 at Example Keys · you, Tuesday".
  await expect(page.locator("details.done-row summary", { hasText: "Quiet mechanical keyboard" })).toContainText(/· you\b/);
  // Visible text only (the page's own data script carries handles for its components).
  await expect(page.locator("main").getByText("quiet-otter-4821", { exact: false }).filter({ hasNotText: "/" })).toHaveCount(0);
});

test("a gift list from the home page is private", async ({ page }) => {
  await signIn(page, freshEmail("giftprivate"));
  await page.goto("/");
  await page.locator("section[aria-labelledby=season-h]").getByRole("button", { name: "Start a Christmas gift list" }).click();
  await expect(page).toHaveURL(/\/l\/[^/]+$/);
  await expect(page.locator(".list-meta")).toContainText("Private");
});
