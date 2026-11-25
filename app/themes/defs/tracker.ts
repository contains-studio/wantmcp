import type { Theme } from "../types.ts";

/** Built for the dark: compact rows, monospace details, status-light green. */
export const tracker: Theme = {
  slug: "tracker",
  name: "Tracker",
  group: "workspace",
  idea: "Built for the dark: compact rows, monospace details and a status-light green.",
  light: {
    paper: "#e9edf1", card: "#f8fafc", sunk: "#dde3ea", ink: "#0b1118", ink2: "#2f3a46", ink3: "#4b5866",
    line: "#cfd7e0", lineStrong: "#a6b2bf", want: "#0d6e46", wantInk: "#ffffff", wantSoft: "#d4efe2",
    deal: "#0d6e46", dealSoft: "#d4efe2", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#0a0d12", card: "#10151c", sunk: "#07090d", ink: "#e6edf3", ink2: "#b6c1cc", ink3: "#8d99a6",
    line: "#1f2731", lineStrong: "#334050", want: "#4cd88e", wantInk: "#03140b", wantSoft: "#0f2a1d",
    deal: "#4cd88e", dealSoft: "#0f2a1d", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "mono", body: "sans", price: "mono" },
  radius: { card: "4px", control: "4px", input: "4px", image: "3px" },
  card: "outline",
  traits: ["dense", "mono-meta"],
  layout: "rows",
};
