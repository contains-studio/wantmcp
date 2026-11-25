import type { Theme } from "../types.ts";

/** Midnight and champagne: navy, warm gold, a fashion-magazine serif and quiet starbursts. */
export const newYear: Theme = {
  slug: "new-year",
  name: "New Year",
  group: "occasion",
  idea: "Midnight and champagne: navy and warm gold, a magazine serif and quiet starbursts.",
  light: {
    paper: "#f6f3ea", card: "#fffdf7", sunk: "#ebe6d7", ink: "#111933", ink2: "#363f5c", ink3: "#565f7c",
    line: "#e1dbc8", lineStrong: "#c4b88f", want: "#7a5410", wantInk: "#ffffff", wantSoft: "#f3e7c8",
    deal: "#1d6b47", dealSoft: "#dcefe3", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#0a0f24", card: "#131a38", sunk: "#060a18", ink: "#f5efdf", ink2: "#d2cbb6", ink3: "#a8a290",
    line: "#232c52", lineStrong: "#3a4475", want: "#e9c46a", wantInk: "#1a1405", wantSoft: "#2f2a17",
    deal: "#7fdcaa", dealSoft: "#12302a", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "didone" },
  radius: { card: "4px", control: "999px", image: "2px" },
  card: "flat",
  traits: ["serif-display", "upper-display"],
  motifColor: { light: "#a07a2c", dark: "#e9c46a" },
  motif: (c) => {
    const burst = (cx: number, cy: number, r: number) =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        const r1 = r * 0.35;
        return `M${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}L${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
      }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity="0.35">
      <path d="${burst(290, 110, 80)}"/><path d="${burst(150, 70, 38)}"/><path d="${burst(200, 230, 30)}"/>
      <g fill="${c}" stroke="none"><circle cx="80" cy="160" r="3"/><circle cx="360" cy="230" r="3"/><circle cx="330" cy="30" r="2.5"/></g></svg>`;
  },
};
