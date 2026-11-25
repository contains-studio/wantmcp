import { expect, test } from "@playwright/test";

/** The site header is one row: the mark, the name and the links share one centre line. */
test("header: the logo and the links sit on the same line @phone", async ({ page }) => {
  for (const path of ["/", "/connect", "/l/lst_desk2026"]) {
    await page.goto(path);
    const mids = await page.locator("header").first().evaluate((header) => {
      const mid = (r: DOMRect) => (r.top + r.bottom) / 2;
      const glyphs = (el: Element) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return mid(range.getBoundingClientRect());
      };
      const home = header.querySelector("a[aria-label^='The Want MCP']")!;
      return {
        bar: mid(header.querySelector(".wrap")!.getBoundingClientRect()),
        mark: mid(home.querySelector("svg")!.getBoundingClientRect()),
        name: glyphs(home.querySelector("span span")!),
        links: [...header.querySelectorAll("nav a")].map(glyphs),
      };
    });
    expect(mids.links.length, path).toBeGreaterThan(0);
    for (const y of [mids.mark, mids.name, ...mids.links]) expect(Math.abs(y - mids.bar), path).toBeLessThanOrEqual(1);
  }
});

test("home, signed out: the hero has one action, Start a list @phone", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) }).first();
  await expect(hero.getByRole("link", { name: "Start a list" })).toBeVisible();
  await expect(hero.getByRole("link")).toHaveCount(1);
  await expect(page.getByRole("main").getByRole("link", { name: "Connect an agent" })).toHaveCount(0);
});
