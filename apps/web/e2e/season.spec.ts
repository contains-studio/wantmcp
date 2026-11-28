import { expect, test } from "@playwright/test";
import { atTime } from "./helpers";

/**
 * The home page's season band (app/lib/season.ts): each occasion leaves the band once its last day is over (midnight
 * US Pacific), so the band leads with the next one; with none left, no band and no heading. The clock is set per test
 * (helpers.ts: atTime), so nothing here depends on today's date.
 */
const BAND = "section[aria-labelledby=season-h]";
const CASES: Array<[when: string, at: string, tiles: string[]]> = [
  ["Black Friday", "2026-11-27T23:59:00-08:00", ["Black Friday", "Cyber Monday", "Chanukah", "Christmas", "Kwanzaa"]],
  ["the day after", "2026-11-28T00:00:00-08:00", ["Cyber Monday", "Chanukah", "Christmas", "Kwanzaa"]],
  ["1 December", "2026-12-01T09:00:00-08:00", ["Chanukah", "Christmas", "Kwanzaa"]],
  ["26 December", "2026-12-26T09:00:00-08:00", ["Kwanzaa"]],
];

for (const [when, at, tiles] of CASES) {
  test(`the season band on ${when}: ${tiles.join(", ")}`, async ({ page }) => {
    await atTime(page, at);
    await page.goto("/");
    const band = page.locator(BAND);
    await expect(band.getByRole("heading", { name: "Have your agents help you get the right gifts this season." })).toBeVisible();
    await expect(band.locator(".look-tile")).toHaveCount(tiles.length);
    for (const [i, name] of tiles.entries()) await expect(band.locator(".look-tile").nth(i).getByRole("link", { name, exact: true })).toBeVisible();
  });
}

test("on 2 January 2027 there is no band and no heading", async ({ page }) => {
  await atTime(page, "2027-01-02T00:00:00-08:00");
  await page.goto("/");
  await expect(page.locator(BAND)).toHaveCount(0);
  await expect(page.getByText("Have your agents help you get the right gifts this season.")).toHaveCount(0);
});

test("a passed occasion keeps its preview, and a list can still start in its look", async ({ page }) => {
  await atTime(page, "2026-12-01T09:00:00-08:00");
  await page.goto("/themes/sheet--black-friday");
  await expect(page.getByRole("link", { name: "Start a Black Friday list" })).toBeVisible();
  await page.goto("/for/black-friday-shopping-list");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A Black Friday list with the price before the sale");
});
