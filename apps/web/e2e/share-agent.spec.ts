import { expect, test, type Page } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

/**
 * Share › Share with an agent (owner, 25 Nov 2026): pick the agent, one press creates a write key for the list and
 * copies a prompt that sets the agent up alone. Nothing is created until that press.
 */
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const shareMenu = (page: Page) => page.getByRole("toolbar", { name: "List" }).getByRole("button", { name: "Share" });
const openStep = async (page: Page) => {
  await shareMenu(page).click();
  await page.getByText("Share with an agent").click();
};
const accessLine = (page: Page) => page.locator(".list-meta");

test("opening and closing the menu creates nothing; the press creates one key and copies the prompt", async ({ page }) => {
  await signIn(page, freshEmail("share-agent"));
  const id = await createList(page, { format: "Shopping", title: "Share with Claude" });
  await openStep(page);
  await expect(page.getByRole("radio", { name: "ChatGPT" })).toBeAttached();
  await expect(page.getByRole("radio", { name: "Grok Bot" })).toBeAttached();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(accessLine(page)).not.toContainText("agent");

  await openStep(page);
  await page.locator("label", { hasText: /^Claude$/ }).click();
  await page.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Paste it to Claude|then paste it to Claude/ })).toBeVisible();
  await expect(page.getByText("The key is shown this once.")).toBeVisible();

  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const key = clip.match(/wk_[A-Za-z0-9]+/)?.[0];
  expect(key).toBeTruthy();
  expect(clip.split(key!).length - 1).toBe(1); // the key exactly once
  expect(clip).toContain("/mcp");
  expect(clip).toContain(`/l/${id}`);
  expect(clip).toContain("whoami");
  expect(clip).toContain("how_to_work");
  // Never in the address or storage.
  expect(page.url()).not.toContain(key!);
  expect(await page.evaluate((k) => JSON.stringify(localStorage).includes(k) || JSON.stringify(sessionStorage).includes(k), key!)).toBe(false);
  // The access line counts the new agent without a reload.
  await expect(accessLine(page)).toContainText("1 agent");
});

test("the same agent twice: says so, and offers Create another or Manage agents", async ({ page }) => {
  await signIn(page, freshEmail("share-agent-dup"));
  await createList(page, { format: "Shopping", title: "Twice" });
  await openStep(page);
  await page.locator("label", { hasText: /^Muse$/ }).click();
  await page.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(page.getByText("The key is shown this once.")).toBeVisible();
  await page.keyboard.press("Escape");
  await openStep(page);
  await page.locator("label", { hasText: /^Muse$/ }).click();
  await expect(page.getByText("Muse already has a key for this list.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create key and copy prompt" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Manage agents" })).toBeVisible();
  await page.getByRole("button", { name: "Create another" }).click();
  await expect(page.getByRole("button", { name: "Create key and copy prompt" })).toBeVisible();
});

test("Other opens the rest of the apps and a name field; the key limit shows the server's sentence", async ({ page }) => {
  await signIn(page, freshEmail("share-agent-other"));
  await createList(page, { format: "Shopping", title: "Other" });
  await openStep(page);
  await page.locator("summary", { hasText: /^Other$/ }).first().click();
  await expect(page.getByRole("radio", { name: "Codex" })).toBeAttached();
  await page.getByLabel("Or its name").fill("mock: limit");
  await page.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(page.getByRole("alert")).toHaveText("You have too many active agents; revoke some first");
});

test("someone who can't write the list doesn't see it", async ({ page }) => {
  await page.goto("/l/lst_desk2026");
  await expect(page.getByText("Share with an agent")).toHaveCount(0);
});

test("phone: the step fits one screen with the keyboard closed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, freshEmail("share-agent-phone"));
  await createList(page, { format: "Shopping", title: "Phone" });
  await openStep(page);
  await page.locator("label", { hasText: /^ChatGPT$/ }).click();
  const button = page.getByRole("button", { name: "Create key and copy prompt" });
  await expect(button).toBeInViewport();
  await button.click();
  await expect(page.getByText("The key is shown this once.")).toBeInViewport();
});

test("the /app card menu: Share with an agent, Share with a person, Copy link, Settings, Delete", async ({ page }) => {
  await signIn(page, freshEmail("share-card"));
  const id = await createList(page, { format: "Shopping", title: "Card menu" });
  await page.goto("/app");
  await page.getByRole("button", { name: "More for Card menu" }).click();
  const menu = page.getByRole("group", { name: "More for Card menu" });
  await expect(menu.locator(".menu-item")).toHaveText([/^Share with an agent/, /^Share with a person/, "Copy link", /^Settings/, /^Delete list/]);
  await menu.getByRole("link", { name: /^Share with an agent/ }).click();
  // The same step, open on the list page.
  await expect(page).toHaveURL(new RegExp(`/l/${id}\\?share=agent$`));
  const panel = page.locator("section", { has: page.getByRole("heading", { name: "Share with an agent" }) });
  await panel.locator("label", { hasText: /^Grok Bot$/ }).click();
  await panel.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(panel.getByText("The key is shown this once.")).toBeVisible();
  await expect(page.locator(".list-meta")).toContainText("1 agent");
});

test("a member (not the owner) can share with an agent but not invite people: both menus agree", async ({ page }) => {
  await signIn(page, "heron@example.com"); // a member of lst_desk2026
  await page.goto("/app");
  await page.getByRole("button", { name: /^More for Home office/ }).click();
  const menu = page.getByRole("group", { name: /^More for Home office/ });
  await expect(menu.getByRole("link", { name: /^Share with an agent/ })).toBeVisible();
  await expect(menu.getByRole("link", { name: /^Share with a person/ })).toHaveCount(0);
  await page.goto("/l/lst_desk2026");
  await shareMenu(page).click();
  await expect(page.getByText("Share with an agent")).toBeVisible();
  await expect(page.getByRole("link", { name: "Share with a person" })).toHaveCount(0);
});

test("phone: a card's menu is a sheet that names its list, on screen, with the page dimmed behind it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, freshEmail("share-sheet"));
  await createList(page, { format: "Shopping", title: "First card" });
  await createList(page, { format: "Shopping", title: "Second card" });
  await page.goto("/app");
  await page.getByRole("button", { name: "More for First card" }).click();
  const panel = page.getByRole("group", { name: "More for First card" });
  await expect(panel.locator(".menu-sheet-title")).toHaveText("First card");
  const box = (await panel.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(box.y).toBeGreaterThanOrEqual(0);
  const backdrop = await panel.evaluate((el) => getComputedStyle(el, "::backdrop").backgroundColor);
  expect(backdrop).not.toBe("rgba(0, 0, 0, 0)");
});

test("/app and the list: a key that was made but never used says so, not 'Connect one' and not 'connected'", async ({ page }) => {
  await signIn(page, freshEmail("quiet-agent"));
  const id = await createList(page, { format: "Shopping", title: "Quiet agent" });
  await page.goto("/app");
  const card = page.locator("li.card", { has: page.getByRole("link", { name: "Quiet agent" }) });
  await expect(card.getByText("No agent has worked on this yet.")).toBeVisible();
  await page.goto(`/l/${id}?share=agent`);
  const panel = page.locator("section", { has: page.getByRole("heading", { name: "Share with an agent" }) });
  await panel.locator("label", { hasText: /^Claude$/ }).click();
  await panel.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(panel.getByText("The key is shown this once.")).toBeVisible();
  await page.goto("/app");
  // A key nobody has used yet hasn't connected: the card says so, and doesn't say "connected" (review A3).
  await expect(card.getByText("Key made for Claude. It hasn't connected yet.")).toBeVisible();
  await expect(card.getByText(/is connected/)).toHaveCount(0);
  await page.goto(`/l/${id}`);
  await addItem(page, "A good kettle");
  await expect(page.getByText("Key made for Claude. It hasn't connected yet: paste the prompt into it.")).toBeVisible();
  await expect(card.getByRole("link", { name: /^Connect one/ })).toHaveCount(0);
});
