import { expect, test } from "@playwright/test";
import { createList, freshEmail, signIn } from "./helpers";

test("the details prompt is skipped when the add form already had details, and saves when it didn't", async ({ page }) => {
  await signIn(page, freshEmail("details"));
  await createList(page, { format: "Tasks", title: "E2E details" });
  const add = page.locator("#add-item");

  // Details written on the add form: no second prompt, and they are kept.
  await add.getByText("Add details or a due date").click();
  await add.locator('input[name="text"]').fill("Book the van");
  await add.locator('textarea[name="details"]').fill("Two-tonne van, Saturday morning");
  await add.getByRole("button", { name: /^Add / }).click();
  const van = page.locator("section.item-section", { hasText: "Book the van" });
  await expect(van.locator(".item-details")).toHaveText("Two-tonne van, Saturday morning");
  await expect(add.getByText("Added. Anything an agent needs?")).toHaveCount(0);

  // No details on the add form: the prompt asks once, and what's typed is saved.
  await add.locator('input[name="text"]').fill("Cancel the gym");
  await add.getByRole("button", { name: /^Add / }).click();
  await expect(add.getByText("Added. Anything an agent needs?")).toBeVisible();
  await add.getByLabel("Added. Anything an agent needs?").fill("Membership ends in March");
  await add.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("section.item-section", { hasText: "Cancel the gym" }).locator(".item-details")).toHaveText("Membership ends in March");
});

test("a 404 reached by client-side navigation reports nothing to /telemetry/error", async ({ page }) => {
  const reports: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/telemetry/error") reports.push(r.url());
  });
  // Start on a public list so the /l/:id route is already known to the browser: starting elsewhere makes the
  // router look the route up first, and a dev server answers that lookup with a document reload.
  await page.goto("/l/lst_desk2026");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => ((window as unknown as { __marker?: string }).__marker = "same-document"));
  // A client-side navigation (React Router follows popstate) onto a list that doesn't exist.
  await page.evaluate(() => {
    history.pushState(null, "", "/l/lst_does_not_exist");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("heading", { level: 1, name: "Nothing here" })).toBeVisible();
  // Still the same document: the error boundary rendered in the browser, not a server page.
  expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe("same-document");
  await page.waitForTimeout(500);
  expect(reports).toEqual([]);
});
