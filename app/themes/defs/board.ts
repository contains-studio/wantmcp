import type { Theme } from "../types.ts";

/** Columns of cards on a soft canvas: every item is a column, every find a card. */
export const board: Theme = {
  slug: "board",
  name: "Board",
  group: "workspace",
  idea: "Columns of cards on a soft canvas: each item is a column, each find a card in it.",
  light: {
    paper: "#eceff4", card: "#ffffff", sunk: "#dfe4ec", ink: "#152033", ink2: "#3a4659", ink3: "#566275",
    line: "#d3d9e3", lineStrong: "#aeb8c8", want: "#2f52d6", wantInk: "#ffffff", wantSoft: "#e1e7fb",
    deal: "#11703f", dealSoft: "#d9f1e3", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#12151c", card: "#1c212b", sunk: "#181c24", ink: "#e8ecf3", ink2: "#c3cad6", ink3: "#9aa3b2",
    line: "#2a313e", lineStrong: "#3f4859", want: "#8aa3ff", wantInk: "#0b1226", wantSoft: "#1f2a4d",
    deal: "#6ee7a4", dealSoft: "#12301f", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "sans", price: "sans" },
  radius: { card: "10px", control: "8px", input: "8px", image: "6px" },
  traits: ["soft"],
  layout: "board",
};
