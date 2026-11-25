import { expect, test } from "@playwright/test";
import { freshEmail, MOCK_CODE } from "./helpers";

test("too many codes says when to try again", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("slow@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("Too many tries for now. Try again in 5 minutes.")).toBeVisible();
});

test("a sign-in attempt is carried in a cookie, never in the page", async ({ page, context }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("attempt"));
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByLabel("Code")).toBeVisible();
  const attempt = (await context.cookies()).find((c) => c.name === "wm_attempt");
  expect(attempt?.httpOnly).toBe(true);
  expect(await page.content()).not.toContain(attempt!.value);
  await page.getByLabel("Code").fill(MOCK_CODE);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
  expect((await context.cookies()).some((c) => c.name === "wm_attempt")).toBe(false);
});

for (const next of ["/\\evil.example", "//evil.example", "/%09/evil.example", "/%0A/evil.example"]) {
  test(`sign-in never follows next=${JSON.stringify(next)} off the site`, async ({ page }) => {
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    await page.getByLabel("Email", { exact: true }).fill(freshEmail("next"));
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.getByLabel("Code").fill(MOCK_CODE);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/app$/);
  });
}
