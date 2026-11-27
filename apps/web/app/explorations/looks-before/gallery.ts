import type { Theme } from "../../themes/types.ts";

/**
 * A pin board of photos (owner, 26 Nov 2026: "a … board view as a look"): a masonry of cards, each want led by its
 * best product's photo at its natural height, then the want, the best price and store, and how many options. Wants
 * without a photo are calm text cards in the same grid. Cards open the item in a panel, as Board and Sections do.
 */
export const gallery: Theme = {
  slug: "gallery",
  name: "Gallery",
  caption: "Photo cards",
  group: "workspace",
  natural: "shopping",
  idea: "A pin board of photos: a masonry of image cards at their natural heights, each want led by its best product.",
  light: {
    paper: "#ffffff", card: "#ffffff", sunk: "#f1f1f1", ink: "#111111", ink2: "#3d3d3d", ink3: "#5f5f5f",
    line: "#e6e6e6", lineStrong: "#b8b8b8", want: "#c8102e", wantInk: "#ffffff", wantSoft: "#fbe9ec",
    deal: "#0b7a3b", dealSoft: "#e3f5ea", warn: "#8a5a00", warnSoft: "#fff4d6", danger: "#b3261e",
  },
  dark: {
    paper: "#111111", card: "#1c1c1c", sunk: "#262626", ink: "#f4f4f4", ink2: "#cfcfcf", ink3: "#a3a3a3",
    line: "#2e2e2e", lineStrong: "#4a4a4a", want: "#ff6b7d", wantInk: "#1a0306", wantSoft: "#3a1a1f",
    deal: "#6fdc9a", dealSoft: "#13301f", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "sans", price: "sans" },
  radius: { card: "16px", control: "999px", input: "12px", image: "16px" },
  card: "flat",
  traits: ["soft"],
  layout: "gallery",
};
