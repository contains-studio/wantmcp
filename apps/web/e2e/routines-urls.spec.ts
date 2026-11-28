import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * SPEC 26.21: a person's saved URLs (Account > Notifications > URLs, #urls) and "Send this list's changes to a URL".
 * Seed: routines@example.com has "My n8n" (working) and "Old server" (stopped answering), which Kitchen's routine used
 * until it stopped. Mock rules: a name with "nope" never answers the handshake; "private" resolves privately.
 */
const RT = "routines@example.com";
const ME = "bright-wren-2207";

test.describe.serial("URLs", () => {
  test("each URL: its name, host, state, the server's sentence for its last problem, what uses it", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/account#urls");
    const urls = page.getByRole("region", { name: "URLs" });
    const n8n = urls.getByRole("listitem").filter({ hasText: "My n8n" });
    await expect(n8n).toContainText("hooks.n8n.example");
    await expect(n8n).toContainText("Working · last answered");
    await expect(n8n.getByRole("button", { name: /^Verify again/ })).toHaveCount(0);
    await expect(n8n.getByRole("button", { name: /^Send a test/ })).toBeVisible();
    const old = urls.getByRole("listitem").filter({ hasText: "Old server" });
    await expect(old).toContainText("Stopped answering");
    await expect(old).toContainText("The URL did not answer within 10 seconds.");
    await expect(old.getByRole("link", { name: "Kitchen" })).toHaveAttribute("href", "/app/lists/lst_rt_kitchen/settings#routines");
    await expect(old.getByRole("button", { name: /^Verify again/ })).toBeVisible();
  });

  test("adding one: the address rules in the server's words, the handshake, and the secret shown once", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/account#urls");
    const urls = page.getByRole("region", { name: "URLs" });
    await urls.locator("summary", { hasText: "Add a URL" }).click();
    // Open, it reads as the form's heading, not as a button above it.
    await expect(urls.locator("summary", { hasText: "Add a URL" })).not.toHaveClass(/\bbtn\b/);
    await urls.getByRole("textbox", { name: /^Name/ }).fill("Team hook");
    await urls.getByRole("textbox", { name: /^URL/ }).fill("https://10.0.0.1/hook");
    await urls.getByRole("button", { name: "Add and check it" }).click();
    await expect(urls.getByRole("alert")).toHaveText("url must be https, a name (not an IP address), with no user, password, port or #fragment");

    await urls.getByRole("textbox", { name: /^URL/ }).fill("https://team.example.org/hook");
    await urls.getByRole("button", { name: "Add and check it" }).click();
    await expect(urls.getByRole("status").first()).toHaveText("Saved. “Team hook” answered the handshake.");
    const secret = urls.getByLabel("Signing secret");
    await expect(secret).toHaveText(/^whsec_/);
    await expect(urls).toContainText("We won't show it again");
    await expect(urls.getByRole("button", { name: "Copy" })).toBeVisible();
    // Never in the address.
    expect(page.url()).not.toContain("whsec_");
    await page.reload();
    await expect(urls.getByLabel("Signing secret")).toHaveCount(0);
    await expect(urls.getByRole("listitem").filter({ hasText: "Team hook" })).toContainText("team.example.org");

    // One that doesn't echo the challenge is kept, unverified, and says so.
    await urls.locator("summary", { hasText: "Add a URL" }).click();
    await urls.getByRole("textbox", { name: /^Name/ }).fill("Not yet");
    await urls.getByRole("textbox", { name: /^URL/ }).fill("https://nope.example.com/hook");
    await urls.getByRole("button", { name: "Add and check it" }).click();
    await expect(urls.getByRole("status").first()).toContainText("hasn't answered the handshake yet");
    const notYet = urls.getByRole("listitem").filter({ hasText: "Not yet" });
    await expect(notYet).toContainText("Hasn't answered the handshake yet");
    await expect(notYet).toContainText("The URL did not answer the handshake: it answered 404.");
    await expect(notYet.getByRole("button", { name: /^Send a test/ })).toHaveCount(0);
  });

  test("New secret shows the new one once; Remove asks first", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/account#urls");
    const urls = page.getByRole("region", { name: "URLs" });
    const team = urls.getByRole("listitem").filter({ hasText: "Team hook" });
    await team.getByRole("button", { name: /^New secret/ }).click();
    await expect(urls.getByLabel("Signing secret")).toHaveText(/^whsec_/);
    await expect(urls).toContainText("The old one keeps working for 24 hours");
    const notYet = urls.getByRole("listitem").filter({ hasText: "Not yet" });
    await notYet.locator("summary", { hasText: /^Remove/ }).click();
    await expect(notYet).toContainText("Remove “Not yet”?");
    await notYet.getByRole("button", { name: /^Yes, remove/ }).click();
    await expect(urls.getByRole("listitem").filter({ hasText: "Not yet" })).toHaveCount(0);
  });

  test("Send this list's changes to a URL: one of my working URLs, which changes, no follow choice; the card and the list page say whose URL", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/lists/lst_rt_garden/settings#routines");
    await page.locator("summary", { hasText: "New routine" }).click();
    await page.getByRole("radio", { name: /Send this list's changes to a URL/ }).check();
    const to = page.getByLabel("Send to");
    // Only URLs that answered the handshake.
    await expect(to.locator("option:not([disabled])")).toHaveText(["My n8n (hooks.n8n.example)", "Team hook (team.example.org)"]);
    await to.selectOption({ label: "My n8n (hooks.n8n.example)" });
    for (const on of ["New wants", "New options", "Prices", "Status changes", "Bought or done"]) await expect(page.getByRole("checkbox", { name: on, exact: true })).toBeChecked();
    for (const off of ["Suggestions from outside", "Comments"]) await expect(page.getByRole("checkbox", { name: off, exact: true })).not.toBeChecked();
    await expect(page.getByText("Only which things changed is sent: ids and times, not their text.", { exact: false })).toBeVisible();
    await expect(page.getByRole("radio", { name: "In the app, under For you" })).toHaveCount(0);
    await page.getByRole("checkbox", { name: "New options", exact: true }).uncheck();
    await page.getByRole("button", { name: "Make this routine" }).click();
    const card = page.locator("article").filter({ hasText: "Sends new wants, prices, status changes and bought or done" }).first();
    await expect(card).toContainText(`Sends new wants, prices, status changes and bought or done to @${ME}'s URL (only which things changed)`);
    await expect(card.getByRole("button", { name: /Run now|Check now/ })).toHaveCount(0);
    await expect(card).not.toContainText("hooks.n8n.example");
    await page.goto("/l/lst_rt_garden");
    await expect(page.locator("main")).toContainText(`Sends new wants, prices, status changes and bought or done to @${ME}'s URL (only which things changed)`);
  });

  test("stopped because its URL stopped answering: the URL holder resumes it, which asks the URL again", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/lists/lst_rt_kitchen/settings#routines");
    const card = page.locator("#routine-rtn_kitchen_url");
    await expect(card).toContainText("Stopped: its URL stopped answering on");
    await expect(card.getByRole("link", { name: "Your URLs" })).toHaveAttribute("href", "/app/account#urls");
    await card.getByRole("button", { name: /^Resume/ }).click();
    await expect(card).toContainText("No calls yet");
    await page.goto("/app/account#urls");
    await expect(page.getByRole("region", { name: "URLs" }).getByRole("listitem").filter({ hasText: "Old server" })).toContainText("Working");
  });
});
