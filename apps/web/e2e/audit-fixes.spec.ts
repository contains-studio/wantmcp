import { expect, test } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

/** Bug audit, 27 Nov 2026 (web): the smaller ones. */

test("a mistyped address gets a plain sentence, not the server's field name", async ({ page }) => {
  await page.goto("/login?next=/app");
  const email = page.getByLabel("Email", { exact: true });
  await email.evaluate((el: HTMLInputElement) => (el.form!.noValidate = true)); // past the browser's own check, as an old browser would
  await email.fill("not-an-email@");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("That doesn't look like an email address. Check it and try again.")).toBeVisible();
  await expect(page.getByText("email is not valid")).toHaveCount(0);
});

test("the invite form says the same when the server turns an address down", async ({ page }) => {
  await signIn(page, freshEmail("invite-bad"));
  const id = await createList(page, { format: "Shopping", title: "Invite check" });
  await page.goto(`/app/lists/${id}/settings#sharing-h`);
  const sharing = page.locator("#sharing-h").locator("xpath=ancestor::details[1]");
  if (!(await sharing.evaluate((d: HTMLDetailsElement) => d.open))) await page.locator("#sharing-h").click();
  const box = page.getByLabel("Invite by email");
  await box.evaluate((el: HTMLInputElement) => (el.form!.noValidate = true));
  await box.fill("not-an-email@");
  await page.getByRole("button", { name: "Send invite", exact: true }).click();
  await expect(page.getByText("That doesn't look like an email address. Check it and try again.")).toBeVisible();
  await expect(page.getByText("email is not valid")).toHaveCount(0);
});

test("a session that ends mid-action sends you to sign in and back to the page you were on", async ({ page, context }) => {
  await signIn(page, freshEmail("expired"));
  const id = await createList(page, { format: "Shopping", title: "Expiring" });
  await addItem(page, "A first want");
  // The session ends (signed out elsewhere, expired): the cookie the server no longer knows.
  const host = new URL(page.url()).hostname;
  await context.addCookies([{ name: "wm_session", value: "expired-token", domain: host, path: "/" }]);
  await page.locator("#new-item").fill("A second want");
  await page.locator("#add-item").getByRole("button", { name: /^Add / }).click();
  await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fl%2F${id}`));
});

test("a session cookie the server doesn't know is cleared, also on the way to sign in", async ({ request }) => {
  for (const path of ["/", "/app/account"]) {
    const res = await request.get(path, { headers: { cookie: "wm_session=bogus123" }, maxRedirects: 0 });
    expect(res.headers()["set-cookie"] ?? "", path).toMatch(/wm_session=;.*Max-Age=0/);
  }
});
