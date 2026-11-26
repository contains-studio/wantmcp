import { expect, test, type Page } from "@playwright/test";
import { DEMO, freshEmail, signIn } from "./helpers";

async function saveSkill(page: Page, title: string, body = "Size M.") {
  const res = await page.request.post("/app/skills", {
    form: { intent: "save", title, body, description: "" },
    headers: { origin: new URL(page.url()).origin },
    maxRedirects: 0,
  });
  return res.status();
}

test("first run: one line of why, three starters that open the editor filled in, then saved with the next step", async ({ page }) => {
  await signIn(page, freshEmail("skills-first"));
  await page.goto("/app/skills");
  await expect(page.getByRole("heading", { level: 1, name: "Skills" })).toBeVisible();
  await expect(page.getByText("Tell your agents once how you like things done")).toBeVisible();
  await expect(page.getByText("Only agents you connect read these.")).toHaveCount(1);
  for (const name of ["How I shop", "Gifts for my family", "How to ask me things"]) await expect(page.getByRole("link", { name })).toBeVisible();
  await page.getByRole("link", { name: "How I shop" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("How I shop");
  await expect(page.getByLabel("Instructions")).toHaveValue(/Ask me before anything over \$200\./);
  await expect(page.getByLabel("When should agents use it? (optional)")).toHaveValue("Whenever you shop for me");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved. Your agents get it the next time they start work.");
  // No agent yet: the way to connect one.
  await expect(page.getByRole("status").getByRole("link", { name: "Connect one" })).toHaveAttribute("href", "/connect");
  await expect(page.getByRole("heading", { level: 2, name: "How I shop" })).toBeVisible();
});

test("edit a skill, turn it off (it stays, visibly off), then delete it", async ({ page }) => {
  await signIn(page, freshEmail("skills-edit"));
  await page.goto("/app/skills");
  expect(await saveSkill(page, "How to ask me things", "One question at a time.")).toBe(302);
  await page.goto("/app/skills");
  await page.getByRole("link", { name: "How to ask me things" }).click();
  await page.getByLabel("Instructions").fill("One question at a time, with answers I can tap.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("One question at a time, with answers I can tap.")).toBeVisible();
  const toggle = page.getByRole("switch", { name: /How to ask me things/ });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Off: agents don't get it")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: /How to ask me things/ })).toHaveAttribute("aria-checked", "false");
  await page.getByRole("link", { name: "How to ask me things" }).click();
  await page.getByText("Delete skill…").click();
  await page.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(page.getByRole("link", { name: "How I shop" })).toBeVisible(); // back to the starters
});

test("the cap: 20 skills, then a plain sentence and no New skill", async ({ page }) => {
  await signIn(page, freshEmail("skills-cap"));
  await page.goto("/app/skills");
  for (let i = 1; i <= 20; i++) expect(await saveSkill(page, `Skill ${i}`)).toBe(302);
  await page.goto("/app/skills");
  await expect(page.getByRole("link", { name: "New skill" })).toHaveCount(0);
  await expect(page.getByText("You have 20 skills. Delete one to add another.")).toBeVisible();
  // A 21st (an old tab, a second device) gets the server's sentence.
  const res = await page.request.post("/app/skills", { form: { intent: "save", title: "One more", body: "x" }, headers: { origin: new URL(page.url()).origin } });
  expect(res.status()).toBe(429);
});

test("an existing person's skills: on, off, and the tab row fits a phone with three tabs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, DEMO);
  await page.goto("/app/skills");
  await expect(page.getByRole("switch", { name: "How I shop: on" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Gifts for my family: off" })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "View" }).getByRole("link");
  await expect(tabs).toHaveText(["Lists", "Activity", "Skills"]);
  await expect(tabs.nth(2)).toHaveAttribute("aria-current", "page");
  // The header marks the section ("Lists", review C2); the tab marks the page.
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Lists" })).toHaveAttribute("aria-current", "true");
  const tops = await tabs.evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top)))]);
  expect(tops.length).toBe(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the editor on a phone: the instructions grow, nothing scrolls inside, Save stays reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, freshEmail("skills-long"));
  await page.goto("/app/skills?new=blank");
  // Writing one: the intro steps aside so the form starts in the top half of a phone.
  await expect(page.getByText(/Tell your agents once/)).toHaveCount(0);
  expect((await page.getByLabel("Title").boundingBox())!.y).toBeLessThan(844 / 2);
  const long = Array.from({ length: 60 }, (_, i) => `Line ${i + 1}: a standing instruction about sizes, stores or budgets.`).join("\n");
  await page.getByLabel("Title").fill("A long one");
  await page.getByLabel("Instructions").fill(long);
  const box = page.getByLabel("Instructions");
  const scroll = await box.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(scroll).toBeLessThanOrEqual(2);
  // Save sits on the bottom of the screen while typing in the middle of a long text.
  await box.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const save = await page.getByRole("button", { name: "Save" }).boundingBox();
  expect(save!.y + save!.height).toBeLessThanOrEqual(844);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
});

test("Skills is private: signed out, it asks you to sign in", async ({ page }) => {
  await page.goto("/app/skills");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fskills/);
});
