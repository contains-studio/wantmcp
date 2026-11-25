import { expect, test } from "@playwright/test";
import { DEMO, signIn } from "./helpers";

// These use the mock's seeded demo lists (fresh for every run): outside suggestions on the desk
// list, open questions, and claims nobody has touched for days.

test("an answer given in an agent's form says so, quietly", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_tasks");
  const history = page.locator("details.group", { hasText: "Is the account in your name" }).last();
  await history.locator("> summary").click();
  await expect(history.getByText("answered in Claude's form")).toBeVisible();
  // The viewer's own answer says "You", not their handle.
  await expect(history.getByText("You:")).toBeVisible();
});

test("promote one outside suggestion and reject another", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_desk2026");
  const section = page.locator("section[aria-labelledby='sugg-h']");
  await expect(section.locator("li")).toHaveCount(2);
  await section.locator("li").first().getByRole("button", { name: "Promote to list" }).click();
  await expect(section.locator("li")).toHaveCount(1);
  await section.locator("li").first().getByRole("button", { name: "Reject" }).click();
  await expect(section).toHaveCount(0);
});

test("ticking an item that waits on you explains why, and doesn't tick it", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_tasks"); // Checklist layout
  const movers = page.locator("section#itm_t_movers");
  const box = movers.getByRole("checkbox", { name: /Get three quotes/ });
  await box.click();
  const refusal = movers.getByRole("alert");
  await expect(refusal).toContainText("open question");
  await expect(refusal.getByRole("link", { name: "Answer the question" })).toHaveAttribute("href", "#itm_t_movers");
  await expect(box).toHaveAttribute("aria-checked", "false");
});

test("answer the questions waiting on you", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app");
  const waiting = page.locator("section[aria-labelledby='waiting-h']");
  await expect(waiting).toBeVisible();
  const before = await waiting.locator("li").count();
  // One tap on an option.
  await waiting.getByRole("button", { name: "4K panel" }).click();
  await expect(waiting.locator("li")).toHaveCount(before - 1);
  await expect(page.locator("main").getByRole("status").filter({ hasText: /^Answered/ })).toBeVisible();
  // A written answer, on the list page.
  await page.goto("/l/lst_tasks");
  const q = page.getByRole("group", { name: "Question for you" });
  await q.getByLabel("Your answer").fill("Yes, book the $1,180 one.");
  await q.getByRole("button", { name: "Answer" }).click();
  await expect(page.getByRole("group", { name: "Question for you" })).toHaveCount(0);
});

test("release a stale claim, and take over another, from the status menu", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_tasks");
  const broadband = page.locator("section#itm_t_broadband");
  // The status chip is the control: it opens a small menu.
  const status = broadband.getByRole("button", { name: /Change status/ });
  await expect(status).toContainText("In progress · Claude, 3 days");
  await status.click();
  await page.locator(":popover-open").getByRole("button", { name: "Release" }).click();
  await expect(status).toContainText(/^Open/);

  await page.goto("/l/lst_research");
  const grant = page.locator("section#itm_r_grant");
  const grantStatus = grant.getByRole("button", { name: /Change status/ });
  await expect(grantStatus).toContainText("In progress · Codex, 2 days");
  await grantStatus.click();
  await page.locator(":popover-open").getByRole("button", { name: "Take over" }).click();
  await expect(grantStatus).toContainText("In progress · you");
});

test("an item's ⋯ menu removes it only after asking again", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_tasks");
  const item = page.locator("section#itm_t_broadband");
  await item.getByRole("button", { name: /^More actions for “Move the internet/ }).click();
  const menu = item.getByRole("group", { name: /^More actions for “Move the internet/ });
  await expect(menu).toBeVisible();
  await menu.getByText("Remove", { exact: true }).click();
  await expect(menu.getByText(/and everything on it\?/)).toBeVisible();
  await menu.getByRole("button", { name: "Yes, remove" }).click();
  await expect(page.locator("section#itm_t_broadband")).toHaveCount(0);
});

test("set an item done with a note from its status menu", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_research");
  const grant = page.locator("section#itm_r_grant");
  await grant.getByRole("button", { name: /Change status/ }).click();
  const menu = page.locator(":popover-open");
  await menu.getByText("Answered, with a note").click();
  await menu.getByLabel("Note").fill("Checked with the installer.");
  await menu.getByRole("button", { name: "Mark answered" }).click();
  await expect(grant.getByText("Checked with the installer.")).toBeVisible();
});

test("mark a want bought from the quiet action on its title row", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_desk2026"); // Sheet layout
  const lamp = page.locator("section#itm_lamp");
  await lamp.getByRole("button", { name: "Mark bought" }).first().click();
  const menu = page.locator(":popover-open");
  await menu.getByLabel("Retailer").fill("Corner shop");
  await menu.getByRole("button", { name: "Mark bought" }).click();
  await expect(page.locator("section#itm_lamp").getByText(/at Corner shop/)).toBeVisible();
});
