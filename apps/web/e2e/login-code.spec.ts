import { expect, test, type Page } from "@playwright/test";
import { freshEmail, MOCK_CODE } from "./helpers";

/** SPEC 25: the sign-in code sends itself once it has six digits; the button still works, and without JavaScript too. */

async function toCodeStep(page: Page) {
  await page.goto("/login?next=/app");
  await page.getByLabel("Email", { exact: true }).fill(freshEmail("code"));
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText("It works for 10 minutes. It's sent when you've typed all six digits.")).toBeVisible();
}

/** The sign-in posts made from here on (one per send). */
function countVerifies(page: Page) {
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname.startsWith("/login") && (r.postData() ?? "").includes("intent=verify")) sent.push(r.url());
  });
  return sent;
}

test("typing six digits signs in without a click, with one request", async ({ page }) => {
  await toCodeStep(page);
  const sent = countVerifies(page);
  await page.getByLabel("Code").pressSequentially(MOCK_CODE, { delay: 40 });
  await expect(page).toHaveURL(/\/app$/);
  expect(sent).toHaveLength(1);
});

test("pasting “123 456” signs in", async ({ page }) => {
  await toCodeStep(page);
  // A paste (or the phone filling it from the email) is one input event carrying every digit.
  await page.getByLabel("Code").fill("123 456");
  await expect(page).toHaveURL(/\/app$/);
});

test("five digits do not send", async ({ page }) => {
  await toCodeStep(page);
  const sent = countVerifies(page);
  await page.getByLabel("Code").pressSequentially("12345");
  await page.waitForTimeout(600);
  expect(sent).toHaveLength(0);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("a wrong code comes back empty with the cursor in it; six right digits then sign in", async ({ page }) => {
  await toCodeStep(page);
  const sent = countVerifies(page);
  const field = page.getByLabel("Code");
  await field.pressSequentially("000000");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(field).toHaveValue("");
  await expect(field).toBeFocused();
  await page.keyboard.type(MOCK_CODE);
  await expect(page).toHaveURL(/\/app$/);
  expect(sent).toHaveLength(2);
});

test("a value set by script (not the person) does not send", async ({ page }) => {
  await toCodeStep(page);
  const sent = countVerifies(page);
  await page.getByLabel("Code").evaluate((el: HTMLInputElement) => {
    el.value = "123456";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(600);
  expect(sent).toHaveLength(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the button still signs in", async ({ page }) => {
    await toCodeStep(page);
    await page.getByLabel("Code").fill(MOCK_CODE);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app$/);
  });
});
