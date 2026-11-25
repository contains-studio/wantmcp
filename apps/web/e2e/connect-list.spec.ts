import { expect, test } from "@playwright/test";
import { DEMO, freshEmail, signIn } from "./helpers";

test("signed in with lists: a select, preselected, and the prompt follows it", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/connect?app=claude-code");
  const select = page.getByRole("combobox", { name: "Your list" });
  await expect(select).toBeVisible();
  expect(await select.evaluate((el) => el.tagName)).toBe("SELECT");
  expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(43);
  const prompt = page.locator('[aria-label="Prompt for your agent"]');
  await expect(prompt).not.toContainText("[paste the link");
  // Opened from a list's settings: that list is chosen, server-rendered.
  await page.goto("/connect?app=claude-code&list=lst_research");
  await expect(page.getByRole("combobox", { name: "Your list" })).toHaveValue("lst_research");
  await expect(page.locator('[aria-label="Prompt for your agent"]')).toContainText("/l/lst_research");
  // Changing the select changes the prompt at once.
  await page.getByRole("combobox", { name: "Your list" }).selectOption("lst_tasks");
  await expect(page.locator('[aria-label="Prompt for your agent"]')).toContainText("/l/lst_tasks");
  // Only lists shared with the person are marked "(shared)"; the demo owner owns all four.
  await expect(page.locator("option", { hasText: "(shared)" })).toHaveCount(0);
});

test("signed in without lists: no field, a way to start one", async ({ page }) => {
  await signIn(page, freshEmail("nolists"));
  await page.goto("/connect?app=claude-code");
  await expect(page.getByRole("combobox", { name: "Your list" })).toHaveCount(0);
  await expect(page.getByLabel("Your list's link")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start a list" }).last()).toHaveAttribute("href", "/app");
  await expect(page.locator('[aria-label="Prompt for your agent"]')).toContainText("[paste the link to your list here]");
});

test("signed out: the link field stays", async ({ page }) => {
  await page.goto("/connect?app=claude-code");
  await expect(page.getByLabel("Your list's link")).toBeVisible();
});

test("/connect shows one app at a time: Claude by default, the one picked, or the one a link names", async ({ page }) => {
  await page.goto("/connect");
  await expect(page.getByRole("heading", { level: 2, name: "Claude", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "ChatGPT" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Pick your app" }).getByRole("link", { name: "ChatGPT" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "ChatGPT" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Claude", exact: true })).toHaveCount(0);
  // At most three steps, the rest behind one disclosure, and the next thing to say.
  await expect(page.locator("#steps ol > li")).toHaveCount(3);
  await expect(page.getByText("Details and troubleshooting")).toBeVisible();
  await expect(page.getByText("Then say:")).toBeVisible();
  // A link from a list names the app in the hash.
  await page.goto("/connect#grok-bot");
  await expect(page.getByRole("heading", { level: 2, name: "Grok Bot" })).toBeVisible();
});

test("a key app: signed out says sign in to fill it; signed in makes the key right there", async ({ page }) => {
  await page.goto("/connect?app=grok-bot");
  await expect(page.getByRole("link", { name: "Sign in to fill this in" })).toBeVisible();
  await signIn(page, DEMO);
  await page.goto("/connect?app=grok-bot&list=lst_research");
  await expect(page.getByText("wk_YOUR_WRITE_KEY")).toHaveCount(0);
  await page.getByRole("button", { name: "Create a key for Grok Bot" }).click();
  const prompt = page.getByRole("region", { name: "Prompt for Grok Bot, with your new key" });
  await expect(prompt).toContainText("Authorization: Bearer wk_");
  await expect(prompt).toContainText("/l/lst_research");
});
