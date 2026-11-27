import type { Theme } from "../types.ts";
import { SITE } from "../site.ts";

/** A comparison table: one card per want on a quiet ground, products in rows, every price ending at the same edge. */
export const sheet: Theme = {
  slug: "sheet",
  name: "Sheet",
  caption: "Price table",
  group: "workspace",
  natural: "shopping",
  stylesheet: true,
  idea: "A comparison table: one card per want on a quiet ground, products in rows, prices in one column the eye runs down.",
  // Layouts take the site's neutrals and its one accent (view.ts lookColors); only an occasion brings a palette.
  light: SITE.light,
  dark: SITE.dark,
  radius: { card: "18px", image: "8px" },
  card: "raised",
  traits: ["common"],
  layout: "sheet",
};
