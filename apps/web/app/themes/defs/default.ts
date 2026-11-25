import type { Theme } from "../types.ts";
import { SITE } from "../site.ts";

/** The site's own look: soft neutrals, near-black type, hairlines, one blue accent. */
export const defaultTheme: Theme = {
  slug: "default",
  name: "Cards",
  caption: "House look",
  group: "default",
  idea: "The plain look: soft neutrals, near-black type, hairline rows and one blue accent.",
  light: SITE.light,
  dark: SITE.dark,
  fonts: { display: "sans" },
  radius: { card: "18px", image: "12px" },
  card: "flat",
};
