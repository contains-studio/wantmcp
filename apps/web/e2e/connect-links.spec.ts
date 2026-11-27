import { expect, test } from "@playwright/test";

/** Owner, 27 Nov 2026: msgblast's real steps, and every app's section links to the app's own pages. */

test("msgblast: Mac and iPhone steps, demo screenshots, the honest fine print and its own pages", async ({ page }) => {
  await page.goto("/connect?app=msgblast");
  const steps = page.locator("#steps");
  await expect(steps).toContainText("View › Show Wants");
  await expect(steps).toContainText("Connect list");
  await expect(steps).toContainText("Find Offers");
  await expect(steps).not.toContainText("Not available yet");
  await expect(steps.getByText("Not yet checked")).toBeVisible();
  // Until msgblast 0.12.0 is out (MSGBLAST_WANTS_RELEASED), the note is the first thing in its steps.
  const note = steps.getByText("Wants arrives in msgblast 0.12.0. The download today (0.11.1) doesn't have it yet.");
  await expect(note).toBeVisible();
  const firstHeading = steps.getByRole("heading", { name: "On a Mac: sign in" });
  expect((await note.boundingBox())!.y).toBeLessThan((await firstHeading.boundingBox())!.y);
  // The short way is sign-in; the key way goes to /connect/key for msgblast.
  await expect(steps.getByRole("link", { name: /make a key for msgblast/i }).first()).toHaveAttribute("href", "/connect/key?app=msgblast");
  // And the home page's row leaves msgblast out until then.
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Works with" }).getByRole("link", { name: "Connect msgblast" })).toHaveCount(0);
  await page.goto("/connect?app=msgblast");
  await expect(steps.locator("figure img")).toHaveCount(3);
  for (const alt of await steps.locator("figure img").evaluateAll((els) => els.map((e) => e.getAttribute("alt") ?? ""))) expect(alt.length).toBeGreaterThan(20);
  const links = steps.locator(".app-links a");
  await expect(links).toHaveText([/msgblast\.app/, /Download/, /msgblast: Wants/]);
  await expect(links.first()).toHaveAttribute("target", "_blank");
  await expect(links.first()).toHaveAttribute("rel", "noopener noreferrer");
  // No "Then say": msgblast's own Then steps instead.
  await expect(steps.getByText("Then say:")).toHaveCount(0);
});

test("every app's section links to its own site and how it adds a server, with the date checked", async ({ page }) => {
  await page.goto("/connect");
  const apps = await page.getByRole("navigation", { name: "Pick your app" }).getByRole("link").evaluateAll((els) => els.map((e) => new URL((e as HTMLAnchorElement).href).searchParams.get("app")!));
  expect(apps.length).toBe(15);
  for (const app of apps) {
    await page.goto(`/connect?app=${app}`);
    const line = page.locator("#steps .app-links");
    await expect(line, app).toContainText("Links checked 27 Nov 2026");
    const hrefs = await line.locator("a").evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    expect(hrefs.length, app).toBeGreaterThanOrEqual(1);
    for (const h of hrefs) expect(h, app).toMatch(/^https:\/\//);
  }
});
