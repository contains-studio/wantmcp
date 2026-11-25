import { expect, test } from "@playwright/test";
import { freshEmail, signIn } from "./helpers";

// Pages from three different groups, all cleared for search.
const PAGES = [
  { slug: "black-friday-shopping-list", h1: "A Black Friday list with the price before the sale" },
  { slug: "literature-review-tracker", h1: "Track the open questions in your literature review" },
  { slug: "task-list-for-multiple-coding-agents", h1: "A shared task list for your coding agents" },
];

test("the /for index links to persona pages @phone", async ({ page }) => {
  await page.goto("/for");
  await expect(page.getByRole("heading", { level: 1, name: "Lists for every kind of job" })).toBeVisible();
  for (const p of PAGES) await expect(page.locator(`a[href="/for/${p.slug}"]`)).toBeVisible();
  // Pages held back with noindex are not linked yet.
  await expect(page.locator('a[href="/for/gift-registry-from-any-store"]')).toHaveCount(0);
});

for (const p of PAGES) {
  test(`/for/${p.slug} shows three sample lists`, async ({ page }) => {
    await page.goto(`/for/${p.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: p.h1 })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/for/${p.slug}$`));
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new RegExp(`/og/for/${p.slug}\\.png`));
    for (const name of ["Shopping list", "Task list", "Research list"]) {
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) })).toBeVisible();
    }
    // Real list components, each saying it is a sample.
    await expect(page.locator(".themed")).toHaveCount(3);
    await expect(page.getByText("Sample list: stores, prices and agents are illustrative.").first()).toBeVisible();
    // Read-only: no menus or forms from the list itself.
    await expect(page.locator(".themed .menu-trigger")).toHaveCount(0);
  });
}

test("a page held back from search says noindex", async ({ page }) => {
  await page.goto("/for/gift-registry-from-any-store");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("an unknown persona is a 404", async ({ page }) => {
  const res = await page.goto("/for/no-such-job");
  expect(res?.status()).toBe(404);
});

test("start with a sample list after signing in", async ({ page }) => {
  await signIn(page, freshEmail("persona"));
  await page.goto("/for/literature-review-tracker");
  await page.locator("#start-research").getByRole("button", { name: "Start with this list" }).click();
  await expect(page).toHaveURL(/\/l\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 2: open questions" })).toBeVisible();
  await expect(page.locator(".item-section")).toHaveCount(3);
});
