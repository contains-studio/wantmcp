import type { Theme } from "../types.ts";
import { SITE } from "../site.ts";

/** A to-do list with air: round ticks, one line per task, what an agent did tucked under it. */
export const today: Theme = {
  slug: "today",
  aliases: ["checklist"],
  name: "Checklist",
  caption: "Calm to-do",
  group: "workspace",
  natural: "tasks",
  stylesheet: true,
  idea: "A to-do list with air: round ticks, one line per task, what an agent did tucked under it.",
  // Layouts take the site's neutrals and its one accent (view.ts lookColors); only an occasion brings a palette.
  light: SITE.light,
  dark: SITE.dark,
  radius: { card: "14px", image: "10px" },
  card: "flat",
  traits: ["common", "checklist"],
  layout: "list",
};
