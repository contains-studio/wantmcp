import { expect, test } from "@playwright/test";
import { createList, freshEmail, signIn } from "./helpers";

/** Picks a layout (and optionally an occasion) in settings, saves, and checks the list page. */
async function useLook(page: import("@playwright/test").Page, id: string, layout: string, cls: string, occasion?: { name: string; cls: string }) {
  await page.goto(`/app/lists/${id}/settings`);
  const look = page.locator("section[aria-labelledby='theme-h']");
  const radio = look.getByRole("radio", { name: new RegExp(`^${layout}\\b`) });
  await radio.click();
  await expect(radio).toBeChecked();
  if (occasion) await look.getByRole("radio", { name: new RegExp(`^${occasion.name}\\b`) }).check();
  await look.getByRole("button", { name: "Save", exact: true }).click();
  await expect(look.getByText("Saved. Your list now uses this look.")).toBeVisible();
  await page.goto(`/l/${id}`);
  await expect(page.locator(".themed").first()).toHaveClass(new RegExp(`\\b${cls}\\b`));
  if (occasion) await expect(page.locator(".themed").first()).toHaveClass(new RegExp(`\\b${occasion.cls}\\b`));
}

test("switch layout and occasion", async ({ page }) => {
  await signIn(page, freshEmail("looks"));
  const id = await createList(page, { format: "Shopping", title: "E2E looks" });
  // An undressed shopping list uses Sheet.
  await expect(page.locator(".themed").first()).toHaveClass(/\btpl-sheet\b/);
  await useLook(page, id, "Cards", "tpl-default");
  await useLook(page, id, "Checklist", "tpl-today");
  await useLook(page, id, "Sections", "tpl-sections");
  await useLook(page, id, "Doc", "tpl-doc");
  await useLook(page, id, "Sheet", "tpl-sheet");
  await useLook(page, id, "Board", "tpl-board", { name: "Christmas", cls: "occ-christmas" });
});
