import { expect, test } from "@playwright/test";

/** The home page's "Share a list" section: right after the three kinds of list, one heading, nothing sideways. */
const section = (page: import("@playwright/test").Page) => page.locator("section", { has: page.locator("#share-h") });

test("Share a list follows Three kinds of list, with one heading", async ({ page }) => {
  await page.goto("/");
  const kinds = page.locator("section", { has: page.locator("#kinds-h") });
  await expect(section(page)).toBeVisible();
  // The very next section after the kinds.
  const next = await kinds.evaluate((el) => el.nextElementSibling?.querySelector("h2")?.textContent);
  expect(next).toBe("Share a list.");
  await expect(section(page).getByRole("heading")).toHaveCount(1);
  await expect(section(page).getByRole("heading", { level: 2, name: "Share a list." })).toBeVisible();
  // Pictures, not forms: the only control is one quiet link, and no second blue button.
  await expect(section(page).locator("a, button, input, summary")).toHaveCount(1);
  await expect(section(page).getByRole("link", { name: "How agents connect" })).toHaveAttribute("href", "/connect");
  await expect(section(page).locator(".btn-want")).toHaveCount(0);
});

test.describe("at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the home page does not scroll sideways @phone", async ({ page }) => {
    await page.goto("/");
    await section(page).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});
