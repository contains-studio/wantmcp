import { expect, test } from "@playwright/test";

/**
 * During a deploy a fresh request can get the previous build's HTML whose stylesheet is gone. The page reloads once to
 * get the new build; it never loops. Simulated with a list's theme stylesheet (a same-origin <link>).
 */
const docs = (page: import("@playwright/test").Page) => {
  let n = 0;
  page.on("request", (r) => {
    if (r.resourceType() === "document") n++;
  });
  return () => n;
};

test("a missing stylesheet reloads the page once, and the reload gets it", async ({ page }) => {
  let failed = 0;
  await page.route("**/theme-css/sheet.css*", (route) => (failed++ === 0 ? route.fulfill({ status: 404, body: "" }) : route.continue()));
  const count = docs(page);
  await page.goto("/l/lst_desk2026");
  await expect.poll(count).toBe(2);
  await page.waitForLoadState("load");
  await page.waitForTimeout(500);
  expect(count()).toBe(2);
});

test("a stylesheet that stays missing reloads once, never in a loop", async ({ page }) => {
  await page.route("**/theme-css/sheet.css*", (route) => route.fulfill({ status: 404, body: "" }));
  const count = docs(page);
  await page.goto("/l/lst_desk2026");
  await expect.poll(count).toBe(2);
  await page.waitForTimeout(1500);
  expect(count()).toBe(2);
});

test("someone else's stylesheet failing doesn't reload", async ({ page }) => {
  const count = docs(page);
  await page.goto("/l/lst_desk2026");
  await page.evaluate(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://example.invalid/x.css";
    document.head.append(l);
  });
  await page.waitForTimeout(1000);
  expect(count()).toBe(1);
});
