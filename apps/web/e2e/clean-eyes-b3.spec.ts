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

test("Activity says what it holds", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app/activity");
  await expect(page.getByText("What agents found and posted on your lists")).toBeVisible();
});
