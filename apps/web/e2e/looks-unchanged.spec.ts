import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * The current looks stay exactly as they are while a redesigned set lives beside them (branch looks-impeccable).
 * For every look and kind of list, on a phone in dark mode and on a desktop in light mode, the server's HTML is
 * reduced to two fingerprints: its structure (every element's tag, classes and state) and how each element is drawn
 * (computed colours, type, spacing and shape). Both must equal what was recorded from the code before the redesign.
 *
 * To record again after an intended change to the current looks: RECORD_LOOKS=1 pnpm test:e2e looks-unchanged
 */
const FIXTURE = new URL("./fixtures/current-looks.json", import.meta.url);
const LOOKS = ["sheet", "today", "doc", "board", "sections", "heat", "tracker", "gallery"];
const FORMATS = ["shopping", "tasks", "research"];
const PROFILES = {
  "phone-dark": { viewport: { width: 390, height: 844 }, colorScheme: "dark" as const, isMobile: true, hasTouch: true },
  "desktop-light": { viewport: { width: 1280, height: 900 }, colorScheme: "light" as const },
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/** Runs in the page: the look's subtree as two strings. Ids are random per sample, so only their kind is kept. */
function fingerprint() {
  const root = document.querySelector(".themed");
  if (!root) return null;
  const STATE = ["role", "aria-checked", "aria-current", "aria-expanded", "data-status", "data-list-theme", "data-list-format", "open", "type", "name", "inert"];
  const STYLE = ["display", "position", "color", "background-color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-transform", "text-decoration-line", "padding", "margin", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "border-top-color", "border-radius", "opacity", "box-shadow"];
  const structure: string[] = [];
  const drawn: string[] = [];
  const sheets = [...document.querySelectorAll('link[rel="stylesheet"][href*="/theme-css/"]')].map((l) => (l.getAttribute("href") ?? "").split("?")[0]);
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const cls = [...el.classList].sort().join(".");
    const state = STATE.filter((a) => el.hasAttribute(a)).map((a) => `${a}=${el.getAttribute(a)}`).join(",");
    const id = el.id ? `#${el.id.replace(/_[A-Za-z0-9-]+/, "_x").replace(/^:.*$/, ":r")}` : "";
    structure.push(`${el.tagName.toLowerCase()}${id}.${cls}[${state}]`);
    const cs = getComputedStyle(el);
    drawn.push(STYLE.map((p) => cs.getPropertyValue(p)).join("|"));
  }
  const cs = getComputedStyle(root);
  const vars = ["--paper", "--card", "--sunk", "--ink", "--ink-2", "--ink-3", "--line", "--want", "--r-card"].map((v) => `${v}:${cs.getPropertyValue(v).trim()}`).join(";");
  return { elements: structure.length, structure: structure.join("\n"), drawn: drawn.join("\n"), sheets, className: root.className, vars };
}

test("the current looks' pages are unchanged: same markup, same drawing", async ({ browser }) => {
  test.setTimeout(240_000);
  const record = !!process.env.RECORD_LOOKS;
  const saved: Record<string, unknown> = !record && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, "utf8")) : {};
  const now: Record<string, unknown> = {};
  for (const [profile, opts] of Object.entries(PROFILES)) {
    // No JavaScript: what the server sends is what is compared (and the looks must render without it).
    const ctx = await browser.newContext({ ...opts, javaScriptEnabled: false, reducedMotion: "reduce", extraHTTPHeaders: { "x-wantmcp-check": "1" } });
    const page = await ctx.newPage();
    for (const look of LOOKS)
      for (const format of FORMATS) {
        await page.goto(`/themes/${look}?format=${format}`);
        const f = await page.evaluate(fingerprint);
        expect(f, `${look} ${format}: the look renders`).not.toBeNull();
        now[`${look} ${format} ${profile}`] = {
          className: f!.className,
          sheets: f!.sheets,
          vars: f!.vars,
          elements: f!.elements,
          structure: sha(f!.structure),
          drawn: sha(f!.drawn),
        };
      }
    await ctx.close();
  }
  if (record) {
    writeFileSync(FIXTURE, JSON.stringify(now, null, 1) + "\n");
    return;
  }
  for (const [key, value] of Object.entries(now)) expect(value, key).toEqual(saved[key]);
  expect(Object.keys(saved).length, "every recorded look was checked").toBe(Object.keys(now).length);
});
