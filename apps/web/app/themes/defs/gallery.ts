import type { Theme } from "../types.ts";
import { SITE } from "../site.ts";

/**
 * A pin board of photos (owner, 26 Nov 2026): a masonry of cards, each want led by its best product's photo at its
 * natural height, then the want, the price on its own line and the store on the next. Wants without a photo are quiet
 * word cards in the same grid. Cards open the item in a panel, as Board and Sections do.
 */
export const gallery: Theme = {
  slug: "gallery",
  name: "Gallery",
  caption: "Photo cards",
  group: "workspace",
  natural: "shopping",
  stylesheet: true,
  idea: "A pin board of photos: a masonry of image cards at their natural heights, each want led by its best product.",
  // Layouts take the site's neutrals and its one accent (view.ts lookColors); only an occasion brings a palette.
  light: SITE.light,
  dark: SITE.dark,
  radius: { card: "16px", image: "14px" },
  card: "flat",
  traits: ["common"],
  layout: "gallery",
  contrast: (p) => [
    { label: "word card text on the recessed surface", fg: p.ink, bg: p.sunk },
    { label: "word card meta on the recessed surface", fg: p.ink3, bg: p.sunk },
  ],
};
