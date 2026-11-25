import type { Theme } from "../types.ts";

/** Lantern light at dusk: pumpkin orange on aubergine, a low crescent moon and a few bats. */
export const halloween: Theme = {
  slug: "halloween",
  name: "Halloween",
  group: "occasion",
  idea: "Lantern light at dusk: pumpkin on aubergine, a low crescent moon and a few distant bats.",
  light: {
    paper: "#f4eee6", card: "#fffbf5", sunk: "#eae1d4", ink: "#1e1428", ink2: "#433651", ink3: "#625573",
    line: "#e2d7c9", lineStrong: "#c7b39d", want: "#b4400b", wantInk: "#ffffff", wantSoft: "#fbe1d0",
    deal: "#1d6b3a", dealSoft: "#dcefe0", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#140f1b", card: "#1f1829", sunk: "#0c0811", ink: "#f4ece0", ink2: "#d5c9ba", ink3: "#ab9f94",
    line: "#33283f", lineStrong: "#4d3e5c", want: "#ff8a3d", wantInk: "#1b0d02", wantSoft: "#3b2112",
    deal: "#86e0a0", dealSoft: "#14301f", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "grotesque" },
  radius: { card: "10px", control: "10px", image: "8px" },
  motifColor: { light: "#43305a", dark: "#ff8a3d" },
  motif: (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" opacity="0.32">
    <path d="M330 40a70 70 0 1 0 40 128 58 58 0 1 1-40-128z"/>
    <path d="M150 80q10-12 20 0 6-8 12-2 6-6 12 2 10-12 20 0-14 2-22 10-8-4-10 0-2-4-10 0-8-8-22-10z"/>
    <path d="M230 150q7-8 14 0 4-6 8-1 4-5 8 1 7-8 14 0-10 1-15 7-5-3-7 0-2-3-7 0-5-6-15-7z"/>
    <path d="M90 190q5-6 10 0 3-4 6-1 3-3 6 1 5-6 10 0-7 1-11 5-3-2-5 0-2-2-5 0-4-4-11-5z"/>
    <path d="M20 280c60-20 120-20 180 0s120 20 180 0"/>
  </svg>`,
};
