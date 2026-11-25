import { expect, test } from "@playwright/test";
import { DEMO, freshEmail, MOCK_CODE, signIn } from "./helpers";

// The mock makes a fresh list for each clm_e2e_<state>_<id> token (mock/api.ts, e2eClaim), so every test and every
// retry has its own claim link.
let n = 0;
const token = (state: "unclaimed" | "soon" | "expired" | "handover") => `clm_e2e_${state}_${Date.now().toString(36)}${n++}`;

test("a list an agent started: keep it by signing up, then land on it as its owner", async ({ page }) => {
  const t = token("unclaimed");
  const res = await page.goto(`/claim/${t}`);
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(res?.headers()["x-robots-tag"]).toBe("noindex");
  expect(res?.headers()["cache-control"]).toBe("private, no-store");
  await expect(page.getByRole("heading", { level: 1, name: "Winter boots for Sam" })).toBeVisible();
  await expect(page.getByText("Claude started a list for you")).toBeVisible();
  // The deadline is one quiet line under the button, in the visitor's own clock (SPEC 15.3).
  await expect(page.getByText(/^Confirm your email to keep it\. Otherwise it's deleted (today|tomorrow) at \d{1,2}:\d{2}\s?[AP]M\.$/)).toBeVisible();
  await expect(page.getByText("Velcro or laces?", { exact: false })).toBeVisible();
  // Never the hidden placeholder account.
  await expect(page.getByText("hidden-holder", { exact: false })).toHaveCount(0);

  await page.getByRole("button", { name: "Keep this list" }).click();
  // The token travels in a cookie, never in the sign-in URL.
  await expect(page).toHaveURL(/\/login\?next=%2Fclaim$|\/login\?next=\/claim$/);
  expect(page.url()).not.toContain("clm_");
  await expect(page.getByRole("heading", { name: "Keep your list" })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("claim"));
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Code").fill(MOCK_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/l\/lst_[a-z0-9]+$/);
  const listUrl = page.url();
  await expect(page.getByRole("heading", { level: 1, name: "Winter boots for Sam" })).toBeVisible();
  await expect(page.locator(".list-meta")).toContainText("Private");
  // The owner's controls are there: it's theirs.
  await expect(page.getByRole("link", { name: /Settings/ }).first()).toBeVisible();

  // Reopening the used link goes straight back to the list.
  await page.goto(`/claim/${t}`);
  await expect(page).toHaveURL(listUrl);

  // Anyone else gets a calm explanation.
  await page.context().clearCookies();
  await page.goto(`/claim/${t}`);
  await expect(page.getByRole("heading", { name: "This link doesn't work any more" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Start a list" })).toBeVisible();
});

test("signed in already: one button keeps the list", async ({ page }) => {
  await signIn(page, freshEmail("claimsigned"));
  await page.goto(`/claim/${token("soon")}`);
  await expect(page.getByText(/Otherwise it's deleted (today|tomorrow) at /)).toBeVisible();
  // One thought: who keeps it, then what happens otherwise.
  await expect(page.getByText(/^You'll keep it as [a-z]+-[a-z]+-\d+ \(not you\?\)\. Otherwise it's deleted (today|tomorrow) at /)).toBeVisible();
  await page.getByRole("button", { name: "Keep this list" }).click();
  await expect(page).toHaveURL(/\/l\/lst_[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Packing for the move" })).toBeVisible();
});

test("expired and unknown links explain themselves and offer a new list", async ({ page }) => {
  for (const t of [token("expired"), "clm_nope"]) {
    await page.goto(`/claim/${t}`);
    await expect(page.getByRole("heading", { name: "This link doesn't work any more" })).toBeVisible();
    await expect(page.getByText(/deleted if nobody keeps it within 24 hours/)).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Start a list" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Keep this list" })).toHaveCount(0);
  }
});

test("a hand-over names who made the list, and the old owner stays on it", async ({ page }) => {
  const t = token("handover");
  await page.goto(`/claim/${t}`);
  await expect(page.getByText("Kit made this list for you")).toBeVisible();
  await expect(page.getByText("Keep it and it becomes yours; they can keep working on it.")).toBeVisible();
  // More than a day left: no countdown.
  await expect(page.getByText(/stops working/)).toHaveCount(0);

  await signIn(page, freshEmail("handover"));
  await page.goto(`/claim/${t}`);
  await expect(page.getByText(/^It becomes yours, as [a-z]+-[a-z]+-\d+ \(not you\?\); they can keep working on it\./)).toBeVisible();
  await page.getByRole("button", { name: "Keep this list" }).click();
  await expect(page).toHaveURL(/\/l\/lst_[a-z0-9]+$/);
  await page.goto(`${page.url().replace("/l/", "/app/lists/")}/settings`);
  await expect(page.getByText("tidy-wren-6402").first()).toBeVisible();
});

test("whoever made a hand-over link sees it as theirs, with nothing to keep", async ({ page }) => {
  const t = token("handover");
  await signIn(page, "kit-agent@example.com");
  await page.goto(`/claim/${t}`);
  await expect(page.getByText("Your hand-over link")).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep this list" })).toHaveCount(0);
  await expect(page.getByText(/made this list for you/)).toHaveCount(0);
});

test("an invite an agent sent says so", async ({ page }) => {
  await page.goto("/invite/inv_seed_from_agent");
  await expect(page.getByText("Kit, an AI agent, invited you")).toBeVisible();
});

test("/llms.txt and /agents.txt tell agents how to begin", async ({ request }) => {
  for (const path of ["/llms.txt", "/agents.txt"]) {
    const res = await request.get(path);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    for (const s of [
      "start_list",
      "sign_up",
      "confirm_sign_up",
      "share_list",
      "hand_over_list",
      "Never type a person's email address",
      "never ask a person for a sign-in code",
      "read each with read_skill before you start",
      "If your person has not said what they want yet, ask them.",
      "Then give your person the claim link.",
      "The list is deleted in 24 hours (<expires_at>) unless the person keeps it by confirming their email, so give them the link well before then.",
      "wants have no product yet",
      "Pass key on every call for this list (or send it as Authorization: Bearer). Never show the key to anyone, the person included: they only need the claim link.",
    ]) {
      expect(body, `${path}: ${s}`).toContain(s);
    }
    // The work comes before the link (SPEC 15.2); the old "hand it over now" wording is gone.
    expect(body).not.toContain("Give this to the person now");
    expect(body).not.toContain("straight away");
    // The first screen of the file says what to do first.
    expect(body.split("\n").slice(0, 12).join("\n")).toContain("start_list");
  }
});

test("nobody else can keep a list someone already kept", async ({ page }) => {
  const t = token("unclaimed");
  await signIn(page, freshEmail("first"));
  await page.goto(`/claim/${t}`);
  await page.getByRole("button", { name: "Keep this list" }).click();
  await expect(page).toHaveURL(/\/l\/lst_[a-z0-9]+$/);
  await page.context().clearCookies();
  await signIn(page, DEMO);
  await page.goto(`/claim/${t}`);
  await expect(page.getByRole("heading", { name: "This link doesn't work any more" })).toBeVisible();
  await expect(page).toHaveURL(/\/claim\//);
});
