import { expect, test } from "@playwright/test";
import { DEMO, signIn } from "./helpers";

// These use the mock's seeded demo lists (fresh for every run): outside suggestions on the desk
// list, open questions, and claims nobody has touched for days.

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
  // A written answer, on the list page.
  await page.goto("/l/lst_tasks");
  const q = page.getByRole("group", { name: "Waiting on you" });
  await q.getByLabel("Your answer").fill("Yes, book the £420 one.");
  await q.getByRole("button", { name: "Answer" }).click();
  await expect(page.getByRole("group", { name: "Waiting on you" })).toHaveCount(0);
});

test("release a stale claim, and take over another", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_tasks");
  const broadband = page.locator("section#itm_t_broadband");
  await expect(broadband.getByText(/In progress · Claude, 3 days/)).toBeVisible();
  await broadband.getByRole("button", { name: "Release" }).click();
  await expect(broadband.getByText("Open", { exact: true })).toBeVisible();

  await page.goto("/l/lst_research");
  const grant = page.locator("section#itm_r_grant");
  await expect(grant.getByText(/In progress · Codex, 2 days/)).toBeVisible();
  await grant.getByRole("button", { name: "Take over" }).click();
  await expect(grant.getByText(/In progress · quiet-otter-4821/)).toBeVisible();
});
