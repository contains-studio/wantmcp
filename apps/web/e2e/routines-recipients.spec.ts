import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * SPEC 26.20 item 4: "Also send to…" on a routine a person follows, and the signed-out pages its emails link to;
 * SPEC 26.4: "Stop emailing me about this routine". Seed: Garden jobs (private) has due-date reminders followed by
 * email, with mum@example.com (said yes) and neighbour@example.com (asked).
 */
const RT = "routines@example.com";
const ASKED = "rcpmockasked00000000000000";
const YES = "rcpmockyes0000000000000000";
const EMAIL_STOP = "resmockgarden0000000000000";

test.describe.serial("other addresses", () => {
  test("the card: their states, the private-list warning, one ask each, at most 3, and Remove", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/lists/lst_rt_garden/settings#routines");
    const card = page.locator("#routine-rtn_garden_due");
    const also = card.locator("details", { has: page.locator("summary", { hasText: "Also send to…" }) });
    await expect(also).toHaveAttribute("open", "");
    await expect(also.getByRole("listitem").filter({ hasText: "mum@example.com" })).toContainText("Said yes");
    await expect(also.getByRole("listitem").filter({ hasText: "neighbour@example.com" })).toContainText("Asked");
    // A private list: said plainly, and the list's name only if they tick it.
    await expect(also).toContainText("They will see the names of the wants this is about.");
    await expect(also.getByRole("checkbox", { name: "Show the list's name in the ask" })).not.toBeChecked();

    await also.getByRole("textbox", { name: "Their email address" }).fill("friend@example.com");
    await also.getByRole("button", { name: "Ask them" }).click();
    await expect(card.getByRole("status")).toHaveText("Asked. Nothing more goes to them unless they say yes.");
    await expect(also.getByRole("listitem").filter({ hasText: "friend@example.com" })).toContainText("Asked");
    // Three live: no more.
    await expect(also).toContainText("That's 3, the most for one routine.");
    await also.getByRole("button", { name: "Remove friend@example.com" }).click();
    await expect(also.getByRole("listitem").filter({ hasText: "friend@example.com" })).toHaveCount(0);

    // Once per address per routine, in the server's words.
    await also.getByRole("textbox", { name: "Their email address" }).fill("neighbour@example.com");
    await also.getByRole("button", { name: "Ask them" }).click();
    // Right under the button that caused it, inside its form.
    await expect(also.locator("form").filter({ has: page.getByRole("button", { name: "Ask them" }) }).getByRole("alert")).toContainText("Already asked on");
    await expect(card.getByRole("alert")).toHaveCount(1);
  });

  test("the ask: opening never acts; one button for the link's answer; says who and what, never the asker's email", async ({ page, request }) => {
    const res = await request.get(`/recipient-asks/${ASKED}?answer=no`);
    expect(res.headers()["x-robots-tag"]).toBe("noindex");
    expect(res.headers()["cache-control"]).toContain("no-store");
    await page.goto(`/recipient-asks/${ASKED}?answer=no`);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Say no to these emails?");
    await expect(page.locator("main")).toContainText('@bright-wren-2207 on The Want MCP would like to send you reminders before things on it are due for "Garden jobs".');
    await expect(page.locator("main")).not.toContainText("routines@example.com");
    await expect(page.getByRole("button")).toHaveText(["No"]);
    await page.getByRole("button", { name: "No" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("You said no");
    await expect(page.getByRole("status")).toContainText("nobody can ask this address again for 90 days");
  });

  test("Stop these: a private list's name stays out; opening never acts", async ({ page }) => {
    await page.goto(`/recipient-stops/${YES}`);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stop these emails?");
    await expect(page.locator("main")).toContainText("for a list on The Want MCP, from @bright-wren-2207 on The Want MCP.");
    await page.getByRole("button", { name: "Stop these" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stopped");
  });

  test("the adder's card shows what they answered, with no address kept", async ({ page }) => {
    await signIn(page, RT);
    await page.goto("/app/lists/lst_rt_garden/settings#routines");
    const also = page.locator("#routine-rtn_garden_due details", { has: page.locator("summary", { hasText: "Also send to…" }) });
    await expect(also).toContainText("Said no");
    await expect(also).toContainText("Stopped these");
    await expect(also).not.toContainText("mum@example.com");
    await expect(also).not.toContainText("neighbour@example.com");
    await expect(also.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
  });

  test("Stop emailing me about this routine: one button, then email for it is off in Notifications", async ({ page }) => {
    await page.goto(`/routine-email-stops/${EMAIL_STOP}`);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stop emails about “Remind me before things are due”?");
    await page.getByRole("button", { name: "Stop emailing me about it" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("No more emails about it");
    await signIn(page, RT);
    await page.goto("/app/account#notifications");
    await expect(page.getByRole("group", { name: "Email me about these routines" }).getByRole("checkbox", { name: /^Remind me before things are due/ })).not.toBeChecked();
  });
});

test("a link that no longer works says so, and is a 404", async ({ page, request }) => {
  for (const path of ["/recipient-asks/rcpnotatoken0000000000000", "/recipient-stops/rcpnotatoken0000000000000", "/routine-email-stops/resnotatoken0000000000000"]) {
    expect((await request.get(path)).status()).toBe(404);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link no longer works");
  }
});
