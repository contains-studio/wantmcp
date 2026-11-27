/**
 * Screenshots for design review: node scripts/shoot.mjs <outdir> <path...> [--signed-in] [--base=URL]
 * Each path is taken at phone and desktop, light and dark (full page).
 */
import puppeteer from "puppeteer-core";
import { tagPage } from "./check-header.mjs";
const args = process.argv.slice(2);
const out = args.shift();
const BASE = args.find((a) => a.startsWith("--base="))?.slice(7) ?? "http://localhost:5173";
const signedIn = args.includes("--signed-in");
const only = args.find((a) => a.startsWith("--only="))?.slice(7); // e.g. phone-dark
const paths = args.filter((a) => !a.startsWith("--"));
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function session(email) {
  const h = { "content-type": "application/x-www-form-urlencoded" };
  const f = (o) => new URLSearchParams(o).toString();
  await fetch(`${BASE}/login`, { method: "POST", headers: h, body: f({ email, next: "/app" }) });
  const r = await fetch(`${BASE}/login`, { method: "POST", headers: h, body: f({ intent: "verify", email, code: "123456", next: "/app" }), redirect: "manual" });
  return (r.headers.get("set-cookie") ?? "").split(";")[0].split("=")[1];
}
const sid = signedIn ? await session("demo@example.com") : null;
const b = await puppeteer.launch({ executablePath: CHROME, headless: true });
for (const path of paths)
  for (const [vp, view] of [["phone", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ["desktop", { width: 1280, height: 900 }]])
    for (const scheme of ["light", "dark"]) {
      if (only && only !== `${vp}-${scheme}`) continue;
      const p = await tagPage(await b.newPage());
      await p.setViewport(view);
      await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-motion", value: "reduce" }]);
      if (sid) await p.setCookie({ name: "wm_session", value: sid, url: BASE });
      await p.goto(BASE + path, { waitUntil: "networkidle0" });
      const name = path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "_") || "home";
      await p.screenshot({ path: `${out}/${name}-${vp}-${scheme}.png`, fullPage: true });
      await p.close();
    }
await b.close();
