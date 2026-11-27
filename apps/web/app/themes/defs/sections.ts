import type { Theme } from "../types.ts";
import { SITE } from "../site.ts";

/** An outline: groups that fold, one dense row per item with its agent and due date in columns. */
export const sections: Theme = {
  slug: "sections",
  name: "Sections",
  caption: "Collapsible sections",
  group: "workspace",
  natural: "tasks",
  stylesheet: true,
  idea: "An outline: groups that fold, one dense row per item with its agent and due date in columns; items open in a side panel.",
  // Layouts take the site's neutrals and its one accent (view.ts lookColors); only an occasion brings a palette.
  light: SITE.light,
  dark: SITE.dark,
  radius: { card: "12px", image: "6px" },
  card: "flat",
  traits: ["common"],
  layout: "sections",
};
