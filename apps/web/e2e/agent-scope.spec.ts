import { expect, test } from "@playwright/test";
import { DEMO, signIn } from "./helpers";

/** SPEC 22: an agent connected with "All my lists, including new ones". */
test("an all-lists agent says so; removing it here keeps the others, with a quieter way to disconnect it everywhere", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app/lists/lst_desk2026/settings");
  const agents = page.locator("#keys-h").locator("xpath=ancestor::details[1]");
  if (!(await agents.evaluate((d: HTMLDetailsElement) => d.open))) await page.locator("#keys-h").click();
  const claude = agents.locator(".access-row", { hasText: "Claude" }).first();
  await expect(claude).toContainText(/Signed in through its app · All your lists · (active|never)/);
  // A list-only agent doesn't say it.
  await expect(agents.locator(".access-row", { hasText: "Codex" })).not.toContainText("All your lists");
  await claude.locator("details.row-remove > summary").click();
  await expect(claude).toContainText("Remove Claude from this list? It keeps your other lists.");
  // Remove here: this list only.
  const here = claude.locator("form.row-remove-body");
  await expect(here.locator('input[name="scope"]')).toHaveValue("list");
  // The quieter choice: everywhere (no scope), its own form.
  const everywhere = claude.locator("form.row-remove-also");
  await expect(everywhere.getByRole("button", { name: "Disconnect it from all your lists" })).toBeVisible();
  await expect(everywhere.locator('input[name="scope"]')).toHaveCount(0);
  await expect(everywhere.locator('input[name="agent_id"]')).toHaveValue("agt_claude");
  // Someone else's agent (ChatGPT is the owner's; Muse is heron's) gets no "everywhere" choice.
  const muse = agents.locator(".access-row", { hasText: "Muse" }).first();
  await muse.locator("details.row-remove > summary").click();
  await expect(muse.locator("form.row-remove-also")).toHaveCount(0);
});
