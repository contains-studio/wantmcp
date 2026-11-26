import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/** Clean-eyes review, batch 1 (25 Nov 2026): things that were wrong or broken. */

test("Privacy and Terms say what is true", async ({ page }) => {
  await page.goto("/privacy");
  const main = page.locator("main");
  await expect(main).toContainText("it starts ticked, except for visitors from the EU, the EEA, the UK and Switzerland");
  await expect(main).toContainText("Every new list starts private.");
  await expect(main).not.toContainText("unticked unless you tick it");
  await expect(main).not.toContainText("Shopping lists start public");
  await expect(main).not.toContainText("public feed");
  await expect(main).toContainText("updated 25 November 2026");
  await page.goto("/terms");
  await expect(page.locator("main")).toContainText("lists of what you want, public or private");
  await expect(page.locator("main")).not.toContainText("public want lists");
});

test("a report that didn't go through says so, once", async ({ request }) => {
  const res = await request.post("/report", { form: { target_type: "list", target_id: "" }, headers: { origin: "http://localhost:5190" } });
  const html = await res.text();
  expect(html).toContain("Your report didn&#x27;t go through");
  expect(html).not.toContain("Report not sent");
  expect(html).not.toContain("We'll take a look. You can also");
});

test("home-screen icon and favicon exist", async ({ request }) => {
  const icon = await request.get("/apple-touch-icon.png");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/png");
  const ico = await request.get("/favicon.ico");
  expect(ico.status()).toBe(200);
});

test("sample lists don't link out to pages that don't exist", async ({ page }) => {
  await page.goto("/themes/sheet");
  await expect(page.locator('a[href*="example.com/sample"], a[href^="https://example.com/lst_"]')).toHaveCount(0);
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("list rows: whole names, and who found it, when and where the price was seen", async ({ page }) => {
    await signIn(page, "tesla@example.com");
    await page.goto("/l/lst_tesla");
    const row = page.locator("#ent_ty_m1");
    // The long title isn't cut.
    const title = row.locator(".sheet-title");
    expect(await title.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && getComputedStyle(el).webkitLineClamp === "none")).toBe(true);
    await expect(row.locator(".sheet-meta")).toBeVisible();
    await expect(row.locator(".sheet-meta-store")).toHaveText("3D MAXpider");
    await expect(row.locator(".sheet-meta")).toContainText(/checked/);
  });

  test("sheets: a Close, a tap outside presses nothing underneath, one form at a time", async ({ page }) => {
    await signIn(page, "tesla@example.com");
    await page.goto("/l/lst_tesla");
    const target = page.getByText(/Add details or a due date/).first();
    const box = (await target.boundingBox())!;
    const share = page.getByRole("toolbar", { name: "List" }).getByRole("button", { name: "Share" });
    await share.click();
    const sheet = page.locator(".menu-panel:popover-open");
    await expect(sheet.getByRole("button", { name: "Close" })).toBeVisible();
    await page.touchscreen.tap(box.x + 20, box.y + box.height / 2);
    await expect(sheet).toHaveCount(0);
    expect(await page.evaluate(() => [...document.querySelectorAll("details")].some((d) => d.open && /due date/i.test(d.querySelector("summary")?.textContent ?? "")))).toBe(false);
    await share.click();
    await page.locator(".menu-panel:popover-open").getByRole("button", { name: "Close" }).click();
    await expect(page.locator(".menu-panel:popover-open")).toHaveCount(0);
    await page.locator("section#itm_ty_shade").getByRole("button", { name: /^More actions for “A glass/ }).click();
    const subs = page.locator(".menu-panel:popover-open details.menu-sub > summary");
    await subs.nth(0).click();
    await subs.nth(1).click();
    await expect(page.locator(".menu-panel:popover-open details.menu-sub[open]")).toHaveCount(1);
  });

  test("after posting a comment from an item's menu, the sheet closes and the comment is in view", async ({ page }) => {
    await signIn(page, "tesla@example.com");
    await page.goto("/l/lst_tesla");
    await page.locator("section#itm_ty_shade").getByRole("button", { name: /^More actions for “A glass/ }).click();
    const menu = page.locator(".menu-panel:popover-open");
    await menu.locator("summary", { hasText: "Comment" }).click();
    const words = `Any with a reflective side? ${Date.now()}`;
    await menu.getByRole("textbox").fill(words);
    await menu.getByRole("button", { name: "Post" }).click();
    await expect(page.locator(".menu-panel:popover-open")).toHaveCount(0);
    await expect(page.getByText(words)).toBeInViewport();
  });

  test("claim page: the question under its want with its choices, the agent's note, how sure each price is, no slab", async ({ page }) => {
    await page.goto(`/claim/clm_e2e_unclaimed_q${Date.now()}`);
    await expect(page.locator("#claim-q")).toHaveCount(0);
    const q = page.getByRole("list", { name: "Choices" });
    await expect(q.getByRole("listitem")).toHaveText(["Velcro", "Laces"]);
    await expect(page.getByText("You can answer once the list is yours.")).toBeVisible();
    await page.goto(`/claim/clm_e2e_car_q${Date.now()}`);
    await expect(page.locator("p", { hasText: /^Muse:/ })).toContainText("sold out at every store I checked");
    await expect(page.getByText(/Checked on the store's page|not checked on the store's page/).first()).toBeVisible();
    // Nothing empty under the Keep bar at the end of the page.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const bar = (await page.locator(".claim-actions").boundingBox())!;
    const footer = (await page.locator("footer").boundingBox())!;
    expect(footer.y - (bar.y + bar.height)).toBeLessThanOrEqual(70);
  });
});
