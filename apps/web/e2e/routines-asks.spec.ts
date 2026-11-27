import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * SPEC 20.7, 20.9, 20.14 items 5 and 7: a routine's History, and the two pages the "nobody has looked" email links to.
 * Runs before routines.spec.ts and leaves the Kitchen fixture as it found it.
 */

test("History folds open under a card: the newest runs, in plain words", async ({ page }) => {
  await signIn(page, "routines@example.com");
  await page.goto("/app/routines");
  const card = page.locator("#routine-rtn_kitchen");
  await card.locator("summary", { hasText: /^History/ }).click();
  const run = card.locator("li").filter({ hasText: "On schedule" }).first();
  await expect(run).toContainText("Done: searched 3 wants, 2 suggestions, 3 searches used");
  await expect(card.getByRole("button", { name: "Show older" })).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("History is a page of its own", async ({ page }) => {
    await signIn(page, "routines@example.com");
    await page.goto("/app/routines/rtn_kitchen/runs");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(page.locator("main")).toContainText("On schedule");
  });
});

test.describe("the email's links, signed out", () => {
  test("opening never acts; one button; afterwards it says what happened and offers the other choice", async ({ page, request }) => {
    const res = await page.goto("/routine-asks/ask_seed_kitchen?action=pause");
    expect(res?.headers()["x-robots-tag"]).toBe("noindex");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pause “Search the web for these wants”?");
    await expect(page.locator("main")).toContainText("Your routine “Search the web for these wants” on “Kitchen” found things nobody has looked at yet.");
    await expect(page.getByRole("button")).toHaveText(["Pause it"]);
    // Opening it changed nothing: the routine still runs.
    const view = await (await request.get("/routine-asks/ask_seed_kitchen?action=pause")).text();
    expect(view).not.toContain("Paused.");
    await page.getByRole("button", { name: "Pause it" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paused");
    await expect(page.getByRole("status")).toHaveText("It won't run until someone on the list resumes it.");
    // The other choice, and back again (the fixture is shared).
    await page.getByRole("button", { name: "Keep it running after all" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kept running");
    await expect(page.getByRole("status")).toHaveText("Its next round comes on its schedule.");
  });

  test("coming back to a used link: what was chosen, and the other choice", async ({ page }) => {
    await page.goto("/routine-asks/ask_seed_kitchen?action=pause");
    // The test above ended on "keep".
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kept running");
    await expect(page.getByRole("button")).toHaveText(["Pause it instead"]);
  });

  test("no action, or an unknown one: both buttons", async ({ page }) => {
    await page.goto("/routine-asks/ask_seed_garden?action=delete");
    await expect(page.getByRole("button")).toHaveText(["Keep it running", "Pause it"]);
  });

  test("an expired link says so", async ({ page }) => {
    const res = await page.goto("/routine-asks/nope?action=keep");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link has expired");
  });
});
