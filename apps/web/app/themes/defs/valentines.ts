import { ART } from "../art.ts";
import type { Theme } from "../types.ts";

/** Love letters: blush paper, deep red, a script-like italic serif and scalloped cards. */
export const valentines: Theme = {
  slug: "valentines",
  // Not offered right now (owner, 24 Nov 2026); back in season by removing this line.
  offered: false,
  name: "Valentine's Day",
  caption: "Love letters",
  group: "occasion",
  stylesheet: true,
  art: ART.valentines,
  idea: "Love letters: blush paper and deep red, an italic serif, scalloped notes and a sealed-envelope header.",
  accents: {
    light: { band: "#a8113b", bandAlt: "#5e0a26", bandInk: "#ffffff", hot: "#b8124a", cool: "#5e0a26", barInk: "#ffffff" },
    dark: { band: "#4a1424", bandAlt: "#24080f", bandInk: "#ffe9ee", hot: "#b8124a", cool: "#5e0a26", barInk: "#ffffff" },
  },
  light: {
    paper: "#fff0f2", card: "#fffafa", sunk: "#fde2e7", ink: "#3b0a17", ink2: "#62212f", ink3: "#80414e",
    line: "#f6cfd7", lineStrong: "#e399a8", want: "#b3123f", wantInk: "#ffffff", wantSoft: "#fdd9e1",
    deal: "#0f6a45", dealSoft: "#dcf2e6", warn: "#8a4b00", warnSoft: "#fdeed6", danger: "#b3123f",
  },
  dark: {
    paper: "#24080f", card: "#330d17", sunk: "#1c060c", ink: "#ffe9ee", ink2: "#f3c6d0", ink3: "#d59aa8",
    line: "#4d1624", lineStrong: "#7a2a3d", want: "#ff7a9a", wantInk: "#2a0510", wantSoft: "#4a1424",
    deal: "#86e0b6", dealSoft: "#163226", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff9ab0",
  },
  fonts: { display: "serif" },
  radius: { card: "18px", control: "999px", input: "14px", image: "14px" },
  traits: ["serif-display", "italic-display"],
};
