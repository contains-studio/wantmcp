// The share-image renderer (resvg) cannot draw two of the marks in public/brands: Muse's gradient
// uses display-p3 stop colours and Gemini's sparkle is a clipped photo. This draws those two with
// a real browser, unmodified, into PNGs that workers/og.tsx embeds. Run after either file changes:
//   node scripts/make-og-art.mjs
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

// file name in public/brands: the output name, and (for a file that holds a mark beside lettering) the
// element that is the mark alone. The share card shows marks without lettering (owner, 25 Nov 2026).
const ART = [
  { file: "muse-mark", out: "muse-mark" },
  { file: "gemini-sparkle", out: "gemini-sparkle" },
  { file: "openclaw-on-light", out: "openclaw-mark", part: "svg > g" },
  // Large (a detailed drawing) and a white card on white: both are simpler for the renderer as images.
  { file: "hermes-agent-icon", out: "hermes-agent" },
  { file: "instinct-icon", out: "instinct" },
];
const SIZE = 192; // drawn at up to 80px on a 1200px card; 192 keeps it crisp at 2x and above
const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 600 }, deviceScaleFactor: 1 });
for (const { file, out, part } of ART) {
  const svg = readFileSync(new URL(`../public/brands/${file}.svg`, import.meta.url), "utf8");
  const path = new URL(`../workers/og-art/${out}.png`, import.meta.url).pathname;
  if (part) {
    // Draw the whole file large, then photograph only the mark.
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;height:${SIZE * 1.6}px;width:auto}</style>${svg}`);
    await page.locator(part).first().screenshot({ path, omitBackground: true });
  } else {
    const data = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
    await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${SIZE}px;height:${SIZE}px}</style><img src="${data}">`);
    await page.locator("img").first().screenshot({ path, omitBackground: true });
  }
  console.log(`workers/og-art/${out}.png`);
}
await browser.close();
