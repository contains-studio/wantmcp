/**
 * Accessibility check (axe-core, WCAG 2.2 A/AA rules) over the main pages, signed out and in,
 * at phone and desktop widths, in light and dark. Drives the installed Chrome.
 *
 *   pnpm dev                          # API_BASE_URL=mock
 *   pnpm check:a11y                   # or: node scripts/check-a11y.mjs http://localhost:5173 [--themes]
 *
 * --themes also checks every theme preview (/themes/:slug) in both schemes.
 * Set CHROME_PATH if Chrome is not in the usual place.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
import { tagPage } from "./check-header.mjs";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:5173";
const WITH_THEMES = process.argv.includes("--themes");
const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/google-chrome");

const PUBLIC_PAGES = ["/", "/connect", "/privacy", "/terms", "/themes", "/login", "/l/lst_desk2026", "/l/lst_desk2026?view=sheet", "/does-not-exist", "/for", "/for/black-friday-shopping-list", "/for/christmas-hosting-checklist", "/for/kwanzaa-gift-list", "/for/task-list-for-multiple-coding-agents", "/claim/clm_seed_unclaimed", "/claim/clm_e2e_car_a11y", "/claim/clm_e2e_tasks_a11y", "/claim/clm_e2e_research_a11y", "/claim/clm_seed_handover", "/claim/clm_seed_expired", "/login?next=/claim", "/invite/inv_seed_from_agent", "/l/lst_desk2026?ref=share", "/connect?app=chatgpt", "/connect?app=grok-bot", "/unsubscribe/unsub_check_a11y", "/for/black-friday-shopping-list?list=tasks", "/feedback", "/feedback?from=%2Fclaim", "/feedback?sent=1", "/l/lst_feedback", "/feedback/fbk_seed_received", "/feedback/fbk_seed_working", "/feedback/fbk_seed_done", "/feedback/fbk_seed_closed", "/feedback/fbk_nope", "/themes/sheet--christmas", "/themes/sheet--black-friday", "/developers", "/connect?app=msgblast"];
const SIGNED_IN_PAGES = ["/app", "/app/skills", "/app/skills?new=shop", "/app/skills?edit=skl_shop", "/app/new", "/app?list=lst_tasks", "/account", "/app/lists/lst_desk2026/settings", "/app/lists/lst_tasks/settings", "/l/lst_tasks", "/l/lst_research", "/l/lst_desk2026", "/connect/key?app=msgblast"];
const VIEWPORTS = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true }, desktop: { width: 1280, height: 900 } };
const SCHEMES = ["light", "dark"];

async function signIn(email) {
  const h = { "content-type": "application/x-www-form-urlencoded", accept: "text/html" };
  const form = (o) => new URLSearchParams(o).toString();
  await fetch(`${BASE}/login?next=/app`, { method: "POST", headers: h, body: form({ email, next: "/app" }) });
  const res = await fetch(`${BASE}/login?next=/app`, { method: "POST", headers: h, body: form({ intent: "verify", email, code: "123456", next: "/app" }), redirect: "manual" });
  const pair = (res.headers.get("set-cookie") ?? "").split(";")[0];
  if (!pair.startsWith("wm_session=")) throw new Error(`sign-in failed: ${res.status}`);
  return pair.slice("wm_session=".length);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
const found = new Map(); // rule id -> { impact, help, where: Set }
let checked = 0;

async function audit(path, { session, viewport, scheme }) {
  const page = await tagPage(await browser.newPage());
  await page.setViewport(VIEWPORTS[viewport]);
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: scheme },
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  if (session) await page.setCookie({ name: "wm_session", value: session, url: BASE });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
  await page.addScriptTag({ content: AXE });
  const result = await page.evaluate(async () => {
    // @ts-ignore axe is injected above
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
      rules: { region: { enabled: false } },
    });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => `${n.target.join(" ")}  ${(n.any[0]?.message ?? "").split(". ")[0].slice(0, 140)}`) }));
  });
  await page.close();
  checked++;
  for (const v of result) {
    const entry = found.get(v.id) ?? { impact: v.impact, help: v.help, where: new Set() };
    for (const n of v.nodes) entry.where.add(`${path} [${viewport}/${scheme}${session ? "/signed-in" : ""}] ${n}`);
    found.set(v.id, entry);
  }
}

const session = await signIn("demo@example.com");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const runs = [];
for (const viewport of Object.keys(VIEWPORTS))
  for (const scheme of SCHEMES) {
    for (const p of PUBLIC_PAGES) runs.push([p, { viewport, scheme }]);
    for (const p of SIGNED_IN_PAGES) runs.push([p, { session, viewport, scheme }]);
  }
if (WITH_THEMES) {
  // Every template with each format, every occasion on Sheet, and every occasion on a rotating
  // template (so each template is dressed at least once), in both schemes.
  const { TEMPLATES, OFFERED_OCCASIONS: OCCASIONS } = await import("../app/themes/catalogue.server.ts");
  const looks = [
    ...TEMPLATES.flatMap((t) => ["shopping", "tasks", "research"].map((f) => `/themes/${t.slug}?format=${f}`)),
    ...OCCASIONS.map((o) => `/themes/sheet--${o.slug}`),
    ...OCCASIONS.map((o, i) => {
      const t = TEMPLATES[1 + (i % (TEMPLATES.length - 1))];
      return `/themes/${t.slug}--${o.slug}?format=${t.slug === "sheet" ? "shopping" : "tasks"}`;
    }),
  ];
  for (const path of looks) for (const scheme of SCHEMES) runs.push([path, { viewport: "desktop", scheme }]);
  runs.push(["/themes?template=board&occasion=christmas", { viewport: "phone", scheme: "dark" }]);
}
for (const [p, o] of ONLY ? runs.filter(([p]) => p.startsWith(ONLY)) : runs) {
  try {
    await audit(p, o);
  } catch (err) {
    console.log(`FAIL ${p}: ${err.message}`);
    found.set(`load:${p}`, { impact: "critical", help: err.message, where: new Set([p]) });
  }
}
await browser.close();

console.log(`Checked ${checked} page views.`);
for (const [id, v] of found) {
  console.log(`\n${v.impact?.toUpperCase() ?? ""} ${id}: ${v.help} (${v.where.size})`);
  for (const w of [...v.where].slice(0, 12)) console.log(`  ${w}`);
}
console.log(found.size ? `\n${found.size} rule(s) failed.` : "\nNo accessibility violations found.");
process.exit(found.size ? 1 : 0);
