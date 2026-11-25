// The share-image renderer (resvg) cannot draw two of the marks in public/brands: Muse's gradient
// uses display-p3 stop colours and Gemini's sparkle is a clipped photo. This draws those two with
// a real browser, unmodified, into PNGs that workers/og.tsx embeds. Run after either file changes:
//   node scripts/make-og-art.mjs
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const ART = { "muse-mark": 100, "gemini-sparkle": 192 }; // file name: its square viewBox
const SIZE = 128; // drawn at up to 30px on a 1200px card; 128 keeps it crisp at 2x and above
const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
for (const name of Object.keys(ART)) {
  const svg = readFileSync(new URL(`../public/brands/${name}.svg`, import.meta.url), "utf8");
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`);
  await page.screenshot({ path: new URL(`../workers/og-art/${name}.png`, import.meta.url).pathname, omitBackground: true });
  console.log(`workers/og-art/${name}.png`);
}
await browser.close();
