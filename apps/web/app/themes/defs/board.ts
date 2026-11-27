import type { Theme } from "../types.ts";
import { SITE } from "../site.ts";
import { mix } from "../view.ts";

/** Kanban on a calm ground: one navy band for the header, columns with counts, white cards. */
export const board: Theme = {
  slug: "board",
  name: "Board",
  caption: "Kanban columns",
  group: "workspace",
  natural: "tasks",
  stylesheet: true,
  idea: "Kanban on a calm ground: columns with counts, white cards, the status drawn before each column's name.",
  // Layouts take the site's neutrals and its one accent (view.ts lookColors); only an occasion brings a palette.
  light: SITE.light,
  dark: SITE.dark,
  radius: { card: "14px", image: "8px" },
  card: "flat",
  traits: ["common"],
  layout: "board",
  // The header is one solid band of deep navy; an occasion brings its own band colour. One colour, no gradient.
  accents: {
    light: { band: "#17365d", bandAlt: "#17365d", bandInk: "#ffffff" },
    dark: { band: "#1d3557", bandAlt: "#1d3557", bandInk: "#f5f5f7" },
  },
  contrast: (_p, a) => [
    { label: "header text on the band", fg: a.bandInk, bg: a.bandAlt },
    { label: "header chip text on the band", fg: a.bandInk, bg: mix(a.bandAlt, a.bandInk, 0.16) },
  ],
};
