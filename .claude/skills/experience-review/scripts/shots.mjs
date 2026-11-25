// Screenshots for an experience review: every path on a phone in dark mode and on desktop in light mode,
// with the phone image cut into screen-height slices, plus words, controls and page height per screen.
//
// Run from a folder where @playwright/test resolves (the web app's apps/web checkout):
//   node shots.mjs --base https://wantmcp.com --out ./review [--session session.json] / /login /connect
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(process.cwd() + "/");
const { chromium } = require("@playwright/test");

const args = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const [, value] = args.splice(i, 2);
  return value;
};
const base = opt("base", "https://wantmcp.com").replace(/\/$/, "");
const out = opt("out", "./review");
const sessionFile = opt("session");
const channel = opt("channel", "chrome");
const paths = args.length ? args : ["/"];
const token = sessionFile ? JSON.parse(readFileSync(sessionFile, "utf8")).token : null;
mkdirSync(out, { recursive: true });

const VIEWS = [
  { tag: "phone-dark", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark" },
  { tag: "desktop-light", viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, colorScheme: "light" },
];
const nameOf = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+$/, "").slice(0, 60));

const browser = await chromium.launch({ channel });
try {
  for (const view of VIEWS) {
    const { tag, ...contextOptions } = view;
    const ctx = await browser.newContext(contextOptions);
    if (token) {
      await ctx.addCookies([
        { name: "wm_session", value: encodeURIComponent(token), domain: new URL(base).hostname, path: "/", httpOnly: true, secure: base.startsWith("https"), sameSite: "Lax" },
      ]);
    }
    const page = await ctx.newPage();
    for (const p of paths) {
      const name = `${nameOf(p)}-${tag}`;
      let status = "error";
      try {
        const res = await page.goto(base + p, { waitUntil: "networkidle", timeout: 45000 });
        status = String(res?.status() ?? "?");
      } catch (err) {
        status = `error: ${String(err.message).split("\n")[0].slice(0, 80)}`;
      }
      await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
      const m = await page.evaluate(() => {
        const root = document.querySelector("main") ?? document.body;
        return {
          words: (root.innerText ?? "").split(/\s+/).filter(Boolean).length,
          controls: root.querySelectorAll("a, button, input, select, textarea, summary").length,
          height: document.documentElement.scrollHeight,
          scrollers: [...root.querySelectorAll("*")].filter((el) => {
            const s = getComputedStyle(el);
            const y = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
            const x = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
            return y || x;
          }).length,
        };
      });
      let slices = 0;
      if (view.isMobile) {
        const step = view.viewport.height;
        const count = Math.min(Math.ceil(m.height / step), 12);
        for (let i = 0; i < count; i++) {
          await page.evaluate((y) => window.scrollTo(0, y), i * step);
          await page.waitForTimeout(120);
          await page.screenshot({ path: `${out}/${name}-${i + 1}.png` });
          slices++;
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      console.log(`${name}  status ${status}  words ${m.words}  controls ${m.controls}  height ${m.height}px  inner-scrollers ${m.scrollers}${slices ? `  slices ${slices}` : ""}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
