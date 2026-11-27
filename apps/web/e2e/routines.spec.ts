import { expect, test } from "@playwright/test";
import { createList, DEMO, freshEmail, signIn } from "./helpers";

/**
 * SPEC 20 (routines, step 1), the web's part. Ships dark: until the server says routines are visible for a person
 * (GET /me → routines.visible, 20.14), nothing about them shows anywhere. The mock shows them to emails with
 * "routines" in them; routines@example.com has three lists' worth of fixtures (mock/seed-routines.ts).
 */

const RT = "routines@example.com";

test.describe("dark: routines not launched", () => {
  test("no Routines tab, page, section or line anywhere; the site is today's", async ({ page }) => {
    await signIn(page, DEMO);
    await expect(page.getByRole("navigation", { name: "View" }).getByRole("link")).toHaveText(["Lists", "Activity", "Skills"]);
    const res = await page.goto("/app/routines");
    expect(res?.status()).toBe(404);
    await page.goto("/app/lists/lst_desk2026/settings");
    await expect(page.locator("#routines")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Settings sections" }).getByText("Routines")).toHaveCount(0);
    await page.goto("/l/lst_desk2026");
    await expect(page.locator("main")).not.toContainText(/routine/i);
    await page.goto("/app");
    await expect(page.locator("main")).not.toContainText(/routine/i);
    await page.goto("/app/account");
    await expect(page.locator("main")).not.toContainText(/routine|Exa key|Notifications|Time zone/i);
    await page.goto("/privacy");
    await expect(page.locator("main")).not.toContainText(/\broutines?\b|\bExa\b/i);
  });
});

test.describe.serial("on: the Routines tab and cards", () => {
  test("every routine, grouped by list: schedule, whose key, the server's status line", async ({ page }) => {
    await signIn(page, RT);
    await page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "Routines" }).click();
    await expect(page).toHaveURL(/\/app\/routines$/);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Kitchen", "Garden jobs", "Ana's birthday"]);
    const kitchen = page.locator("#routine-rtn_kitchen");
    await expect(kitchen).toContainText("Every Friday at 9:00 · your Exa key");
    await expect(kitchen).toContainText(/Last ran .*: searched 3 wants, 2 suggestions · Next: /);
    // An agent's name is shown as a name, marked.
    const garden = page.locator("#routine-rtn_garden");
    await expect(garden.getByRole("heading")).toHaveText("“Look for hedge trimming help nearby”");
    await expect(garden).toContainText("named by Claude");
    await expect(page.locator("#routine-rtn_ana")).toContainText("@sam's Exa key");
  });

  test("Run now, Pause, Resume, Rename and Change schedule, each in the server's words", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/routines");
    const card = page.locator("#routine-rtn_kitchen");
    await card.getByRole("button", { name: /^Run now/ }).click();
    await expect(card.getByRole("status")).toHaveText("Running now. Its results will be in its history shortly.");
    await expect(card).toContainText("2 left today");
    await card.getByRole("button", { name: /^Pause/ }).click();
    await expect(card).toContainText(/Paused by @bright-wren-2207 on/);
    await card.getByRole("button", { name: /^Resume/ }).click();
    await expect(card).toContainText(/Next: /);
    await card.getByText("Rename").click();
    await card.getByLabel("Name").fill("Look for kitchen things");
    await card.getByRole("button", { name: "Save", exact: true }).click();
    await expect(card.getByRole("heading")).toHaveText("Look for kitchen things");
    await card.getByText("Change schedule").click();
    await card.getByLabel("Period").selectOption("day");
    await card.getByRole("button", { name: "Save schedule" }).click();
    await expect(card).toContainText("Every day at 9:00 · your Exa key");
  });

  test("resuming someone else's stopped routine says it moves to your key, then does", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/lists/lst_rt_ana/settings#routines");
    const card = page.locator("#routine-rtn_ana");
    await expect(card).toContainText("Stopped: @sam's Exa account ran out of credit");
    await card.locator("summary", { hasText: /^Resume/ }).click();
    await expect(card).toContainText("This will run on your Exa key from now on.");
    await card.getByRole("button", { name: /^Resume on my key/ }).click();
    await expect(card).toContainText("Every day at 7:00 · your Exa key");
  });

  test("the list: one quiet line, routine suggestions labelled, Pause this routine, Search again", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/l/lst_rt_kitchen");
    await expect(page.locator(".list-hero, main").first()).toContainText(/ · your Exa key/);
    const sugg = page.getByRole("listitem", { name: "Suggestion: Stagg EKG electric pour-over kettle" });
    await expect(sugg).toContainText("Suggested by “");
    await expect(sugg).toContainText("(your routine) · from a search result, not checked on the store's page");
    await expect(page.getByRole("heading", { name: /^2 suggestions$/ })).toBeVisible();
    const knife = page.locator("section#itm_rt_knife");
    await expect(knife).toContainText("This routine stopped looking for this: you rejected its last two rounds.");
    await knife.getByRole("button", { name: /^Search again/ }).click();
    // The stop is lifted: the line goes.
    await expect(knife).not.toContainText("This routine stopped looking for this");
    await sugg.getByRole("button", { name: "Pause this routine" }).click();
    // Paused: the offer goes from every one of its suggestions.
    await expect(page.getByRole("button", { name: "Pause this routine" })).toHaveCount(0);
    await page.goto("/app/routines");
    await expect(page.locator("#routine-rtn_kitchen")).toContainText(/Paused by @bright-wren-2207/);
  });

  test("For you: what your agent changed, in its words, with Undo", async ({ page }) => {
    await signIn(page, RT);
    const forYou = page.getByRole("region", { name: "For you" });
    const line = forYou.getByRole("listitem").filter({ hasText: "Claude made “Look for hedge trimming help nearby” on Garden jobs" });
    await expect(line).toContainText("Claude reported you said: “look for someone to trim the hedge every other Monday”");
    await line.getByRole("button", { name: /^Undo/ }).click();
    await expect(line).toContainText("Undone.");
    await page.goto("/app/routines");
    await expect(page.locator("#routine-rtn_garden")).toHaveCount(0);
  });
});

test("New routine: the Exa notice before confirming; without a key, the way to add one instead", async ({ page }) => {
  await signIn(page, freshEmail("routines-new"));
  const id = await createList(page, { format: "Shopping", title: "Hall cupboard" });
  await page.goto(`/app/lists/${id}/settings#routines`);
  await page.locator("#routines").locator("xpath=ancestor::details[1]").locator("summary", { hasText: "New routine" }).click();
  await expect(page.getByText("The text of every open want on this list, including other people's, goes to your Exa account each time it runs.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Make this routine" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add your Exa key" })).toHaveAttribute("href", "/app/account#keys");
});

test("privacy: what saving an Exa key means, once routines are visible", async ({ page }) => {
  await signIn(page, freshEmail("routines-privacy"));
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Routines and your Exa key" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Encryption protects your key if our database is copied, not if our hosting account is taken over.");
});

test("paused for everyone: the page says so", async ({ page }) => {
  await signIn(page, freshEmail("routines-paused"));
  await page.goto("/app/routines");
  await expect(page.getByText("Routines are paused for everyone for now.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No routines yet" })).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("a card's forms work as plain forms (Rename)", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/lists/lst_rt_ana/settings");
    // Without JavaScript the sections start folded.
    await page.locator("summary", { has: page.locator("#routines") }).click();
    const card = page.locator("#routine-rtn_ana");
    await card.getByText("Rename").click();
    await card.getByLabel("Name").fill("Find bird books");
    await card.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/lists\/lst_rt_ana\/settings$/);
    // The section is folded again after the redirect (no JavaScript): read the name from the DOM.
    await expect(page.locator("#routine-rtn_ana h3")).toHaveText("Find bird books");
  });
});

// Last: it deletes a fixture the tests above use.
test("Delete asks once", async ({ page }) => {
  await signIn(page, RT);
  await page.goto("/app/routines");
  const card = page.locator("#routine-rtn_kitchen");
  await card.locator("summary", { hasText: /^Delete/ }).click();
  await card.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.locator("#routine-rtn_kitchen")).toHaveCount(0);
});
