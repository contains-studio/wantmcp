import { expect, test } from "@playwright/test";
import { freshEmail, signIn } from "./helpers";

test("feature emails are optional in Account and persist across sign-in", async ({ page, context }) => {
  const email = freshEmail("account-email");
  const choice = page.getByRole("checkbox", { name: "Email me about new features" });
  await page.goto("/login");
  await expect(choice).toHaveCount(0);
  await signIn(page, email);
  await page.goto("/app/account");
  await expect(choice).not.toBeChecked();
  await choice.check();
  await page.getByRole("button", { name: "Save email preference" }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await context.clearCookies();
  await signIn(page, email);
  await page.goto("/app/account");
  await expect(choice).toBeChecked();
  await choice.uncheck();
  await page.getByRole("button", { name: "Save email preference" }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(choice).not.toBeChecked();
});
