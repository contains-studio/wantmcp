import { ART } from "../art.ts";
import type { Theme } from "../types.ts";

const p = {
  paper: "#0b0b0c", card: "#141414", sunk: "#080808", ink: "#f6f1e4", ink2: "#d8cfb9", ink3: "#ada48f",
  line: "#2a261c", lineStrong: "#5c4e2c", want: "#e2bd63", wantInk: "#1a1200", wantSoft: "#2a2414",
  deal: "#8fdcb0", dealSoft: "#13291d", warn: "#f5c76a", warnSoft: "#2f2a1c", danger: "#ff9a9a",
};

/** Black and gold, art deco numerals and still confetti. */
export const newYear: Theme = {
  slug: "new-year",
  name: "New Year's",
  group: "occasion",
  scheme: "dark",
  stylesheet: true,
  art: ART.newYear,
  idea: "Black and gold: deco numerals for the year ahead, framed cards and still confetti.",
  accents: {
    light: { band: "#0b0b0c", bandAlt: "#2a2414", bandInk: "#f6f1e4", hot: "#7d6119", cool: "#1c1c1e", barInk: "#ffffff" },
    dark: { band: "#0b0b0c", bandAlt: "#2a2414", bandInk: "#f6f1e4", hot: "#7d6119", cool: "#1c1c1e", barInk: "#ffffff" },
  },
  light: p,
  dark: p,
  fonts: { display: "didone" },
  radius: { card: "2px", control: "2px", input: "2px", image: "0" },
  traits: ["serif-display", "upper-display"],
};
