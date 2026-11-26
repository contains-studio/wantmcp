import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const INSTALL = "npx skills add contains-studio/wantmcp --skill list-want-mcp -g";
const MEMORY = "When I talk about things I want, my wish list or gift ideas, use The Want MCP.";

test("the skill is served as a file, a ZIP and a version", async ({ request }) => {
  for (const path of ["/skill.md", "/SKILL.md"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/markdown");
    const body = await res.text();
    expect(body.startsWith("---\nname: list-want-mcp\n")).toBe(true);
    expect(body).toContain("get_updates");
  }
  const zip = await request.get("/skills/list-want-mcp.zip");
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  const bytes = await zip.body();
  expect(bytes.subarray(0, 4).toString("hex")).toBe("504b0304");
  expect(bytes.includes(Buffer.from("list-want-mcp/SKILL.md"))).toBe(true);
  expect(bytes.includes(Buffer.from("list-want-mcp/reference/shop-a-want-list.md"))).toBe(true);

  const v = await (await request.get("/skill.json")).json();
  expect(v.name).toBe("list-want-mcp");
  expect(v.version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(v.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(v.install).toBe(INSTALL);
});

test("/llms.txt tells an agent to install the skill and say so", async ({ request }) => {
  const body = await (await request.get("/llms.txt")).text();
  expect(body).toContain(INSTALL);
  expect(body).toContain("/skill.md as list-want-mcp/SKILL.md");
  expect(body).toContain("Tell your person you did.");
});

test("/connect: each app's way to remember next time, after its steps", async ({ page }) => {
  await page.goto("/connect?app=claude-code");
  const steps = page.locator("#steps");
  await expect(steps.getByText("So it remembers next time:")).toBeVisible();
  await expect(steps.getByText(INSTALL, { exact: true })).toBeVisible();
  await expect(steps.getByRole("button", { name: "Copy the skill install command" })).toBeVisible();
  // The copy-paste prompt carries the same step.
  await steps.getByText("Show all").first().click();
  await expect(steps.locator("pre").filter({ hasText: "If you can install skills" }).first()).toContainText(INSTALL);

  await page.goto("/connect?app=claude");
  const zip = page.locator("#steps").getByRole("link", { name: "download our skill" });
  await expect(zip).toHaveAttribute("href", "/skills/list-want-mcp.zip");
  await expect(page.locator("#steps").getByText("Customize › Skills › + › Upload a skill")).toBeVisible();

  await page.goto("/connect?app=chatgpt");
  await expect(page.locator("#steps").getByText(`“${MEMORY}”`)).toBeVisible();
  await expect(page.locator("#steps").getByRole("button", { name: "Copy the line for memory" })).toBeVisible();
});

test("/connect with the remember step has no accessibility violations @phone", async ({ page }) => {
  for (const app of ["claude-code", "claude", "chatgpt"]) {
    await page.goto(`/connect?app=${app}`);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`), app).toEqual([]);
  }
});
