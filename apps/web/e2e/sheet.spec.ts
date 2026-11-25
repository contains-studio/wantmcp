import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * The Sheet, the default look of a shopping list (owner review, 25 Nov 2026): the want first, then what was found and
 * its price, then the rest. Photos when products have them; nothing empty when none do. Review fixture: lst_tesla.
 */
test.describe("Sheet", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "tesla@example.com");
  });

  test("a product with a photo shows it, small and fixed; one without, or with a broken link, shows the neutral tile", async ({ page }) => {
    await page.goto("/l/lst_tesla");
    const withPhoto = page.locator("#ent_ty_m3 .sheet-thumb img");
    await expect(withPhoto).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect(withPhoto).toHaveAttribute("loading", "lazy");
    const box = await page.locator("#ent_ty_m3 .sheet-thumb .product-img").boundingBox();
    expect(Math.round(box!.width)).toBe(Math.round(box!.height));
    // No photo: the tile, so rows line up.
    await expect(page.locator("#ent_ty_m2 .sheet-thumb .fallback")).toBeVisible();
    // A link that fails: the tile, never a broken-image icon.
    await expect(page.locator("#ent_ty_m4 .sheet-thumb .fallback")).toBeVisible();
    await expect(page.locator("#ent_ty_m4 .sheet-thumb img")).toHaveCount(0);
  });

  test("a want where no product has a photo has no photo column", async ({ page }) => {
    await page.goto("/l/lst_tesla");
    await expect(page.locator("#ent_ty_tyre1 .sheet-thumb")).toHaveCount(0);
    await expect(page.locator("#ent_ty_tyre1 .sheet-row")).not.toHaveClass(/has-photo/);
  });

  test("the product title is never smaller than its price, and price and retailer sit together", async ({ page }) => {
    await page.goto("/l/lst_tesla");
    const row = page.locator("#ent_ty_konig");
    const size = (sel: string) => row.locator(sel).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await size(".sheet-title")).toBeGreaterThanOrEqual(await size(".sheet-price .price"));
    await expect(row.locator(".sheet-price")).toContainText("$289.95");
    await expect(row.locator(".sheet-price")).toContainText("Amazon");
  });

  test("an agent's long notes take two lines until asked for", async ({ page }) => {
    await page.goto("/l/lst_tesla");
    const notes = page.locator("section#itm_ty_chains .item-details");
    const lineHeight = await notes.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect((await notes.boundingBox())!.height).toBeLessThanOrEqual(lineHeight * 2 + 2);
    await page.locator("section#itm_ty_chains").getByRole("button", { name: "Show all" }).click();
    expect((await notes.boundingBox())!.height).toBeGreaterThan(lineHeight * 2 + 2);
  });

  test("phone: six products, photos and all, fit one screen (rows no taller than before photos: 56px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/l/lst_tesla");
    const rows = page.locator("section#itm_ty_mats .sheet-row");
    await expect(rows).toHaveCount(6);
    for (const h of await rows.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeLessThanOrEqual(56);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(sideways).toBeLessThanOrEqual(1);
  });

  test("from four products a want can be sorted; with fewer there is no sort bar", async ({ page }) => {
    await page.goto("/l/lst_tesla");
    await expect(page.locator("section#itm_ty_chains").getByRole("group", { name: /^Sort products/ })).toHaveCount(0);
    const mats = page.locator("section#itm_ty_mats");
    const first = () => mats.locator(".sheet-group").first();
    await expect(first()).toHaveAttribute("id", "ent_ty_m6"); // cheapest first
    await mats.getByRole("button", { name: "Price" }).click();
    await expect(first()).toHaveAttribute("id", "ent_ty_m1"); // now dearest first
    await expect(mats.getByRole("button", { name: "Price" })).toHaveAttribute("aria-pressed", "true");
  });
});
