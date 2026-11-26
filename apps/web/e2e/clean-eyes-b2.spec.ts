import { expect, test } from "@playwright/test";
import { addItem, createList, DEMO, freshEmail, signIn } from "./helpers";

/** Clean-eyes review, batch 2 (25 Nov 2026): the signed-in app's unfinished edges. */

test("/app: one name for the lists, the header marks the section on every app page, people counted one way", async ({ page }) => {
  await signIn(page, DEMO);
  // A2: no visible "Lists" label above the cards (the header, title and tab say it).
  await expect(page.locator("#lists-h")).toHaveClass(/sr-only/);
  // A4: the card counts people as the list's header does, you included.
  await expect(page.locator("main")).not.toContainText(/Shared with \d/);
  // C2: "Lists" is marked on Activity and on a list's own page too.
  const lists = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Lists" });
  for (const path of ["/app/activity", "/l/lst_desk2026"]) {
    await page.goto(path);
    await expect(lists).toHaveAttribute("aria-current", "true");
  }
  await page.goto("/app/account");
  await expect(lists).not.toHaveAttribute("aria-current", /.+/);
});

test("/app: + Add names the list and takes the cursor", async ({ page }) => {
  await signIn(page, freshEmail("add-sheet"));
  await createList(page, { format: "Shopping", title: "Home office upgrade" });
  await page.goto("/app");
  await page.getByRole("button", { name: /^\+ Add to Home office upgrade/ }).click();
  const box = page.getByRole("textbox", { name: "Add to Home office upgrade" });
  await expect(box).toBeFocused();
});

test("a new list: Connect one opens this list's own agent step; the add button is the blue one", async ({ page }) => {
  await signIn(page, freshEmail("connect-one"));
  const id = await createList(page, { format: "Tasks", title: "Before we move" });
  await expect(page.getByText("Or add what you want first")).toHaveCount(0);
  await expect(page.locator("#add-item").getByRole("button", { name: /^Add / })).toHaveClass(/btn-want/);
  await page.getByRole("button", { name: "Not now" }).click().catch(() => {});
  await addItem(page, "Book the movers");
  const connect = page.getByRole("link", { name: "Connect one" });
  if (await connect.count()) {
    await connect.click();
    await expect(page).toHaveURL(new RegExp(`/l/${id}\\?share=agent`));
    await expect(page.getByRole("heading", { name: "Share with an agent" })).toBeVisible();
  }
});

test("tasks: no Open pill on open tasks; the status is in the item's menu", async ({ page }) => {
  await signIn(page, freshEmail("open-pill"));
  await createList(page, { format: "Tasks", title: "Errands" });
  await addItem(page, "Return the library books");
  const open = page.locator("section.item-section[data-status='open']").first();
  await expect(open.getByRole("button", { name: /Change status/ })).toHaveCount(0);
  await open.getByRole("button", { name: /^More actions for/ }).click();
  await expect(page.locator(".menu-panel:popover-open").getByText("Status", { exact: true })).toBeVisible();
});

test("an opened done task says its title and its status once each", async ({ page }) => {
  await signIn(page, DEMO);
  await page.goto("/l/lst_tasks");
  const row = page.locator("details.done-row").first();
  await row.locator("> summary").click();
  await expect(row.locator("> summary .done-detail")).toBeHidden();
  await expect(row.locator(".item-title")).toHaveCSS("position", "absolute");
  await expect(row.locator(".check-toggle")).toBeHidden();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the meta line never starts with a dot, and placeholders show whole", async ({ page }) => {
    await signIn(page, "tesla@example.com");
    await page.goto("/l/lst_tesla");
    // Each piece carries its dot after it; a wrapped line starts with a piece, not a dot.
    const starts = await page.locator("#ent_ty_m1 .sheet-meta-piece").evaluateAll((els) => els.map((e) => e.textContent ?? ""));
    expect(starts.every((t) => !t.trim().startsWith("·"))).toBe(true);
    const input = page.locator("#new-item");
    expect(await input.evaluate((el: HTMLInputElement) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });

  test("small controls have 44px to tap", async ({ page }) => {
    await signIn(page, "tesla@example.com");
    await page.goto("/l/lst_tesla");
    const toggle = page.locator("#ent_ty_m1 summary.row-toggle-btn");
    const hit = await toggle.evaluate((el) => {
      const a = getComputedStyle(el, "::after");
      return [parseFloat(a.width), parseFloat(a.height)];
    });
    expect(Math.min(...hit)).toBeGreaterThanOrEqual(44);
  });
});
