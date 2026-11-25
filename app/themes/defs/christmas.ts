import type { Theme } from "../types.ts";

/** A card from a good stationer: evergreen, cranberry and a little gold, set in serif. */
export const christmas: Theme = {
  slug: "christmas",
  name: "Christmas",
  group: "occasion",
  idea: "A card from a good stationer: evergreen, cranberry and a thread of gold, set in serif.",
  light: {
    paper: "#f5f0e6", card: "#fffdf7", sunk: "#ece5d6", ink: "#14261b", ink2: "#3a4a3f", ink3: "#5b6a5f",
    line: "#e0d8c6", lineStrong: "#c2b79c", want: "#a3172f", wantInk: "#ffffff", wantSoft: "#f6dde0",
    deal: "#1d6b3a", dealSoft: "#dcefe0", warn: "#8a5300", warnSoft: "#fbefd3", danger: "#b42318",
  },
  dark: {
    paper: "#0e1c15", card: "#16291f", sunk: "#0a140f", ink: "#f4efe2", ink2: "#d3cbb8", ink3: "#aaa28f",
    line: "#264034", lineStrong: "#3a5a4a", want: "#ff7a8e", wantInk: "#2a0710", wantSoft: "#3a1820",
    deal: "#7fdc9a", dealSoft: "#123222", warn: "#e8c66a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "serif" },
  radius: { card: "14px", control: "999px", image: "10px" },
  traits: ["serif-display"],
  motifColor: { light: "#1f5133", dark: "#e8c66a" },
  motif: (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" opacity="0.32">
    <path d="M300 30l6 18h19l-15 11 6 18-16-11-16 11 6-18-15-11h19z"/>
    <path d="M300 95v170M300 130l-40 30M300 130l40 30M300 175l-55 40M300 175l55 40M300 220l-70 45M300 220l70 45"/>
    <path d="M120 70c20 10 30 30 20 50-20-5-30-25-20-50zM120 70c-20 10-30 30-20 50 20-5 30-25 20-50z"/>
    <circle cx="112" cy="128" r="6"/><circle cx="128" cy="130" r="6"/>
  </svg>`,
};
