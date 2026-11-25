import { expect, test } from "@playwright/test";

let n = 0;
const token = (state: string) => `clm_e2e_${state}_${Date.now().toString(36)}${n++}`;

test.describe("the claim page shows the work", () => {
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });

  test("the first phone screen has a product and its price, and no deadline headline", async ({ page }) => {
    await page.goto(`/claim/${token("car")}`);
    await expect(page.getByRole("heading", { level: 1, name: "Car accessories for the new Outback" })).toBeVisible();
    await expect(page.getByText("Muse started a list for you")).toBeVisible();
    await expect(page.getByText("7 wants · 3 found")).toBeVisible();
    const first = await page.evaluate(() => {
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight;
      };
      const product = [...document.querySelectorAll("main a")].find((a) => /WeatherTech|Husky/.test(a.textContent ?? ""));
      const price = [...document.querySelectorAll("main .price")].find((p) => /\$\d/.test(p.textContent ?? ""));
      return { product: !!product && visible(product), price: !!price && visible(price) };
    });
    expect(first).toEqual({ product: true, price: true });
    await expect(page.getByText(/It is deleted in/)).toHaveCount(0);
    // Cheapest first under each want; the old price struck through; the retailer named.
    const mats = page.locator("li", { hasText: "All-weather floor mats" });
    await expect(mats.locator(".price").first()).toHaveText("$189.95");
    await expect(mats.locator(".price-was")).toHaveText("$259.99");
    await expect(mats.getByText("WeatherTech", { exact: true })).toBeVisible();
    // Wants with nothing say so.
    await expect(page.getByText("Nothing found yet")).toHaveCount(4);
    // One primary action, in reach at the bottom of the screen.
    const keep = page.getByRole("button", { name: "Keep this list" });
    await expect(keep).toHaveCount(1);
    expect((await keep.boundingBox())!.y + 44).toBeLessThanOrEqual(844);
  });

  test("tasks show their status and latest note; questions the start of the answer", async ({ page }) => {
    await page.goto(`/claim/${token("tasks")}`);
    await expect(page.locator("li", { hasText: "Book a moving van" })).toContainText("In progress · “Two quotes in: U-Haul $129");
    await expect(page.locator("li", { hasText: "Cancel the gym membership" })).toContainText("Done");
    await expect(page.getByText("3 tasks · 1 done")).toBeVisible();
    await page.goto(`/claim/${token("research")}`);
    await expect(page.locator("li", { hasText: "What would it cost to run per year?" })).toContainText("Answer: About $650 a year");
    await expect(page.locator("li", { hasText: "Which rebates apply" })).toContainText("Not answered yet");
  });

  test("a long title and 20 wants hold up, and nothing scrolls sideways", async ({ page }) => {
    await page.goto(`/claim/${token("long")}`);
    await expect(page.locator('ol[aria-label="What\'s on it"] > li')).toHaveCount(20);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole("button", { name: "Keep this list" })).toBeInViewport();
  });

  test("a hand-over link shows the same, from @handle", async ({ page }) => {
    await page.goto(`/claim/${token("handover")}`);
    await expect(page.getByText(/Kit made this list for you, from @tidy-wren-6402/)).toBeVisible();
    await expect(page.getByText(/Keep it and it becomes yours; they can keep working on it\./)).toBeVisible();
  });
});
