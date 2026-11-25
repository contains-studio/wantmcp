import { expect, test } from "@playwright/test";
import { freshEmail, signIn } from "./helpers";

test("the top bar has no appearance control; the page follows the device", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("header").getByRole("button", { name: /Appearance/ })).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(0, 0, 0)");
});

test("appearance is set on the account page, saved for this browser", async ({ page }) => {
  await signIn(page, freshEmail("appearance"));
  await page.goto("/app/account");
  const section = page.locator("section[aria-labelledby='appearance-h']");
  await expect(section.getByRole("radio", { name: "Match device" })).toBeChecked();
  await section.getByRole("radio", { name: "Dark" }).check();
  await section.getByRole("button", { name: "Save" }).click();
  await expect(section.getByText("Saved.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // A cookie, read on the server: the next page renders dark with no flash, signed in or out.
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/app/account");
  await section.getByRole("radio", { name: "Match device" }).check();
  await section.getByRole("button", { name: "Save" }).click();
  await expect(section.getByText("Saved.")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("a choice saved by the old toggle is still honoured", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "wm_theme", value: "light", url: baseURL! }]);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
