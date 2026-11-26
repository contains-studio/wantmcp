import { expect, test } from "@playwright/test";
import { createList, freshEmail, signIn } from "./helpers";

/** Owner, 26 Nov 2026: a list shared with nobody says "Share list" (icon and words) with a soft, slow ring. */

const bar = (page: import("@playwright/test").Page) => page.getByRole("toolbar", { name: "List" });

test("a private list with nobody else on it: the share icon with \"Share list\", ringed; opening it stops the pulse for good", async ({ page }) => {
  await signIn(page, freshEmail("share-alone"));
  const id = await createList(page, { format: "Shopping", title: "Just me" });
  await page.goto(`/l/${id}`);
  const share = bar(page).getByRole("button", { name: "Share list" });
  await expect(share).toBeVisible();
  await expect(share.locator("svg")).toHaveCount(1); // the icon stays (owner)
  await expect(share).toHaveClass(/share-invite/);
  await share.click();
  await expect(page.locator(".menu-panel:popover-open")).toBeVisible();
  await expect(share).toHaveClass(/is-seen/);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(bar(page).getByRole("button", { name: "Share list" })).toHaveClass(/is-seen/);
});

test("reduced motion: the ring is held still, no animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, freshEmail("share-still"));
  const id = await createList(page, { format: "Tasks", title: "Still" });
  await page.goto(`/l/${id}`);
  const share = bar(page).getByRole("button", { name: "Share list" });
  await expect(share).toHaveCSS("animation-name", "none");
  expect(await share.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe("none");
});

test("once an agent is on it, or it's public, the header is back to the plain share icon", async ({ page }) => {
  await signIn(page, freshEmail("share-agent-on"));
  const id = await createList(page, { format: "Shopping", title: "With an agent" });
  await page.goto(`/l/${id}`);
  await bar(page).getByRole("button", { name: "Share list" }).click();
  await page.getByText("Share with an agent").click();
  await page.locator("label", { hasText: /^Claude$/ }).click();
  await page.getByRole("button", { name: "Create key and copy prompt" }).click();
  await expect(page.getByText("The key is shown this once.")).toBeVisible();
  await page.goto(`/l/${id}`);
  await expect(bar(page).getByRole("button", { name: "Share list" })).toHaveCount(0);
  await expect(bar(page).getByRole("button", { name: "Share" })).toBeVisible();

  const pub = await createList(page, { format: "Shopping", title: "Public one", visibility: "Public" });
  await page.goto(`/l/${pub}`);
  await expect(bar(page).getByRole("button", { name: "Share list" })).toHaveCount(0);
});

test("visitors and members never see it", async ({ page }) => {
  await signIn(page, "heron@example.com");
  await page.goto("/l/lst_desk2026");
  await expect(bar(page).getByRole("button", { name: "Share list" })).toHaveCount(0);
});
