import { expect, test } from "@playwright/test";
import { createList, DEMO, freshEmail, signIn } from "./helpers";

/**
 * SPEC 26 (routines, step 2), piece 1: "New routine" is a choice of the kinds launched for this person
 * (routines.kinds_visible), each with its own settings and the required follow choice; target price from the want
 * itself; cards for the new kinds; an unknown kind with only Pause and Delete.
 */

const RT = "routines@example.com";

test("dark: no way to a target price on a want", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_desk2026");
  await page.locator("section.item-section").first().getByRole("button", { name: /^More actions for “/ }).first().click();
  await expect(page.locator(".menu-panel:popover-open")).not.toContainText("at my price");
});

test("the chooser offers exactly the launched kinds, each saying what it does and costs", async ({ page }) => {
  await signIn(page, freshEmail("routines-kinds"));
  const id = await createList(page, { format: "Shopping", title: "Kinds" });
  await page.goto(`/app/lists/${id}/settings#routines`);
  await page.locator("summary", { hasText: "New routine" }).click();
  const kinds = page.getByRole("group", { name: "What should it do?" }).getByRole("radio");
  // A fresh list has no wants yet, so "at my price" has nothing to watch.
  await expect(kinds).toHaveCount(3);
  await expect(page.getByText("Search the web for these wants")).toBeVisible();
  await expect(page.getByText("Uses your Exa key, about 2 cents a search")).toBeVisible();
  await expect(page.getByText("Countdown and order-by dates")).toBeVisible();
  await expect(page.getByText("Remind me before things are due")).toBeVisible();
  await expect(page.getByText("No key needed")).toHaveCount(2);
  // Not launched: never offered.
  await expect(page.getByText("A weekly summary")).toHaveCount(0);
});

test("from a want: “Tell me when it's at my price”, the follow choice required, then a card with Check now", async ({ page }) => {
  await signIn(page, RT);
  await page.goto("/l/lst_rt_kitchen");
  await page.locator("section#itm_rt_pan").getByRole("button", { name: /^More actions for/ }).click();
  await page.locator(".menu-panel:popover-open").getByRole("link", { name: "Tell me when it's at my price" }).click();
  await expect(page).toHaveURL(/settings\?new=target_price&item=itm_rt_pan#routines$/);
  await expect(page.getByRole("radio", { name: /Tell me when it's at my price/ })).toBeChecked();
  await expect(page.getByLabel("Which want")).toHaveValue("itm_rt_pan");
  await page.getByRole("textbox", { name: "At or under" }).fill("45");
  // Two real choices, nothing preselected; "at once" only once email is chosen.
  const app = page.getByRole("radio", { name: "In the app, under For you" });
  const email = page.getByRole("radio", { name: /^In the app and by email/ });
  await expect(app).not.toBeChecked();
  await expect(email).not.toBeChecked();
  await expect(app).toHaveAttribute("required", "");
  await expect(page.getByText(/coming soon/)).toHaveCount(0);
  const atOnce = page.getByRole("checkbox", { name: /Email me at once when it reaches my price/ });
  await expect(atOnce).toHaveCount(0);
  await email.check();
  await expect(page.getByText("Up to 5 a week. Any more come in your daily email.")).toBeVisible();
  await atOnce.check();
  await page.getByRole("button", { name: "Make this routine" }).click();
  const card = page.locator("article").filter({ hasText: "Tell me when “A cast-iron pan, 10 inch” is at my price" });
  await expect(card).toContainText("Whenever a price is posted on “A cast-iron pan, 10 inch”");
  await expect(card).toContainText("You get these in the app and by email, at once");
  await expect(card).not.toContainText("Exa key");
  await card.getByRole("button", { name: /^Check now/ }).click();
  await expect(card.getByRole("status")).toHaveText("Checked.");
});

test("a countdown to an occasion and due-date reminders, each with its own settings", async ({ page }) => {
  await signIn(page, freshEmail("routines-countdown"));
  const id = await createList(page, { format: "Shopping", title: "Gifts" });
  await page.goto(`/app/lists/${id}/settings#routines`);
  await page.locator("summary", { hasText: "New routine" }).click();
  await page.getByRole("radio", { name: /Countdown and order-by dates/ }).check();
  await page.getByLabel("The day").selectOption("christmas");
  await expect(page.getByLabel("Allow this many days for delivery")).toHaveValue("5");
  await page.getByRole("radio", { name: "In the app, under For you" }).check();
  await page.getByRole("button", { name: "Make this routine" }).click();
  await expect(page.locator("article").filter({ hasText: "Countdown to Christmas" })).toContainText("Counting down to Christmas");

  await page.reload();
  await page.locator("summary", { hasText: "New routine" }).click();
  // The countdown is one per list: not offered again.
  await expect(page.getByRole("radio", { name: /Countdown and order-by dates/ })).toHaveCount(0);
  await page.getByRole("radio", { name: /Remind me before things are due/ }).check();
  await expect(page.getByRole("checkbox", { name: "1 day" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "7 days" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Tell me once" })).toBeChecked();
  await page.getByRole("radio", { name: "In the app, under For you" }).check();
  await page.getByRole("button", { name: "Make this routine" }).click();
  await expect(page.locator("article").filter({ hasText: "Remind me before things are due" })).toContainText("for wants with a due date");
});

test("email for a routine: chosen when making it, changed on its card and in Notifications, or stopped for all", async ({ page }) => {
  await signIn(page, freshEmail("routines-email"));
  const id = await createList(page, { format: "Shopping", title: "Gifts" });
  await page.goto(`/app/lists/${id}/settings#routines`);
  await page.locator("summary", { hasText: "New routine" }).click();
  await page.getByRole("radio", { name: /Remind me before things are due/ }).check();
  // Not a target price: no "at once".
  await page.getByRole("radio", { name: /^In the app and by email/ }).check();
  await expect(page.getByRole("checkbox", { name: /at once/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Make this routine" }).click();
  const card = page.locator("article").filter({ hasText: "Remind me before things are due" });
  await expect(card).toContainText("You get these in the app and by email");
  await card.getByRole("button", { name: /^App only/ }).click();
  await expect(card).toContainText("You see these in the app");
  await card.getByRole("button", { name: /^Email me too/ }).click();
  await expect(card).toContainText("You get these in the app and by email");

  await page.goto("/app/account#notifications");
  const n = page.getByRole("region", { name: "Notifications" });
  const mine = n.getByRole("group", { name: "Email me about these routines" }).getByRole("checkbox", { name: /^Remind me before things are due/ });
  await expect(mine).toBeChecked();
  await expect(n.getByRole("link", { name: "Gifts" })).toHaveAttribute("href", `/app/lists/${id}/settings#routines`);
  await expect(n.getByLabel("It comes at")).toHaveValue("8");
  await expect(n.getByRole("option", { name: "about 8:00" })).toHaveCount(1);
  await mine.uncheck();
  await n.getByLabel("It comes at").selectOption("19");
  await n.getByRole("button", { name: "Save" }).click();
  await expect(n.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(mine).not.toBeChecked();
  await expect(n.getByLabel("It comes at")).toHaveValue("19");

  await mine.check();
  await n.getByRole("button", { name: "Save" }).click();
  await expect(n.getByRole("status")).toHaveText("Saved.");
  await n.getByRole("button", { name: "Stop all routine emails" }).click();
  await expect(n.getByRole("status")).toHaveText("Stopped. No routine emails; your routines still show in the app.");
  await page.reload();
  await expect(mine).not.toBeChecked();
  await expect(n.getByLabel(/A daily email with what my routines found/)).not.toBeChecked();
  await expect(n.getByRole("button", { name: "Stop all routine emails" })).toHaveCount(0);
  await page.goto(`/app/lists/${id}/settings#routines`);
  await expect(card).toContainText("You see these in the app");
});

test("ask my agent to check: one of my own agents, what to check, and whether it is listening, with /connect's instruction", async ({ page }) => {
  await signIn(page, RT);
  await page.goto("/app/lists/lst_rt_garden/settings#routines");
  await page.locator("summary", { hasText: "New routine" }).click();
  await page.getByRole("radio", { name: /Ask my agent to check/ }).check();
  const agent = page.getByLabel("Which agent");
  // Both of my agents on this list; nothing chosen while there are two.
  await expect(agent.locator("option:not([disabled])")).toHaveText(["Claude", "Hermes"]);
  await expect(agent).toHaveValue("");
  await agent.selectOption({ label: "Claude" });
  await expect(page.getByRole("checkbox", { name: /Prices last checked more than/ })).toBeChecked();
  await expect(page.getByRole("spinbutton", { name: /Prices last checked more than, days/ })).toHaveValue("3");
  await expect(page.getByRole("spinbutton", { name: /Wants with nothing new for, days/ })).toHaveValue("7");
  await page.getByRole("checkbox", { name: /Wants with nothing new for/ }).uncheck();
  await page.getByRole("radio", { name: "In the app, under For you" }).check();
  await page.getByRole("button", { name: "Make this routine" }).click();
  const card = page.locator("article").filter({ hasText: "Ask Claude to check every Friday" });
  await expect(card).toContainText("Claude sees this the next time it looks (last seen");
  await expect(card.getByRole("region", { name: "Instruction for a scheduled run" })).toHaveText(
    "Every morning, call get_updates on my Want MCP lists, re-check the prices you posted, and answer what is new.",
  );
  await expect(card.getByRole("button", { name: "Copy" })).toBeVisible();
  await card.locator("summary", { hasText: "Apps that can run on a schedule" }).click();
  await expect(card.getByRole("link", { name: "Automations" })).toHaveAttribute("href", "https://cursor.com/docs/cloud-agent/automations");

  // Claude has one now: only Hermes is left, chosen for me, and Hermes listens.
  await page.reload();
  await page.locator("summary", { hasText: "New routine" }).click();
  await page.getByRole("radio", { name: /Ask my agent to check/ }).check();
  await expect(page.getByLabel("Which agent")).toHaveValue("agt_rt_hermes");
  await page.getByRole("radio", { name: "In the app, under For you" }).check();
  await page.getByRole("button", { name: "Make this routine" }).click();
  const hermes = page.locator("article").filter({ hasText: "Ask Hermes to check every Friday" });
  await expect(hermes).toContainText("Hermes is listening: it is told the moment this is due.");
  await expect(hermes.getByRole("region", { name: "Instruction for a scheduled run" })).toHaveCount(0);
});

test("ask my agent to check: not offered without an agent of my own on the list", async ({ page }) => {
  await signIn(page, RT);
  // Ana's birthday is Sam's list; none of my agents writes it.
  await page.goto("/app/lists/lst_rt_ana/settings#routines");
  await page.locator("summary", { hasText: "New routine" }).click();
  await expect(page.getByRole("radio", { name: /Ask my agent to check/ })).toHaveCount(0);
});

test("a weekly summary: made on the Routines tab, never on a list; which lists, its day and hour, and where I see it", async ({ page }) => {
  await signIn(page, freshEmail("routines-weekly"));
  const id = await createList(page, { format: "Shopping", title: "Birthday" });
  await page.goto(`/app/lists/${id}/settings#routines`);
  await page.locator("summary", { hasText: "New routine" }).click();
  await expect(page.getByText(/weekly summary/i)).toHaveCount(0);

  await page.goto("/app/routines");
  const own = page.getByRole("region", { name: "Just for you" });
  await own.locator("summary", { hasText: "New weekly summary" }).click();
  await expect(own.getByRole("radio", { name: "All the lists I write, now and later" })).toBeChecked();
  await expect(own.getByRole("checkbox", { name: "Birthday" })).toHaveCount(0);
  await own.getByRole("radio", { name: "Only these" }).check();
  await own.getByRole("checkbox", { name: "Birthday" }).check();
  await expect(own.getByRole("combobox", { name: "Every", exact: true })).toHaveValue("sun");
  // The person's email hour, as the default.
  await expect(own.getByRole("combobox", { name: "At", exact: true })).toHaveValue("8");
  await expect(own.getByRole("radio", { name: "In the app, under For you" })).not.toBeChecked();
  await expect(own.getByRole("radio", { name: /^In the app and by email/ })).not.toBeChecked();
  await own.getByRole("radio", { name: /^In the app and by email/ }).check();
  await own.getByRole("button", { name: "Make this routine" }).click();
  const card = own.locator("article").filter({ hasText: "A weekly summary of my lists" });
  await expect(card).toContainText("Sunday");
  await expect(card).toContainText("You get these in the app and by email");
  // One each: not offered again.
  await page.reload();
  await expect(own.locator("summary", { hasText: "New weekly summary" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No routines on your lists yet" })).toBeVisible();
});

test("a kind this page doesn't know: its name and status, Pause and Delete only", async ({ page }) => {
  await signIn(page, RT);
  await page.goto("/app/routines");
  const card = page.locator("#routine-rtn_future");
  await expect(card.getByRole("heading")).toHaveText("Call my URL when something changes");
  await expect(card.getByRole("button", { name: /^Pause/ })).toBeVisible();
  await expect(card.locator("summary", { hasText: /^Delete/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /Run now|Check now/ })).toHaveCount(0);
  await expect(card.getByText("History")).toHaveCount(0);
  await expect(card.getByText("Rename")).toHaveCount(0);
});

test("restock: made on a want with no follow choice; its proposal says what it was and offers Add it back", async ({ page }) => {
  await signIn(page, RT);
  await page.goto("/l/lst_rt_kitchen");
  const beans = page.locator("section#itm_rt_beans");
  // The server's note, in its two parts.
  await expect(beans).toContainText("Bought on 1 Nov at Trader Joe's for $14.99");
  await expect(beans).toContainText("brought back by your routine");
  await expect(beans.getByRole("button", { name: /^Not this time/ })).toBeVisible();
  await beans.getByRole("button", { name: /^Add it back/ }).click();
  await expect(page.locator("section#itm_rt_beans")).not.toContainText("brought back by your routine");

  await page.goto("/app/lists/lst_rt_kitchen/settings#routines");
  await page.locator("summary", { hasText: "New routine" }).click();
  await page.getByRole("radio", { name: /Bring it back after I buy it/ }).check();
  // It tells nobody anything: no follow choice.
  await expect(page.getByRole("radio", { name: "In the app, under For you" })).toHaveCount(0);
  await page.locator("select[name=restock_item_id]").selectOption("itm_rt_kettle");
  await page.getByRole("spinbutton", { name: "Bring it back after" }).fill("2");
  await page.getByLabel("Weeks or months").selectOption("month");
  await page.getByRole("button", { name: "Make this routine" }).click();
  await expect(page.locator("article").filter({ hasText: "Bring back “A good kettle”" })).toContainText("it comes back after 2 months");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("picking a kind shows just it, its settings and the follow choice, with Make in view; Change brings the others back", async ({ page }) => {
    await signIn(page, freshEmail("routines-pick"));
    const id = await createList(page, { format: "Shopping", title: "Pick one" });
    await page.goto(`/app/lists/${id}/settings#routines`);
    await page.locator("summary", { hasText: "New routine" }).click();
    const options = page.locator("input[name=kind]");
    await expect(options).toHaveCount(3);
    for (const name of [/Countdown and order-by dates/, /Remind me before things are due/, /Search the web for these wants/]) {
      await page.getByRole("radio", { name }).check();
      await expect(options).toHaveCount(1);
      if (!/Search the web/.test(String(name))) {
        // The follow choice comes before the button.
        const follow = await page.getByRole("radio", { name: "In the app, under For you" }).boundingBox();
        const make = await page.getByRole("button", { name: "Make this routine" }).boundingBox();
        expect(follow!.y).toBeLessThan(make!.y);
      }
      await page.getByRole("button", { name: /^Make this routine|^Add your Exa key/ }).or(page.getByRole("link", { name: "Add your Exa key" })).first().scrollIntoViewIfNeeded();
      const top = await page.getByRole("radio", { name }).boundingBox();
      const end = await page.getByRole("button", { name: "Make this routine" }).or(page.getByRole("link", { name: "Add your Exa key" })).first().boundingBox();
      // The chosen kind and the way to make it fit one 844px screen.
      expect(end!.y + end!.height - top!.y).toBeLessThan(844 - 64);
      await page.getByRole("button", { name: /^Change/ }).click();
      await expect(options).toHaveCount(3);
    }
  });
});
