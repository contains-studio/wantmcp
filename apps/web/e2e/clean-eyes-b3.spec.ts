import { expect, test } from "@playwright/test";
import { createList, DEMO, freshEmail, signIn } from "./helpers";

/** Clean-eyes review, batch 3 (25 Nov 2026). */

test("a new list's agent card shows what the prompt carries: the list's link and the server", async ({ page }) => {
  await signIn(page, freshEmail("give-facts"));
  const id = await createList(page, { format: "Tasks", title: "Before we move" });
  const facts = page.locator(".give-agent .prompt-facts");
  await expect(facts).toContainText(`/l/${id}`);
  await expect(facts).toContainText("Server:");
});

test("Skills: a starter's text is an example, and Save waits for something written", async ({ page }) => {
  await signIn(page, freshEmail("skills-example"));
  await page.goto("/app/skills?new=gifts");
  await expect(page.getByLabel("Instructions")).toHaveValue("");
  await expect(page.getByLabel("Instructions")).toHaveAttribute("placeholder", /For example:/);
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  await page.getByLabel("Instructions").fill("Mom likes tea.");
  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
});

test("Account: the country guess is saved without asking; what agents should know lives in Skills", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "cf-ipcountry": "DE" });
  await signIn(page, freshEmail("guess"));
  await page.goto("/app/account");
  await expect(page.getByText("Save to keep them")).toHaveCount(0);
  // The local server's own location (or the header) is saved as the person's country, without a Save.
  await expect(page.getByLabel("Country")).toHaveValue(/^[A-Z]{2}$/);
  const saved = await page.getByLabel("Country").inputValue();
  await page.reload();
  await expect(page.getByLabel("Country")).toHaveValue(saved);
  await expect(page.getByLabel("For your agents")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Skills" }).first()).toBeVisible();
});

test("list settings: hand-over sits with Delete; a member shows as the email they were invited with", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app/lists/lst_desk2026/settings");
  await expect(page.locator("#sharing-h").locator("xpath=ancestor::section[1]").getByText("Hand this list to someone")).toHaveCount(0);
  await page.goto("/app/lists/lst_desk2026/settings#danger-h");
  await expect(page.getByRole("button", { name: "Make a hand-over link" })).toBeAttached();
  await expect(page.getByText("heron@example.com")).toBeAttached();
});

test("Activity: every kind of event in plain sentences, your own included, bursts folded, each linked to its want", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app/activity");
  await expect(page.getByText("Everything on your lists, newest first")).toBeVisible();
  const rows = page.locator("ol.card > li");
  // Questions, answers, comments and finds all appear, and the person's own actions say "You".
  await expect(rows.filter({ hasText: /asked: “/ }).first()).toBeVisible();
  await expect(rows.filter({ hasText: /^You answered “/ }).first()).toBeVisible();
  await expect(rows.filter({ hasText: /commented: “/ }).first()).toBeVisible();
  await expect(rows.filter({ hasText: / found .+ for \$/ }).first()).toBeVisible();
  // A row links to its want on the list.
  const link = rows.filter({ hasText: /asked: “/ }).first().locator("a[href*='/l/']").first();
  await expect(link).toHaveAttribute("href", /\/l\/[^#]+#itm_/);
  // A burst from one actor on one list is one row that opens to the rest.
  const burst = rows.filter({ has: page.locator("details") }).first();
  await expect(burst).toContainText(/ \d+ /);
  await burst.locator("summary").click();
  await expect(burst.locator("details ul > li").first()).toBeVisible();
  // The filter by list still works.
  await page.getByRole("navigation", { name: "Show activity for" }).getByRole("link", { name: "Moving day: things to sort" }).click();
  await expect(page).toHaveURL(/list=lst_tasks/);
  for (const t of await rows.allTextContents()) expect(t).not.toContain("Home office refresh");
});
