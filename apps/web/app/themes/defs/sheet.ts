import type { Theme } from "../types.ts";

/** A ledger: gridlines, tabular numbers and a sortable comparison table for every item. */
export const sheet: Theme = {
  slug: "sheet",
  name: "Sheet",
  group: "workspace",
  natural: "shopping",
  stylesheet: true,
  idea: "A ledger: gridlines, tabular numbers and a sortable comparison table for every item.",
  light: {
    paper: "#f7f8f9", card: "#ffffff", sunk: "#eef0f2", ink: "#111827", ink2: "#374151", ink3: "#525c6b",
    line: "#dde1e6", lineStrong: "#b8bfc8", want: "#0f6b63", wantInk: "#ffffff", wantSoft: "#d6f0ec",
    deal: "#11703f", dealSoft: "#d9f1e3", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#111315", card: "#181b1e", sunk: "#0c0e10", ink: "#e9ecef", ink2: "#c3c9cf", ink3: "#9aa2ab",
    line: "#2a2f34", lineStrong: "#41484f", want: "#5fd4c4", wantInk: "#062723", wantSoft: "#143532",
    deal: "#6ee7a4", dealSoft: "#12301f", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "sans", price: "sans" },
  radius: { card: "4px", control: "4px", input: "4px", image: "2px" },
  card: "outline",
  traits: ["soft"],
  layout: "sheet",
};
