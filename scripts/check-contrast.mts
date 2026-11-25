/**
 * WCAG 2.x contrast check for every list theme, light and dark.
 *   node scripts/check-contrast.mts            table + exit 1 on any failure
 *
 * Text pairs must reach 4.5:1 (AA, normal text). The accent outline (`want` on card),
 * used for the "lowest" ring and focus rings, is a non-text UI part and needs 3:1.
 * Each theme can add pairs its stylesheet relies on (`contrast` in its definition), such as
 * text over a gradient or a full-bleed band; gradients are sampled at several points.
 */
import { THEMES } from "../app/themes/catalogue.server.ts";
import type { Palette } from "../app/themes/types.ts";

function lum(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const CHECKS: Array<[string, keyof Palette, keyof Palette, number]> = [
  ["body text on page", "ink", "paper", 4.5],
  ["prices / body on card", "ink", "card", 4.5],
  ["text on recessed surface", "ink", "sunk", 4.5],
  ["secondary text on card", "ink2", "card", 4.5],
  ["secondary text on page", "ink2", "paper", 4.5],
  ["meta text on card", "ink3", "card", 4.5],
  ["meta text on page", "ink3", "paper", 4.5],
  ["button / badge text on accent", "wantInk", "want", 4.5],
  ["discount badge text", "deal", "dealSoft", 4.5],
  ["savings text on card", "deal", "card", 4.5],
  ["warning label text", "warn", "warnSoft", 4.5],
  ["error text on card", "danger", "card", 4.5],
  ["coupon text on accent tint", "ink", "wantSoft", 4.5],
  ["accent outline on card (UI, 3:1)", "want", "card", 3],
];

let failures = 0;
const rows: string[] = [];
for (const t of THEMES) {
  for (const mode of ["light", "dark"] as const) {
    const p = t[mode];
    let min = Infinity;
    let minName = "";
    for (const [name, fg, bg, need] of CHECKS) {
      const r = ratio(p[fg] as string, p[bg] as string);
      if (r < need) {
        failures++;
        rows.push(`FAIL ${t.slug} ${mode}: ${name} ${r.toFixed(2)} < ${need}`);
      }
      if (need === 4.5 && r < min) {
        min = r;
        minName = name;
      }
    }
    // Pairs the theme's own stylesheet relies on: text over gradients, backdrops, bands.
    for (const x of t.contrast?.[mode] ?? []) {
      const need = x.need ?? 4.5;
      const r = ratio(x.fg, x.bg);
      if (r < need) {
        failures++;
        rows.push(`FAIL ${t.slug} ${mode}: ${x.label} ${r.toFixed(2)} < ${need}`);
      }
    }
    const price = ratio(p.ink, p.card);
    rows.push(`${t.slug.padEnd(13)} ${mode.padEnd(5)}  price ${price.toFixed(1).padStart(5)}:1   lowest text pair ${min.toFixed(2)}:1 (${minName})`);
  }
}
console.log(rows.join("\n"));
console.log(failures ? `\n${failures} failure(s)` : `\nAll ${THEMES.length} themes pass: every text pair >= 4.5:1, accent outlines >= 3:1, extra pairs (gradients, bands) met, light and dark.`);
process.exit(failures ? 1 : 0);
