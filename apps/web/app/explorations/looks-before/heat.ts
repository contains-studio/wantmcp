import type { Theme } from "../../themes/types.ts";

/**
 * Colour-graded bars from hot to cool, big bold white type, finished items greyed at the bottom.
 * Bar colours come from the accents (an occasion can recolour them); the contrast check samples them.
 */
import { HEAT_COOL, HEAT_HOT } from "../../themes/view.ts";
const p = {
  paper: "#0e0e10", card: "#19191c", sunk: "#131315", ink: "#ffffff", ink2: "#d6d6da", ink3: "#a8a8ae",
  line: "#2a2a2e", lineStrong: "#48484e", want: "#ff5a4f", wantInk: "#1a0302", wantSoft: "#3a1513",
  deal: "#6be3a0", dealSoft: "#14301f", warn: "#ffc85a", warnSoft: "#33280e", danger: "#ff8a80",
};
const mix = (a: string, b: string, t: number) => {
  const h = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(h(a, i) * (1 - t) + h(b, i) * t).toString(16).padStart(2, "0")).join("")}`;
};

export const heat: Theme = {
  slug: "heat",
  name: "Heat",
  caption: "Hot to cool",
  group: "workspace",
  natural: "tasks",
  scheme: "dark",
  stylesheet: true,
  idea: "Full-width bars graded from hot to cool, big bold type; finished items sink to the bottom, greyed and struck through.",
  light: p,
  dark: p,
  fonts: { display: "grotesque", price: "grotesque" },
  radius: { card: "0", control: "999px", input: "8px", image: "6px" },
  card: "flat",
  layout: "heat",
  accents: { light: { hot: HEAT_HOT, cool: HEAT_COOL, barInk: "#ffffff" }, dark: { hot: HEAT_HOT, cool: HEAT_COOL, barInk: "#ffffff" } },
  // Bar colours are an sRGB mix from hot to cool (public/theme-css/heat.css); sample it.
  contrast: (p, a) => [
    ...[0, 0.25, 0.5, 0.75, 1].map((t) => ({ label: `bar text at ${t * 100}% of the gradient`, fg: a.barInk, bg: mix(a.hot, a.cool, t) })),
    { label: "finished bar text", fg: p.ink3, bg: p.card },
  ],
};
