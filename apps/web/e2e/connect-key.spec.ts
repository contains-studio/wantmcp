import { expect, test, type Page } from "@playwright/test";
import { createList, freshEmail, signIn } from "./helpers";

/** SPEC 24.2: a plain key for apps, in the Share step and on /connect/key. */
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const clip = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

test("Share › msgblast: the press copies the plain key; the prompt is the quiet second choice", async ({ page }) => {
  await signIn(page, freshEmail("app-key"));
  await createList(page, { format: "Shopping", title: "For msgblast" });
  await page.getByRole("toolbar", { name: "List" }).getByRole("button", { name: "Share" }).click();
  await page.getByText("Share with an agent").click();
  await page.locator("summary", { hasText: /^Other$/ }).first().click();
  await page.locator("label", { hasText: /^msgblast$/ }).click();
  // Its mark, like the other named apps.
  await expect(page.locator("label", { hasText: /^msgblast$/ }).locator("img")).toHaveAttribute("src", "/brands/msgblast.png");
  await page.getByRole("button", { name: "Create key and copy it" }).click();
  const field = page.getByLabel("Key for msgblast");
  await expect(field).toHaveValue(/^wk_/);
  await expect(page.getByRole("status").filter({ hasText: "Paste it into msgblast › Wants › Connect list." })).toBeVisible();
  await expect.poll(() => clip(page)).toBe(await field.inputValue());
  await page.getByRole("button", { name: "Or copy a prompt for an AI agent" }).click();
  await expect.poll(() => clip(page)).toContain(`Bearer ${await field.inputValue()}`);
  // A chat agent keeps the prompt first.
  await expect(page.locator(".prompt-facts")).toHaveCount(0);
});

test("/connect/key signed out: sign in comes back to the step, with only the cleaned values", async ({ page }) => {
  await page.goto("/connect/key?app=msgblast&list=lst_nope&return=https://evil.example/");
  await expect(page).toHaveURL(/\/login\?next=%2Fconnect%2Fkey%3Fapp%3Dmsgblast%26list%3Dlst_nope$/);
});

test("/connect/key: pick a list, Create key, Copy key; the address never changes and the page is noindex", async ({ page }) => {
  await signIn(page, freshEmail("ck"));
  await createList(page, { format: "Shopping", title: "First list" });
  const second = await createList(page, { format: "Tasks", title: "Second list" });
  const res = await page.goto("/connect/key?app=msgblast");
  // Never cached, never indexed, never a referrer to another site (the page can show a key).
  expect(res?.headers()["cache-control"]).toBe("private, no-store");
  expect(res?.headers()["x-robots-tag"]).toBe("noindex");
  expect(res?.headers()["referrer-policy"]).toBe("same-origin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Connect msgblast to a list");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await page.getByRole("radio", { name: "Second list" }).check();
  const before = page.url();
  await page.getByRole("button", { name: "Create key" }).click();
  const field = page.getByLabel("Key for msgblast");
  await expect(field).toHaveValue(/^wk_/);
  expect(page.url()).toBe(before);
  expect(page.url()).not.toContain("wk_");
  await expect.poll(() => clip(page)).toBe(await field.inputValue());
  // The key is for the list picked.
  await page.goto(`/app/lists/${second}/settings#keys-h`);
  await expect(page.locator(".access-row", { hasText: "msgblast" })).toBeVisible();
});

test("/connect/key with a list given names it; a list that isn't theirs shows the picker", async ({ page }) => {
  await signIn(page, freshEmail("ck-list"));
  const id = await createList(page, { format: "Shopping", title: "Kitchen" });
  await page.goto(`/connect/key?app=msgblast&list=${id}`);
  await expect(page.getByText("Kitchen", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.goto("/connect/key?app=msgblast&list=lst_desk2026");
  await expect(page.getByText("That list isn't one of yours")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Kitchen" })).toBeChecked();
});

test("/connect/key: a label that isn't letters, digits, spaces or .-_ falls back to “this app” and asks the name", async ({ page }) => {
  await signIn(page, freshEmail("ck-bad"));
  await createList(page, { format: "Shopping", title: "Mine" });
  await page.goto(`/connect/key?app=${encodeURIComponent("<b>hi</b>")}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Connect this app to a list");
  await expect(page.locator("main")).not.toContainText("<b>");
  await page.getByLabel("The app's name").fill("Pantry Pal");
  await page.getByRole("button", { name: "Create key" }).click();
  await expect(page.getByLabel("Key for Pantry Pal")).toHaveValue(/^wk_/);
  await expect(page.getByRole("status")).toContainText("Paste it where Pantry Pal asks for a key.");
});

test("/connect/key with no lists: start one here, then the step with it picked", async ({ page }) => {
  await signIn(page, freshEmail("ck-none"));
  await page.goto("/connect/key?app=msgblast");
  await page.getByLabel("List name").fill("Wants");
  await page.getByRole("button", { name: "Start a new list" }).click();
  await expect(page).toHaveURL(/\/connect\/key\?app=msgblast&list=lst_/);
  await expect(page.getByText("Wants", { exact: true })).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("/connect/key still makes the key and shows it once", async ({ page }) => {
    await signIn(page, freshEmail("ck-nojs"));
    await createList(page, { format: "Shopping", title: "No script" });
    await page.goto("/connect/key?app=msgblast");
    await page.getByRole("button", { name: "Create key" }).click();
    await expect(page.getByLabel("Key for msgblast")).toHaveValue(/^wk_/);
    expect(page.url()).not.toContain("wk_");
  });
});
