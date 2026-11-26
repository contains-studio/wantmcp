import { expect, test } from "@playwright/test";
import { acceptDialogs, createList, freshEmail, MOCK_CODE, signIn } from "./helpers";

test("home: one way in for people, the words for an agent, and a pointer for agents", async ({ page }) => {
  await page.goto("/");
  // The "Two ways to start" section is gone (owner, 25 Nov 2026): the hero's button and the line under it say both.
  await expect(page.getByRole("heading", { name: "Two ways to start" })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: "Start a list" }).first()).toHaveAttribute("href", "/login?next=/app/new");
  await expect(page.getByRole("button", { name: /set up wantmcp\.com for keeping track of the things I want/ })).toBeVisible();
  await expect(page.locator('link[rel="alternate"][type="text/plain"]')).toHaveAttribute("href", /\/llms\.txt$/);
});

test("robots.txt allows the agent instructions", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Allow: /llms.txt");
  expect(body).toContain("Allow: /agents.txt");
});

test("/connect: no account yet? the home page's words for an agent, and the agent instructions folded", async ({ page }) => {
  await page.goto("/connect");
  // The same sentence and copy button as the home page, not a jump into agent text.
  await expect(page.getByText("No account yet? Tell your agent:")).toBeVisible();
  await expect(page.getByRole("button", { name: /set up wantmcp\.com for keeping track of the things I want/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Your agent can start a list for you" })).toHaveCount(0);
  // The instructions stay in the page for agents reading it, closed for people; /llms.txt stays a visible link.
  const block = page.locator("#for-agents");
  await expect(block.getByRole("link", { name: "/llms.txt" })).toBeVisible();
  await expect(block).toContainText("start_list");
  await expect(block).toContainText("Never type a person's email address");
  await expect(block.getByText("Never type a person's email address", { exact: false })).toBeHidden();
  await block.getByText("For agents: the full instructions").click();
  await expect(block.getByText("Never type a person's email address", { exact: false })).toBeVisible();
});

test("after keeping a list, one line says who started it, once", async ({ page }) => {
  const token = `clm_e2e_unclaimed_kept${Date.now().toString(36)}`;
  await page.goto(`/claim/${token}`);
  await expect(page.getByRole("list", { name: "What's on it" })).toContainText("Waterproof winter boots");
  await page.getByRole("button", { name: "Keep this list" }).click();
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("kept"));
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Code").fill(MOCK_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/l\/lst_[a-z0-9]+$/);
  await expect(page.getByText("This list was started by Claude. It is private.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("This list was started by Claude.")).toHaveCount(0);
});

test("account: agents with their own key to the account, removable", async ({ page }) => {
  acceptDialogs(page);
  await signIn(page, "kit-agent@example.com");
  await page.goto("/app/account");
  const section = page.locator("section[aria-labelledby=agent-keys-h]");
  await expect(section.getByText("Kit", { exact: true }).first()).toBeVisible();
  await section.getByRole("button", { name: "Remove Kit" }).click();
  await expect(page.locator("section[aria-labelledby=agent-keys-h]")).toHaveCount(0);
});

test("account: no agent keys, no section", async ({ page }) => {
  await signIn(page, freshEmail("nokeys"));
  await page.goto("/app/account");
  await expect(page.getByRole("heading", { name: "Agents with access to your account" })).toHaveCount(0);
});

test("settings: hand a list to someone with a link", async ({ page }) => {
  await signIn(page, freshEmail("handover-owner"));
  const id = await createList(page, { format: "Shopping", title: "For my sister" });
  await page.goto(`/app/lists/${id}/settings`);
  await page.getByRole("button", { name: "Make a hand-over link" }).click();
  await expect(page.getByText(/\/claim\/clm_/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
});

test("an agent's list with nothing done: no 'no agent' line when an agent can write it", async ({ page }) => {
  await signIn(page, freshEmail("idle"));
  const id = await createList(page, { format: "Tasks", title: "Idle check" });
  await page.locator("#new-item").fill("Book the van");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.goto(`/l/${id}`);
  // No agent at all: the step to give it to one.
  await expect(page.getByRole("heading", { name: "Give this list to your agent" })).toBeVisible();
  // The add button stays blue beside it: the quiet style was near-black on black in dark mode (review H5).
  await expect(page.getByRole("button", { name: "Add task" })).toHaveClass(/btn-want/);
});
