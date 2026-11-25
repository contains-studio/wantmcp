import { expect, test } from "@playwright/test";
import { DEMO, freshEmail, signIn } from "./helpers";

test("a Sheet says only what a product has: a coupon shows on the product that has one", async ({ page }) => {
  // The Sheet's columns became one quiet line per product (owner review, 25 Nov); the principle stays: nothing empty.
  await page.goto("/l/lst_desk2026");
  await expect(page.locator("section#itm_monitor .sheet-meta", { hasText: /Code [A-Z0-9]/ })).toHaveCount(0);
  await expect(page.locator("#ent_chair1 .sheet-meta")).toContainText("Code BF15");
});

test("new list: both visibility radios are the same size, in 44px rows", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, freshEmail("radios"));
  await page.goto("/app/new");
  const priv = await page.getByRole("radio", { name: /^Private/ }).boundingBox();
  const pub = await page.getByRole("radio", { name: /^Public/ }).boundingBox();
  expect(Math.round(pub!.width)).toBe(Math.round(priv!.width));
  for (const name of [/^Private/, /^Public/]) {
    const row = await page.locator("label", { has: page.getByRole("radio", { name }) }).boundingBox();
    expect(row!.height).toBeGreaterThanOrEqual(44);
  }
});

test("phone: the list header drops the products count instead of wrapping it alone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, DEMO);
  await page.goto("/l/lst_desk2026");
  await expect(page.locator(".list-meta").getByText(/products?$/)).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator(".list-meta").getByText(/products?$/)).toBeVisible();
});

test("phone: the footer's links fit one row, with room to spare, at 390 and 360px", async ({ page }) => {
  await signIn(page, DEMO);
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/app");
    const links = page.getByRole("navigation", { name: "Footer" }).getByRole("link");
    const tops = await links.evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top)))]);
    expect(tops.length, `${width}px`).toBe(1);
    // Room for a wider system font than this machine's.
    const right = await links.evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().right)));
    expect(width - 16 - right, `${width}px spare`).toBeGreaterThanOrEqual(12);
  }
});

test("'Something else…' is one more pill among the options", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app");
  const group = page.locator("li", { hasText: "4K panel or 90W charging" }).getByRole("group");
  await expect(group.locator("summary", { hasText: "Something else…" })).toHaveClass(/\bbtn\b/);
});
