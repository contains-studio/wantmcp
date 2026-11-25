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

test("home, signed out: the hero has one action, and the words to give an agent copy on a tap @phone", async ({ page, context, browserName }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) }).first();
  await expect(hero.getByRole("link", { name: "Start a list" })).toBeVisible();
  await expect(hero.getByRole("link")).toHaveCount(1);
  await expect(page.getByRole("main").getByRole("link", { name: "Connect an agent" })).toHaveCount(0);

  // The other way in, in the owner's words, right under the button.
  const words = "set up wantmcp.com for keeping track of the things I want";
  await expect(hero.getByText("Or just tell your agent:")).toBeVisible();
  const copy = hero.getByRole("button", { name: new RegExp(words) });
  await expect(copy).toBeVisible();
  await copy.click();
  await expect(hero.getByText("Copied. Now share with your agent.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(words);
});
