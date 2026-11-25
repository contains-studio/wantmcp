import type { Theme } from "../types.ts";

const p = {
  paper: "#000000", card: "#0d0d0d", sunk: "#050505", ink: "#ffffff", ink2: "#d9d9d9", ink3: "#a6a6a6",
  line: "#262626", lineStrong: "#4d4d4d", want: "#ffe600", wantInk: "#000000", wantSoft: "#2b2700",
  deal: "#ffe600", dealSoft: "#2b2700", warn: "#ffb020", warnSoft: "#2e2108", danger: "#ff6b6b",
};

/** Real black and signal yellow, heavy capitals and sale-tag shapes. */
export const blackFriday: Theme = {
  slug: "black-friday",
  name: "Black Friday",
  group: "occasion",
  scheme: "dark",
  stylesheet: true,
  idea: "Real black and signal yellow: heavy capitals, prices on sale tags and a striped warning band.",
  light: p,
  dark: p,
  fonts: { display: "grotesque", price: "grotesque" },
  radius: { card: "0", control: "0", input: "0", image: "0" },
  card: "outline",
  traits: ["upper-display"],
  contrast: {
    light: [{ label: "black on yellow tag", fg: "#000000", bg: "#ffe600" }],
    dark: [{ label: "black on yellow tag", fg: "#000000", bg: "#ffe600" }],
  },
};
