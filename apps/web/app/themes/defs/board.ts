import type { Theme } from "../types.ts";

/** Kanban: a saturated backdrop, grey columns with counts, white cards with label chips and avatars. */
export const board: Theme = {
  slug: "board",
  name: "Board",
  group: "workspace",
  natural: "tasks",
  stylesheet: true,
  idea: "Kanban on a saturated backdrop: grey columns with counts, white cards with label chips and avatars.",
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
  contrast: {
    light: [
      { label: "hero text on backdrop (top-left)", fg: "#ffffff", bg: "#0055cc" },
      { label: "hero text on backdrop (bottom-right)", fg: "#ffffff", bg: "#6e3ab8" },
    ],
    dark: [
      { label: "hero text on backdrop (top-left)", fg: "#ffffff", bg: "#09326c" },
      { label: "hero text on backdrop (bottom-right)", fg: "#ffffff", bg: "#352c63" },
    ],
  },
};
