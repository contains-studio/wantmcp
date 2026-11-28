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
  // Email is shown as coming, not offered; nothing is preselected.
  await expect(page.getByRole("radio", { name: "Email, coming soon" })).toBeDisabled();
  const app = page.getByRole("radio", { name: "In the app, under For you" });
  await expect(app).not.toBeChecked();
  await expect(app).toHaveAttribute("required", "");
  await app.check();
  await page.getByRole("button", { name: "Make this routine" }).click();
  const card = page.locator("article").filter({ hasText: "Tell me when “A cast-iron pan, 10 inch” is at my price" });
  await expect(card).toContainText("Whenever a price is posted on “A cast-iron pan, 10 inch”");
  await expect(card).toContainText("You see these in the app");
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

test("a kind this page doesn't know: its name and status, Pause and Delete only", async ({ page }) => {
  await signIn(page, RT);
  await page.goto("/app/routines");
  const card = page.locator("#routine-rtn_weekly");
  await expect(card.getByRole("heading")).toHaveText("A weekly summary");
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
