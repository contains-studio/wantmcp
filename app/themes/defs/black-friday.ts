import type { Theme } from "../types.ts";

/** The price sticker and the till receipt: black, white and signal yellow, all caps, hard edges. */
export const blackFriday: Theme = {
  slug: "black-friday",
  name: "Black Friday",
  group: "occasion",
  idea: "Till receipt meets price sticker: black, white and signal yellow, all caps, hard edges.",
  light: {
    paper: "#f4f4f1", card: "#ffffff", sunk: "#e9e9e4", ink: "#0a0a0a", ink2: "#3a3a38", ink3: "#5c5c58",
    line: "#d6d6d0", lineStrong: "#0a0a0a", want: "#0a0a0a", wantInk: "#ffe14d", wantSoft: "#fff3a8",
    deal: "#a10f0f", dealSoft: "#ffe3dc", warn: "#8a5300", warnSoft: "#fff0cc", danger: "#b42318",
  },
  dark: {
    paper: "#0a0a0a", card: "#151515", sunk: "#050505", ink: "#fafafa", ink2: "#d4d4d0", ink3: "#a3a39d",
    line: "#2b2b2b", lineStrong: "#fafafa", want: "#ffd400", wantInk: "#0a0a0a", wantSoft: "#2e2700",
    deal: "#ff8f7a", dealSoft: "#3a1410", warn: "#f5b13d", warnSoft: "#36270d", danger: "#ff8a80",
  },
  fonts: { display: "grotesque", price: "grotesque" },
  radius: { card: "2px", control: "2px", input: "2px", image: "0" },
  card: "outline",
  traits: ["upper-display"],
  motifColor: { light: "#0a0a0a", dark: "#ffd400" },
  motif: (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="${c}" stroke-width="3" opacity="0.22">
    <path d="M150 40h150a12 12 0 0 1 12 12v120a12 12 0 0 1-3.5 8.5l-86 86a12 12 0 0 1-17 0l-80-80a12 12 0 0 1 0-17l16-16V52a12 12 0 0 1 8.5-12z"/>
    <circle cx="276" cy="78" r="12"/>
    <path d="M190 190l60-60M196 140a10 10 0 1 0 0.1 0M244 182a10 10 0 1 0 0.1 0"/>
    <path d="M40 260h320" stroke-dasharray="6 8"/>
  </svg>`,
};
