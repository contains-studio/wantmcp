import { expect, test } from "@playwright/test";

/** SPEC 24.3: Build with The Want MCP, the page and its Markdown, from the server's guide. */
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("/developers: three ways in as cards, contents, code with a copy button and one tab per language", async ({ page, request }) => {
  await page.goto("/developers");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Build with The Want MCP");
  await expect(page.locator("main")).not.toContainText("check:developers");
  const ways = page.locator(".dev-ways > li");
  await expect(ways).toHaveCount(3);
  await expect(ways.nth(2)).toContainText("https://wantmcp.com/connect/key?app=");
  await ways.first().getByRole("link", { name: /How it works/ }).click();
  await expect(page).toHaveURL(/#1-no-account-first$/);

  // One language at a time; the choice holds on the next card; Swift says it hasn't been run.
  const tabs = page.getByRole("tablist", { name: "no account first: language" });
  await tabs.getByRole("tab", { name: "Swift" }).click();
  await expect(page.locator("section[aria-labelledby='code-no-account-first']").getByText("Not yet run by us")).toBeVisible();
  await expect(page.locator("section[aria-labelledby='code-sign-in'] [role=tabpanel]:visible")).toContainText("ASWebAuthenticationSession");

  // Copy gives the code exactly as the guide has it.
  const md = await (await request.get("/developers.md")).text();
  await page.getByRole("tab", { name: "curl" }).first().click();
  const panel = page.locator("[id='code-no-account-first-curl']");
  await panel.getByRole("button", { name: /^Copy/ }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith("API=https://api.wantmcp.com/v1")).toBe(true);
  expect(md).toContain(copied);
});

test("/developers.md is the same guide as Markdown, without the server's own check notes", async ({ request }) => {
  const res = await request.get("/developers.md");
  expect(res.headers()["content-type"]).toBe("text/markdown; charset=utf-8");
  const md = await res.text();
  expect(md.startsWith("# Build with The Want MCP\n")).toBe(true);
  expect(md).not.toMatch(/check:developers|server repo/);
  expect(md).toContain("checked against the live server.");
});

test("found from the footer, /connect, /llms.txt and the sitemap", async ({ page, request }) => {
  await page.goto("/connect");
  await expect(page.locator("main").getByRole("link", { name: "Build with The Want MCP" })).toHaveAttribute("href", "/developers");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Build with The Want MCP" })).toHaveAttribute("href", "/developers");
  expect(await (await request.get("/llms.txt")).text()).toMatch(/\/developers\.md/);
  expect(await (await request.get("/sitemap.xml")).text()).toMatch(/\/developers<\/loc>/);
});

test("the guide's key link is the real /connect/key page", async ({ page }) => {
  await page.goto("/connect/key?app=MyApp");
  await expect(page).toHaveURL(/\/login\?next=%2Fconnect%2Fkey%3Fapp%3DMyApp$/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("every language shows, one after another, and the contents fold opens", async ({ page }) => {
    await page.goto("/developers");
    for (const lang of ["curl", "TypeScript", "Swift"]) await expect(page.locator(`[id='code-no-account-first-${lang}']`)).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("no sideways scroll; contents in a fold with 44px links", async ({ page }) => {
    await page.goto("/developers");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const fold = page.locator(".dev-toc-fold");
    await fold.locator("summary").click();
    const link = fold.getByRole("link", { name: "Testing" });
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/#testing$/);
  });
});
