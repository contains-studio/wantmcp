import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * SPEC 20.9, 26.2 item 8: History says what started each run and how it went. Searching is exa_search's alone: every
 * other kind's run reads its state and the server's note, never "Searched 0, 0 suggestions". Seeded: one finished run
 * per built kind, as the server writes them.
 */
const RT = "routines@example.com";

const KINDS: Array<[kind: string, routine: string, started: string, note: string]> = [
  ["target_price", "rtn_seed_price", "After a change", "At your price: $189 at Best Buy (checked on the store's page)"],
  ["due_reminders", "rtn_garden_due", "On schedule", "Due in 7 days: “Trim the hedge before the frost”"],
  ["countdown", "rtn_ana_countdown", "On schedule", "28 days to Christmas: 1 want has nothing yet"],
  ["restock", "rtn_beans", "After a change", "Brought back “Whole coffee beans, 1kg” for you to confirm"],
  ["weekly_summary", "rtn_seed_weekly", "On schedule", "Summarised 2 lists"],
  ["agent_check", "rtn_seed_check", "On schedule", "Left Claude a note: 2 prices to re-check, 1 stuck want"],
  ["list_changes", "rtn_kitchen_url", "After a change", "Sent 1 change, answered in 41 ms."],
];

for (const [kind, routine, started, note] of KINDS) {
  test(`History of a ${kind} routine: what started it, "Done", its note, and nothing about searches`, async ({ page }) => {
    await signIn(page, RT);
    await page.goto(`/app/routines/${routine}/runs`);
    const run = page.locator("ol li").first();
    await expect(run).toContainText(started);
    await expect(run).toContainText("Done");
    await expect(run).toContainText(note);
    await expect(run).not.toContainText(/searched|searches|suggestions/i);
    await expect(run).not.toContainText(/\bok\b/);
  });
}

test("the fold on a card says the same as the page", async ({ page }) => {
  await signIn(page, RT);
  await page.goto("/app/lists/lst_rt_kitchen/settings#routines");
  const card = page.locator("#routine-rtn_kitchen_url");
  await card.locator("summary", { hasText: /^History/ }).click();
  const run = card.locator("ol li").first();
  await expect(run).toContainText("After a change");
  await expect(run).toContainText("Sent 1 change, answered in 41 ms.");
  await expect(run).not.toContainText(/searched|searches|suggestions|On schedule/i);
});

test("a web search's History still counts its searches", async ({ page }) => {
  await signIn(page, RT);
  await page.goto("/app/routines/rtn_kitchen/runs");
  await expect(page.locator("ol li").filter({ hasText: "On schedule" }).first()).toContainText("Done: searched 3 wants, 2 suggestions, 3 searches used");
});
