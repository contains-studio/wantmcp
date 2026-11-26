import { expect, test } from "@playwright/test";
import { createList, DEMO, freshEmail, signIn } from "./helpers";

/**
 * Settings › Agents (owner, 25 Nov 2026: "more visual like we do with a human"): the agents on the list in the same
 * row as people, and the Share with an agent step to add one. Owners see every agent; members their own.
 */
test.use({ permissions: ["clipboard-read", "clipboard-write"] });
const section = (page: import("@playwright/test").Page) => page.locator('details[data-section="keys-h"]');

test("owner: every agent on the list, each with its mark, how it connects, and others' marked as theirs", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app/lists/lst_desk2026/settings#keys-h");
  const sec = section(page);
  await expect(sec.locator("> summary")).toContainText(/\d+ agents can work on this list›?$/);
  const rows = sec.locator(".access-row");
  expect(await rows.count()).toBeGreaterThanOrEqual(3);
  await expect(sec.locator(".access-row", { hasText: "added by brave-heron-1207" })).toHaveCount(1);
  await expect(sec.getByText("Your connected clients")).toHaveCount(0);
  await expect(sec.getByText("write key", { exact: false })).toHaveCount(0);
  await expect(sec.getByRole("link", { name: "How agents connect" })).toHaveAttribute("href", "/connect?list=lst_desk2026");
});

test("member: only their own agents, the count says how many are theirs, and the rest are mentioned once", async ({ page }) => {
  await signIn(page, "heron@example.com");
  await page.goto("/app/lists/lst_desk2026/settings#keys-h");
  const sec = section(page);
  await expect(sec.locator("> summary")).toContainText(/agents can work on this list \(1 yours\)/);
  await expect(sec.locator(".access-row")).toHaveCount(1);
  await expect(sec.getByText(/belong to other people on the list/)).toBeVisible();
  // A member can add an agent (the API allows keys for members).
  await sec.locator("summary", { hasText: "Add another agent" }).click();
  await expect(sec.getByRole("button", { name: "Create key and copy prompt" })).toBeVisible();
});

test("empty: one line and the step, then the agent appears and the same name says it already has a key", async ({ page }) => {
  await signIn(page, freshEmail("agents-empty"));
  const id = await createList(page, { format: "Shopping", title: "No agents yet" });
  await page.goto(`/app/lists/${id}/settings#keys-h`);
  const sec = section(page);
  await expect(sec.locator("> summary")).toContainText("No agent yet");
  await expect(sec.locator(".access-row")).toHaveCount(0);
  await sec.locator("label", { hasText: /^Claude$/ }).click();
  await sec.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(sec.getByText("Copied. Paste it to Claude.")).toBeVisible();
  await expect(sec.locator(".access-row", { hasText: "Claude" })).toBeVisible();
  await page.reload();
  await sec.locator("summary", { hasText: "Add another agent" }).click();
  await sec.locator("label", { hasText: /^Claude$/ }).click();
  await expect(sec.getByText("Claude already has a key for this list.")).toBeVisible();
});

test("without JavaScript the step still makes a key, and the page shows the prompt", async ({ browser }) => {
  const js = await browser.newContext();
  const page = await js.newPage();
  await signIn(page, freshEmail("agents-nojs"));
  const id = await createList(page, { format: "Shopping", title: "No script agents" });
  const ctx = await browser.newContext({ javaScriptEnabled: false, storageState: await js.storageState() });
  const p = await ctx.newPage();
  await p.goto(`/app/lists/${id}/settings`);
  const sec = section(p);
  if (!(await sec.evaluate((d) => (d as HTMLDetailsElement).open))) await sec.locator("> summary").click();
  await sec.locator("label", { hasText: /^Muse$/ }).click();
  await sec.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(p.getByText("Copy this, then paste it to Muse.")).toBeVisible();
  await expect(p.locator(".prompt-facts")).toContainText(/Bearer wk_/);
  await ctx.close();
  await js.close();
});
