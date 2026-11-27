import { expect, test, type Page } from "@playwright/test";
import { DEMO, freshEmail, signIn, enterCode } from "./helpers";

/** SPEC 23: counting where visitors come from, and the owner's /app/traffic. */

const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/** The demo owner's numbers for a tag and a sign-up source, read from the page's table and lists. */
async function counts(page: Page, tag: string) {
  await page.goto("/app/traffic?days=7");
  const row = (title: string, name: string) => page.getByRole("region", { name: title }).locator("li", { hasText: name }).locator("span.tabular-nums");
  const read = async (title: string, name: string) => ((await row(title, name).count()) ? Number((await row(title, name).first().textContent())!.replace(/,/g, "")) : 0);
  return { tag: await read("Tags", tag), signups: await read("Sign-ups by source", tag) };
}

test("the owner's traffic: two numbers, visits per day, and the top sources, tags, pages and sign-ups", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/app/traffic");
  await expect(page.getByRole("heading", { level: 1, name: "Traffic" })).toBeVisible();
  await expect(page.locator(".traffic-bar-slot")).toHaveCount(30);
  await expect(page.getByRole("region", { name: "Sources" })).toContainText("news.ycombinator.com");
  await expect(page.getByRole("region", { name: "Pages" })).toContainText("/for/:slug");
  await page.getByRole("link", { name: "7 days" }).click();
  await expect(page.locator(".traffic-bar-slot")).toHaveCount(7);
  await page.getByText("Show as a table").click();
  await expect(page.locator("table tbody tr")).toHaveCount(7);
});

test("anyone the server doesn't allow gets the normal not-found page", async ({ page }) => {
  await signIn(page, freshEmail("traffic-no"));
  const res = await page.goto("/app/traffic");
  expect(res?.status()).toBe(404);
});

test.describe("a real visit (not one of our checks)", () => {
  // These two requests must look like a person's: no check header, an ordinary browser.
  test.use({ extraHTTPHeaders: {}, userAgent: SAFARI });

  test("a page view from a tagged link is counted, and its source is kept once for sign-up", async ({ page, browser }) => {
    const owner = await (await browser.newContext({ extraHTTPHeaders: { "x-wantmcp-check": "1" } })).newPage();
    await signIn(owner, DEMO);
    const before = await counts(owner, "hn-launch");

    const res = await page.goto("/?ref=hn-launch");
    // allHeaders(): headers() leaves cookie headers out.
    const h = await res!.allHeaders();
    expect(h["set-cookie"] ?? "").toMatch(/wm_src=hn-launch;.*Max-Age=2592000/);
    expect(h["cache-control"]).toBe("private, no-store");
    // Set only once: a later visit from elsewhere doesn't replace it.
    const again = await page.goto("/connect?ref=x-post");
    expect((await again!.allHeaders())["set-cookie"] ?? "").not.toMatch(/wm_src=/);

    // Signing up carries the source.
    await page.goto("/login?next=/app");
    await page.getByLabel("Email", { exact: true }).fill(freshEmail("traffic-src"));
    await page.getByRole("button", { name: "Email me a code" }).click();
    await enterCode(page, "123456");
    await expect(page).toHaveURL(/\/app/);

    await expect.poll(async () => (await counts(owner, "hn-launch")).tag).toBeGreaterThan(before.tag);
    expect((await counts(owner, "hn-launch")).signups).toBe(before.signups + 1);
  });
});

test("our own checks are never counted", async ({ page, browser }) => {
  const owner = await (await browser.newContext()).newPage();
  await signIn(owner, DEMO);
  const before = await counts(owner, "check-only");
  await page.goto("/?ref=check-only"); // the suite sends x-wantmcp-check: 1
  const res = await page.goto("/?ref=check-only");
  expect((await res!.allHeaders())["set-cookie"] ?? "").not.toMatch(/wm_src=/);
  expect((await counts(owner, "check-only")).tag).toBe(before.tag);
});
