import { expect, test } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

test("sign in with an emailed code, then sign out @phone", async ({ page }) => {
  await signIn(page, freshEmail("auth"));
  await expect(page.getByRole("heading", { name: "Get started" })).toBeVisible();
  await page.goto("/app/account");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  // Signed out: /app sends you to sign in.
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
});

for (const format of ["Shopping", "Tasks", "Research"] as const) {
  test(`create a ${format.toLowerCase()} list and add an item @phone`, async ({ page }) => {
    await signIn(page, freshEmail(format.toLowerCase()));
    await createList(page, { format, title: `E2E ${format}` });
    await expect(page.getByRole("heading", { level: 1, name: `E2E ${format}` })).toBeVisible();
    await addItem(page, `First ${format.toLowerCase()} item`);
  });
}

test("a private list is the same 404 as a missing list to a signed-out visitor", async ({ page, browser }) => {
  await signIn(page, freshEmail("private"));
  const id = await createList(page, { format: "Shopping", title: "E2E private", visibility: "Private" });
  await addItem(page, "Something only I can see");

  const visitor = await browser.newContext();
  const v = await visitor.newPage();
  const priv = await v.goto(`/l/${id}`);
  const privHeading = await v.getByRole("heading", { level: 1 }).textContent();
  const privText = await v.locator("main").innerText();
  const missing = await v.goto("/l/lst_does_not_exist");
  const missingHeading = await v.getByRole("heading", { level: 1 }).textContent();
  expect(priv?.status()).toBe(404);
  expect(missing?.status()).toBe(404);
  expect(privHeading).toBe(missingHeading);
  expect(privText).not.toContain("E2E private");
  expect(privText).not.toContain("Something only I can see");
  await visitor.close();
});
