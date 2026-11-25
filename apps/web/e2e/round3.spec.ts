import { expect, test } from "@playwright/test";
import { createList, DEMO, freshEmail, signIn } from "./helpers";

test("addresses typed by hand: /account and /settings", async ({ page }) => {
  await signIn(page, freshEmail("typed"));
  await page.goto("/account");
  await expect(page).toHaveURL(/\/app\/account$/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/app\/account$/);
});

test("a 404 offers the next steps", async ({ page }) => {
  await page.goto("/no/such/page");
  await expect(page.getByRole("main").getByRole("link", { name: "Start a list" })).toHaveAttribute("href", "/login?next=/app/new");
  await signIn(page, freshEmail("lost"));
  await page.goto("/no/such/page");
  await expect(page.getByRole("link", { name: "Your lists" })).toBeVisible();
});

test("sign-in is titled for what the person is doing, with nothing else on the page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start a list" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Start your list" })).toBeVisible();
  await expect(page.getByText("Enter your email and we'll send a code. No password.")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Connect" })).toHaveCount(0);
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
});

test("a new person who pressed Start a list lands on a new list form, ready to type", async ({ page }) => {
  await page.goto("/login?next=/app/new?format=tasks");
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("starter"));
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/new\?format=tasks$/);
  await expect(page.getByRole("radio", { name: /^Tasks/ })).toBeChecked();
});

test("unsubscribe: one button, then done; a bad link says where to write", async ({ page }) => {
  const res = await page.goto("/unsubscribe/unsub_e2e_token_1");
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(res?.headers()["x-robots-tag"]).toBe("noindex");
  await page.getByRole("button", { name: "Stop feature emails" }).click();
  await expect(page.getByText("Done. You won't get feature emails.", { exact: false }).or(page.getByText("You won't get feature emails. You can still sign in as usual."))).toBeVisible();
  await page.goto("/unsubscribe/nope");
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  await expect(page.getByRole("link", { name: "hello@wantmcp.com" })).toBeVisible();
});

test("an agent's progress note says who wrote it and when", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_tasks");
  await expect(page.locator(".item-status-note").first()).toContainText(/Claude, .*ago: “Called the provider/);
});

test("list settings: sections in order, Format only while the list is empty", async ({ page }) => {
  await signIn(page, freshEmail("settings-order"));
  const id = await createList(page, { format: "Tasks", title: "Order check" });
  await page.goto(`/app/lists/${id}/settings`);
  const titles = await page.locator("details.settings-section > summary h2").allTextContents();
  expect(titles).toEqual(["Details", "Sharing", "Agents", "Look", "Format", "Delete"]);
  await page.goto(`/l/${id}`);
  await page.locator("#new-item").fill("Book the van");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.locator(".item-section", { hasText: "Book the van" })).toBeVisible();
  await page.goto(`/app/lists/${id}/settings`);
  await expect(page.locator("details.settings-section > summary h2")).toHaveText(["Details", "Sharing", "Agents", "Look", "Delete"]);
});

test("/for index: a swatch and a promise per page, and Start a list top and bottom", async ({ page }) => {
  await page.goto("/for");
  await expect(page.getByRole("main").getByRole("link", { name: "Start a list" })).toHaveCount(2);
});

test("home: three kinds of list behind one switch, each with its own start", async ({ page }) => {
  await page.goto("/");
  const kinds = page.getByRole("navigation", { name: "Kinds of list" });
  await expect(page.getByRole("link", { name: "Start a shopping list" })).toHaveAttribute("href", /format%3Dshopping/);
  await kinds.getByRole("link", { name: "Tasks" }).click();
  await expect(page.getByRole("link", { name: "Start a task list" })).toHaveAttribute("href", /format%3Dtasks/);
  await kinds.getByRole("link", { name: "Research" }).click();
  await expect(page.getByRole("link", { name: "Start a research list" })).toHaveAttribute("href", /format%3Dresearch/);
});
