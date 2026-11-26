import { expect, test } from "@playwright/test";
import { acceptDialogs, createList, DEMO, freshEmail, signIn } from "./helpers";

test("/app: questions first, then list cards with their counts and latest note", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1, name: "Your lists" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "Lists" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Lists" })).toHaveAttribute("aria-current", "page");
  const waiting = page.getByRole("heading", { level: 2, name: /Waiting on you/ });
  await expect(waiting).toBeVisible();
  // Options answer in one tap; answering is covered in work.spec, which owns the seeded questions.
  const card = page.locator("li", { hasText: "4K panel or 90W charging" });
  await expect(card.getByRole("button", { name: "90W charging" })).toBeVisible();
  await expect(card.getByText("Something else…")).toBeVisible();
  // Answers are announced in a live region that stays when the answered card goes.
  await expect(page.locator("main").getByRole("status").first()).toBeAttached();
  // The task list's card shows what Claude is doing now (status_note).
  const tasks = page.locator("li.card", { has: page.getByRole("link", { name: "Moving day: things to sort" }) });
  await expect(tasks).toContainText("waiting to hear back about the install date");
  // Titles are h3s; every control has its own name.
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
});

test("/app: delete a list from its menu, after confirming", async ({ page }) => {
  acceptDialogs(page);
  await signIn(page, freshEmail("del"));
  await createList(page, { format: "Tasks", title: "Throwaway" });
  await page.goto("/app");
  const card = page.locator("li.card", { has: page.getByRole("link", { name: "Throwaway" }) });
  await card.getByRole("button", { name: "More for Throwaway" }).click();
  await page.locator(":popover-open").getByText("Delete list", { exact: true }).click();
  await page.locator(":popover-open").getByRole("button", { name: "Yes, delete list" }).click();
  await expect(page.getByRole("link", { name: "Throwaway" })).toHaveCount(0);
});

test("a new list is private unless public is chosen, and opens on giving it to an agent", async ({ page }) => {
  await signIn(page, freshEmail("newlist"));
  await page.goto("/app/new");
  await expect(page.getByRole("radio", { name: /^Private/ })).toBeChecked();
  await expect(page.getByText("only you and people you invite.")).toBeVisible();
  await expect(page.getByText("anyone with the link, and it can appear on the home page and in search.")).toBeVisible();
  await page.locator('input[name="title"]').fill("Winter coat");
  await page.getByRole("button", { name: "Create shopping list" }).click();
  await expect(page).toHaveURL(/\?new=1$/);
  await expect(page.locator(".list-meta")).toContainText("Private");
  const h = page.getByRole("heading", { name: "Give this list to your agent" });
  await expect(h).toBeFocused();
  await expect(page.getByRole("button", { name: "Copy prompt" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Steps for Claude" })).toHaveAttribute("href", /\/connect\?list=.+&app=claude#steps$/);
  // The add box sits right under the card: no link pointing at it (review H8).
  await expect(page.getByRole("link", { name: "Or add what you want first" })).toHaveCount(0);
  await expect(page.locator("#new-item")).toBeVisible();
});

test("the list header says who can write a shared list", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_tasks");
  const who = page.locator(".list-meta").getByRole("button", { name: /people · \d+ agents?/ });
  await expect(who).toBeVisible();
  await who.click();
  const pop = page.locator(":popover-open");
  await expect(pop.getByText("you (owner)")).toBeVisible();
  await expect(pop.getByText("Claude · your agent")).toBeVisible();
});

test("the account page has no feature-email box; it's offered at sign-up only", async ({ page }) => {
  await signIn(page, freshEmail("acct"));
  await page.goto("/app/account");
  await expect(page.getByText("Email me about new features")).toHaveCount(0);
  await page.goto("/privacy");
  await expect(page.getByText(/unsubscribe link/)).toBeVisible();
});

test("share links: public lists carry ?ref=share, visitors' button goes home with it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/l/lst_desk2026");
  await expect(page.getByRole("link", { name: "Start a list" }).last()).toHaveAttribute("href", "/?ref=share");
  await page.getByRole("button", { name: "Share" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/l\/lst_desk2026\?ref=share$/);
});
