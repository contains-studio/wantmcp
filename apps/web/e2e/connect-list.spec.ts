import { expect, test } from "@playwright/test";
import { DEMO, freshEmail, signIn } from "./helpers";

test("signed in with lists: a select, preselected, and the prompt follows it", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/connect");
  const select = page.getByRole("combobox", { name: "Your list" });
  await expect(select).toBeVisible();
  expect(await select.evaluate((el) => el.tagName)).toBe("SELECT");
  expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(43);
  const prompt = page.getByRole("region", { name: "Prompt for your agent" });
  await expect(prompt).not.toContainText("[paste the link");
  // Opened from a list's settings: that list is chosen, server-rendered.
  await page.goto("/connect?list=lst_research");
  await expect(page.getByRole("combobox", { name: "Your list" })).toHaveValue("lst_research");
  await expect(page.getByRole("region", { name: "Prompt for your agent" })).toContainText("/l/lst_research");
  // Changing the select changes the prompt at once.
  await page.getByRole("combobox", { name: "Your list" }).selectOption("lst_tasks");
  await expect(page.getByRole("region", { name: "Prompt for your agent" })).toContainText("/l/lst_tasks");
  // Only lists shared with the person are marked "(shared)"; the demo owner owns all four.
  await expect(page.locator("option", { hasText: "(shared)" })).toHaveCount(0);
});

test("signed in without lists: no field, a way to start one", async ({ page }) => {
  await signIn(page, freshEmail("nolists"));
  await page.goto("/connect");
  await expect(page.getByRole("combobox", { name: "Your list" })).toHaveCount(0);
  await expect(page.getByLabel("Your list's link")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start a list" }).last()).toHaveAttribute("href", "/app");
  await expect(page.getByRole("region", { name: "Prompt for your agent" })).toContainText("[paste the link to your list here]");
});

test("signed out: the link field stays", async ({ page }) => {
  await page.goto("/connect");
  await expect(page.getByLabel("Your list's link")).toBeVisible();
});
