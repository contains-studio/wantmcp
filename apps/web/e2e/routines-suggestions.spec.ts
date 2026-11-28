import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * SPEC 20.14 items 11 to 13 (owner, 27 Nov 2026): the person's own search routine's suggestions are shown as things
 * (picture, title that opens, where from, "Exa search · your routine"); a stranger's stay text only. Guides are notes
 * beside the want's comments, never products and never in the suggestions panel. Runs before routines.spec.ts.
 */

test("one list, two treatments: the routine's as things, a stranger's as text", async ({ page }) => {
  await signIn(page, "routines@example.com");
  await page.goto("/l/lst_rt_kitchen");
  const mine = page.getByRole("listitem", { name: "Suggestion: Stagg EKG electric pour-over kettle" });
  const title = mine.getByRole("link", { name: /Stagg EKG electric pour-over kettle/ });
  await expect(title).toHaveAttribute("href", "https://www.amazon.com/dp/B077JBQZPX");
  await expect(title).toHaveAttribute("target", "_blank");
  await expect(title).toHaveAttribute("rel", "noopener noreferrer nofollow");
  await expect(mine.locator("img")).toHaveAttribute("src", "/mock-images/espresso.svg");
  await expect(mine).toContainText("From amazon.com");
  await expect(mine).toContainText("Exa search");
  await expect(mine).toContainText("your routine");
  await expect(mine).toContainText("not checked on the store's page");
  await expect(mine).not.toContainText("https://");
  await expect(mine).not.toContainText("Retailer");

  // No picture: the placeholder, the same shape. A long title still reads.
  const boots = page.getByRole("listitem", { name: /^Suggestion: Kids' Waterproof Insulated Snow Boots/ });
  await expect(boots.locator(".product-img .fallback")).toBeVisible();
  await expect(boots).toContainText("From target.com");

  // Grouped under their want once, each with its count; "For …" and "Pause this routine" are not repeated per card.
  const kettle = page.getByRole("region", { name: "“A good kettle”" });
  await expect(kettle).toContainText("2 suggestions");
  await expect(mine).not.toContainText("For “");
  await expect(mine.getByRole("button", { name: "Pause this routine" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause this routine" })).toHaveCount(1);

  // A guide is not a suggestion card; the panel counts it apart.
  await expect(page.getByRole("listitem", { name: /^Suggestion: The best electric kettles/ })).toHaveCount(0);
  await expect(page.locator("#sugg-h")).toHaveText("3 suggestions and 1 guide to look at");

  // A stranger's: text only, the link not clickable, the picture not loaded.
  const stranger = page.getByRole("listitem", { name: "Suggestion: Gooseneck kettle, 40% off today" });
  await expect(stranger).toContainText("Link (not opened)");
  await expect(stranger).toContainText("https://deals.example.net/kettle?aff=123");
  await expect(stranger.getByRole("link")).toHaveCount(0);
  await expect(stranger.locator("img")).toHaveCount(0);
  await expect(stranger).not.toContainText("Exa search");
});

test("guides are notes beside the comments: a writer sees the held one with Keep and Dismiss", async ({ page }) => {
  await signIn(page, "routines@example.com");
  await page.goto("/l/lst_rt_coffee");
  const want = page.locator("section#itm_rt_grinder");
  const notes = want.getByRole("list", { name: "Guides" });
  // Held: writers only, with Keep and Dismiss; no picture.
  const held = notes.getByRole("listitem").filter({ hasText: "Found a guide" });
  // (The title link carries "(new tab)" for screen readers.)
  await expect(held).toContainText(/Found a guide: “How to choose a burr grinder”( \(new tab\))? · homegrounds\.co/);
  await expect(held.getByRole("link", { name: /How to choose a burr grinder/ })).toHaveAttribute("rel", "noopener noreferrer nofollow");
  await expect(held.locator("img")).toHaveCount(0);
  // Kept: for everyone.
  await expect(notes).toContainText(/“The 6 Best Coffee Grinders of 2026”( \(new tab\))? · seriouseats\.com · kept by @sam/);
  // The comments are still there, and the guides are not products.
  await expect(want).toContainText("Something quiet for mornings.");
  await expect(want).toContainText("Both grind fine enough for espresso.");
  await expect(want.locator(".entry-card, .sheet-row").filter({ hasText: "Coffee Grinders of 2026" })).toHaveCount(0);
  // No suggestions panel for a guide alone; the count says it.
  await expect(page.locator("#sugg-h")).toHaveCount(0);
  await expect(page.getByText("1 guide to look at, under their wants.")).toBeVisible();
  // Keep it: now a kept note.
  await held.getByRole("button", { name: /^Keep/ }).click();
  await expect(notes).toContainText(/“How to choose a burr grinder”( \(new tab\))? · homegrounds\.co · kept by you/);
});

test("a visitor sees the kept guide and the comments, never a held one", async ({ page }) => {
  await page.goto("/l/lst_rt_coffee");
  const want = page.locator("section#itm_rt_grinder");
  await expect(want).toContainText(/“The 6 Best Coffee Grinders of 2026”( \(new tab\))? · seriouseats\.com · kept by @sam/);
  await expect(want).toContainText("Something quiet for mornings.");
  await expect(want).not.toContainText("Found a guide");
  await expect(want.getByRole("button", { name: /^Keep|^Dismiss/ })).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("Keep and Dismiss are forms", async ({ page }) => {
    await signIn(page, "routines@example.com");
    await page.goto("/l/lst_rt_kitchen");
    const held = page.locator("section#itm_rt_kettle").getByRole("listitem").filter({ hasText: "Found a guide" });
    await held.getByRole("button", { name: /^Dismiss/ }).click();
    await expect(page.locator("section#itm_rt_kettle")).not.toContainText("Found a guide");
  });
});

test("Reject these N clears one want's suggestions in one tap", async ({ page }) => {
  await signIn(page, "routines@example.com");
  await page.goto("/l/lst_rt_kitchen");
  const kettle = page.getByRole("region", { name: "“A good kettle”" });
  const n = await kettle.getByRole("listitem").count();
  await kettle.getByRole("button", { name: new RegExp(`^Reject these ${n}`) }).click();
  await expect(page.getByRole("region", { name: "“A good kettle”" })).toHaveCount(0);
  // The other want's are still there.
  await expect(page.getByRole("listitem", { name: /^Suggestion: Kids' Waterproof Insulated Snow Boots/ })).toBeVisible();
});

test("no price, no “checked”: a promoted find says when it was found, others when they were added", async ({ page }) => {
  await signIn(page, "routines@example.com");
  await page.goto("/l/lst_rt_kitchen");
  await page.getByRole("listitem", { name: /^Suggestion: Kids' Waterproof Insulated Snow Boots/ }).getByRole("button", { name: "Promote to list" }).click();
  await page.reload();
  const row = page.locator("section#itm_rt_boots .sheet-group").filter({ hasText: "Kids' Waterproof Insulated Snow Boots" });
  await expect(row).toContainText(/found \w{3} \d{1,2} \w{3}/);
  await expect(row).toContainText("Exa search");
  await expect(row).toContainText("No price yet");
  // No price, so no "checked …" time (its description's "not checked on the store's page" is a different thing).
  await expect(row).not.toContainText(/checked (just now|yesterday|an? |\d)/);
  const claude = page.locator("section#itm_rt_kettle .sheet-group").filter({ hasText: "Fellow Corvo EKG electric kettle" });
  await expect(claude).toContainText(/added /);
  await expect(claude).not.toContainText(/checked (just now|yesterday|an? |\d)/);
});
