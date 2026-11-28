import type { Theme } from "../types.ts";
import { SITE } from "../site.ts";

/** An issue tracker for the dark: one dense panel of rows, each led by a status light, its activity on a rail. */
export const tracker: Theme = {
  slug: "tracker",
  name: "Tracker",
  caption: "Dark issue tracker",
  group: "workspace",
  natural: "tasks",
  scheme: "dark",
  stylesheet: true,
  idea: "An issue tracker for the dark: one dense panel of rows, each led by a status light; nothing printed that isn't real.",
  // Always dark: the dark palette in both modes.
  light: SITE.dark,
  dark: SITE.dark,
  radius: { card: "10px", image: "4px" },
  card: "flat",
  traits: ["common"],
  layout: "rows",
  contrast: (p) => [
    { label: "row text on the panel", fg: p.ink, bg: p.card },
    { label: "meta text on the recessed heading", fg: p.ink3, bg: p.sunk },
    { label: "in-progress light on the panel (UI, 3:1)", fg: p.warn, bg: p.card, need: 3 },
    { label: "done light on the panel (UI, 3:1)", fg: p.deal, bg: p.card, need: 3 },
  ],
};
