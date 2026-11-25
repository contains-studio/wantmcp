import type { Theme } from "../types.ts";

/**
 * Colour-graded bars from hot to cool, big bold white type, finished items greyed at the bottom.
 * The bar colours are an sRGB mix between HOT and COOL (public/theme-css/heat.css); the contrast
 * check samples the mix.
 */
export const HEAT_HOT = "#c4122f";
export const HEAT_COOL = "#3a3fc4";
const p = {
  paper: "#0e0e10", card: "#19191c", sunk: "#131315", ink: "#ffffff", ink2: "#d6d6da", ink3: "#a8a8ae",
  line: "#2a2a2e", lineStrong: "#48484e", want: "#ff5a4f", wantInk: "#1a0302", wantSoft: "#3a1513",
  deal: "#6be3a0", dealSoft: "#14301f", warn: "#ffc85a", warnSoft: "#33280e", danger: "#ff8a80",
};
const sample = (t: number) => {
  const h = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(h(HEAT_HOT, i) * (1 - t) + h(HEAT_COOL, i) * t).toString(16).padStart(2, "0"));
  return `#${c.join("")}`;
};
const bars = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ label: `bar text at ${t * 100}% of the gradient`, fg: "#ffffff", bg: sample(t) }));

export const heat: Theme = {
  slug: "heat",
  name: "Heat",
  group: "workspace",
  natural: "tasks",
  scheme: "dark",
  stylesheet: true,
  idea: "Full-width bars graded from hot to cool, big bold white type; finished items sink to the bottom, greyed and struck through.",
  light: p,
  dark: p,
  fonts: { display: "grotesque", price: "grotesque" },
  radius: { card: "0", control: "999px", input: "8px", image: "6px" },
  card: "flat",
  layout: "heat",
  contrast: {
    light: [...bars, { label: "finished bar text", fg: "#9e9ea4", bg: "#222226" }],
    dark: [...bars, { label: "finished bar text", fg: "#9e9ea4", bg: "#222226" }],
  },
};
