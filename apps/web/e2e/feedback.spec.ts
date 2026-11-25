import { expect, test } from "@playwright/test";
import { DEMO, signIn } from "./helpers";

/** SPEC 16.5: feedback from anyone, in three kinds, onto our own list. */

test("the footer link carries the page, never the token", async ({ page }) => {
  await page.goto("/claim/clm_e2e_car_fb1");
  const link = page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Feedback" });
  await expect(link).toHaveAttribute("href", "/feedback?from=%2Fclaim");
  await page.goto("/feedback");
  await expect(page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Feedback" })).toHaveAttribute("href", "/feedback");
});

for (const [label, kind, field] of [
  ["Something broke", "bug", "What happened?"],
  ["It didn't do what I expected", "expectation", "What happened?"],
  ["I wish it could…", "request", "What should it do?"],
] as const) {
  test(`signed out: ${kind}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/feedback?from=%2Fclaim");
    await page.getByRole("radio", { name: label }).check();
    await page.getByLabel(field).fill(`Testing ${kind}: the claim page took a while to load.`);
    if (kind === "request") await expect(page.getByLabel(/What did you expect/)).toHaveCount(0);
    else await page.getByLabel(/What did you expect/).fill("A faster page.");
    await expect(page.getByLabel(/email/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Thanks. It's on our list." })).toBeVisible();
    await expect(page.getByText(/reply|get back to you|we'll be in touch/i)).toHaveCount(0);
  });
}

test("signed in: the same page, one step", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/feedback");
  await page.getByRole("radio", { name: "Something broke" }).check();
  await page.getByLabel("What happened?").fill("The share image didn't update.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Thanks. It's on our list." })).toBeVisible();
});

test("the limit shows the server's sentence, and what was written stays", async ({ page }) => {
  await page.goto("/feedback");
  await page.getByRole("radio", { name: "Something broke" }).check();
  await page.getByLabel("What happened?").fill("mock: rate limit");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("alert")).toHaveText("That's a lot of feedback from one network today. Try again tomorrow.");
  await expect(page.getByLabel("What happened?")).toHaveValue("mock: rate limit");
});

test("the box grows with the text: nothing scrolls inside", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/feedback");
  const box = page.getByLabel("What happened?");
  await box.fill(Array.from({ length: 25 }, (_, i) => `Line ${i + 1}`).join("\n"));
  expect(await box.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(2);
});

test("SPEC 16.2: feedback lands held on our list: the owner sees it and accepts it; visitors never see it until then", async ({ page, browser }) => {
  const words = `Held check ${Date.now()}: the price chart overlaps on a phone.`;
  await page.goto("/feedback?from=%2Fl");
  await page.getByRole("radio", { name: "Something broke" }).check();
  await page.getByLabel("What happened?").fill(words);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Thanks. It's on our list." })).toBeVisible();

  // A visitor's page (from the mock's reader response) carries no held item at all.
  const visitor = await browser.newContext();
  const html = await (await visitor.request.get("/l/lst_feedback")).text();
  expect(html).not.toContain("Held check");
  expect(html).not.toContain("Let me reorder wants");
  expect(html).toContain("The share image still shows the old title");

  await signIn(page, "team@example.com");
  await page.goto("/l/lst_feedback");
  const row = page.locator("section", { hasText: words });
  await expect(row.getByText("From outside")).toBeVisible();
  await expect(row.getByText("· not public yet")).toBeVisible();
  // Someone else's words: plain text, never a link.
  await expect(page.locator("section", { hasText: "Let me reorder" }).locator('a[href*="example.com/reorder"]')).toHaveCount(0);
  // One quiet action in the row; no menu to open.
  await row.getByRole("button", { name: /^Accept/ }).click();
  await expect(row.getByText("· not public yet")).toHaveCount(0);
  await expect(row.getByRole("status")).toHaveText("· Accepted");
  await expect(row.getByRole("button", { name: /^Accept/ })).toHaveCount(0);
  await expect(row.getByText("From outside")).toBeVisible();

  const after = await (await visitor.request.get("/l/lst_feedback")).text();
  expect(after).toContain("Held check");
  expect(after).not.toContain("Let me reorder wants");
  await visitor.close();
});

test.describe("on a touch phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("a held report on a phone: compact, Accept in reach, said once; the connect card waits until after the reports", async ({ page }) => {
  const tag = `compact ${Date.now()}`;
  await page.goto("/feedback?from=%2Fclaim");
  await page.getByRole("radio", { name: "It didn't do what I expected" }).check();
  await page.getByLabel("What happened?").fill(`The claim page showed my wants but not the products my agent found (${tag}).`);
  await page.getByLabel(/What did you expect/).fill("Products with prices under each want.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Thanks. It's on our list." })).toBeVisible();
  await signIn(page, "team@example.com");
  await page.goto("/l/lst_feedback");
  const row = page.locator("section", { hasText: tag }).first();
  expect(await row.evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(180);
  // The report is said once: the title carries it, the folded line adds only what the title doesn't.
  await expect(row.locator(".item-details")).toHaveText(/^Expected: Products with prices under each want\. · From someone not signed in/);
  const accept = row.getByRole("button", { name: /^Accept/ });
  expect((await accept.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await row.getByRole("button", { name: "Show all" }).click();
  await expect(row.locator(".item-details")).toContainText(`The claim page showed my wants but not the products my agent found (${tag}).`);
  // With reports waiting, the "Give this list to your agent" card comes after them.
  const card = page.getByRole("heading", { name: "Give this list to your agent" });
  if (await card.count()) {
    const cardTop = await card.evaluate((el) => el.getBoundingClientRect().top);
    const rowTop = await row.evaluate((el) => el.getBoundingClientRect().top);
    expect(cardTop).toBeGreaterThan(rowTop);
  }
});
});

test("/app: a list with reports waiting says so, and doesn't look empty or idle", async ({ page }) => {
  await signIn(page, "team@example.com");
  await page.goto("/app");
  const card = page.locator("li.card", { has: page.getByRole("link", { name: "What we're working on" }) });
  await expect(card.getByText(/^\d+ waiting for you to accept$/)).toBeVisible();
  await expect(card.getByText("0 tasks")).toHaveCount(0);
  await expect(card.getByText("No agent has worked on this yet.")).toHaveCount(0);
});

test("SPEC 16.6: the thanks screen gives the report's status link; the page shows where it stands, never the report", async ({ page }) => {
  const words = `Status check ${Date.now()}: secret details of the report`;
  await page.goto("/feedback");
  await page.getByRole("radio", { name: "Something broke" }).check();
  await page.getByLabel("What happened?").fill(words);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Thanks. It's on our list." })).toBeVisible();
  const link = page.getByRole("link", { name: "See what happens to it" });
  await expect(link).toHaveAttribute("href", /^\/feedback\/fbk_[A-Za-z0-9_-]+$/);
  // The API's own status_url, as given (the mock answers with https://wantmcp.com/feedback/<id>); a reload keeps it.
  const code = page.locator("code", { hasText: /\/feedback\/fbk_/ });
  await expect(code).toHaveText(/^https:\/\/wantmcp\.com\/feedback\/fbk_[A-Za-z0-9_-]+$/);
  await page.reload();
  await expect(code).toHaveText(/^https:\/\/wantmcp\.com\/feedback\/fbk_/);
  await expect(page.getByRole("button", { name: "Copy the link to this report's status" })).toBeVisible();

  await link.click();
  await expect(page.getByRole("heading", { level: 1, name: "We have it. Nobody has looked yet." })).toBeVisible();
  await expect(page.getByText(/^Something broke · sent /)).toBeVisible();
  await expect(page.getByRole("link", { name: "Send more feedback" })).toHaveAttribute("href", "/feedback");
  expect(await page.content()).not.toContain("secret details");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  const res = await page.request.get(page.url());
  expect(res.headers()["x-robots-tag"]).toBe("noindex");
  expect(res.headers()["cache-control"]).toContain("no-store");
});

test("SPEC 16.6: an unknown report id is the ordinary not-found page", async ({ page }) => {
  for (const path of ["/feedback/fbk_doesnotexist", "/feedback/not-an-id"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Nothing here" })).toBeVisible();
  }
});

test("robots.txt keeps status pages out and /feedback in", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Disallow: /feedback/\n");
  expect(body).not.toMatch(/Disallow: \/feedback\n/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/feedback/");
});

test("SPEC 16.6: on a report from outside, the completion note says the sender will see it", async ({ page }) => {
  await signIn(page, "team@example.com");
  await page.goto("/l/lst_feedback");
  const row = page.locator("section", { hasText: "The share image still shows the old title" });
  await row.getByRole("button", { name: /In progress/ }).click();
  await row.getByText("Done, with a note").click();
  await expect(row.getByText("The sender sees the status and this note.")).toBeVisible();
});
