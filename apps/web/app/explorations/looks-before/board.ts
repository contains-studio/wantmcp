import type { Theme } from "../../themes/types.ts";

/** Kanban: a saturated backdrop, gray columns with counts, white cards with label chips and avatars. */
export const board: Theme = {
  slug: "board",
  name: "Board",
  caption: "Kanban columns",
  group: "workspace",
  natural: "tasks",
  stylesheet: true,
  idea: "Kanban on a saturated backdrop: gray columns with counts, white cards with label chips and avatars.",
  light: {
    paper: "#f1f2f4", card: "#ffffff", sunk: "#e3e5e9", ink: "#172b4d", ink2: "#33415c", ink3: "#505f79",
    line: "#dcdfe4", lineStrong: "#a5adba", want: "#0c66e4", wantInk: "#ffffff", wantSoft: "#e2ecfd",
    deal: "#216e4e", dealSoft: "#dcfff1", warn: "#7f5f01", warnSoft: "#fff7d6", danger: "#ae2e24",
  },
  dark: {
    paper: "#101204", card: "#22272b", sunk: "#161a1d", ink: "#dee4ea", ink2: "#b6c2cf", ink3: "#9fadbc",
    line: "#2c333a", lineStrong: "#454f59", want: "#579dff", wantInk: "#0b1a33", wantSoft: "#1c2b41",
    deal: "#7ee2b8", dealSoft: "#1c3329", warn: "#f5cd47", warnSoft: "#332e1b", danger: "#fd9891",
  },
  fonts: { display: "sans", price: "sans" },
  radius: { card: "12px", control: "8px", input: "8px", image: "6px" },
  card: "flat",
  traits: ["soft"],
  layout: "board",
  accents: {
    light: { band: "#0055cc", bandAlt: "#6e3ab8", bandInk: "#ffffff" },
    dark: { band: "#09326c", bandAlt: "#352c63", bandInk: "#ffffff" },
  },
  // The header text sits on the backdrop, a gradient from band to bandAlt.
  contrast: (_p, a) => [
    { label: "header text on backdrop (start)", fg: a.bandInk, bg: a.band },
    { label: "header text on backdrop (end)", fg: a.bandInk, bg: a.bandAlt },
  ],
};
