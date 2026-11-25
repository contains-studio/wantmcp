import { expect, test } from "@playwright/test";
import { freshEmail } from "./helpers";

test("the retired Cards layout: old links redirect, nothing offers it", async ({ page }) => {
  for (const [from, to] of [
    ["/themes/default", /\/themes$/],
    ["/themes?layout=default", /\/themes$/],
    ["/themes?layout=default&occasion=christmas", /\/themes\?layout=sheet&occasion=christmas$/],
    ["/themes/default--christmas", /\/themes\/sheet--christmas$/],
  ] as const) {
    await page.goto(from);
    await expect(page, from).toHaveURL(to);
  }
  await page.goto("/themes");
  await expect(page.getByText("Cards", { exact: true })).toHaveCount(0);
});

test("a season tile starts a gift list in its look, after sign-in", async ({ page }) => {
  await page.goto("/");
  const band = page.locator("section[aria-labelledby=season-h]");
  await expect(band.getByRole("heading", { name: "Have your agents help you get the right gifts this season." })).toBeVisible();
  await expect(band.locator(".look-tile")).toHaveCount(5);
  // Signed out: sign in first, then one tap to start.
  await band.getByRole("button", { name: "Start a Christmas gift list" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("season"));
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/start\?occasion=christmas/);
  await page.getByRole("button", { name: "Start the list" }).click();
  await expect(page).toHaveURL(/\/l\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Christmas gifts" })).toBeVisible();
  await expect(page.locator(".themed").first()).toHaveClass(/\bocc-christmas\b/);
});

test("occasions out of season are not offered and their previews redirect", async ({ page }) => {
  for (const from of ["/themes/sheet--valentines", "/themes/halloween", "/themes?layout=sheet&occasion=valentines"]) {
    await page.goto(from);
    await expect(page, from).toHaveURL(/\/themes(\?layout=sheet)?$/);
  }
  await page.goto("/themes");
  await expect(page.getByText("Valentine's Day")).toHaveCount(0);
  await expect(page.getByText("Halloween")).toHaveCount(0);
  await expect(page.getByText("New Year").first()).toBeVisible();
  await expect(page.getByText("Birthday").first()).toBeVisible();
});
