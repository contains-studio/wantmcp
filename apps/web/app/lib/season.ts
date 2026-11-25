/**
 * The seasonal band under the home page hero: one small config, so it can be swapped after the
 * holidays without touching layout code. Each tile starts a shopping list dressed for its occasion.
 */
export interface Season {
  heading: string;
  /** Occasion slugs, in order. */
  occasions: readonly string[];
  /** The title a new list starts with, per occasion (the person can change it). */
  listTitle: Record<string, string>;
  /** ISO date; the band is hidden from this day on. null keeps it showing. */
  endsAt: string | null;
}

export const SEASON: Season = {
  heading: "Have your agents help you get the right gifts this season.",
  occasions: ["black-friday", "cyber-monday", "chanukah", "christmas", "kwanzaa"],
  listTitle: {
    "black-friday": "Black Friday gifts",
    "cyber-monday": "Cyber Monday gifts",
    chanukah: "Chanukah gifts",
    christmas: "Christmas gifts",
    kwanzaa: "Kwanzaa gifts",
  },
  endsAt: null,
};

/** Whether the band shows on a given day. */
export function seasonActive(season: Season, now: number): boolean {
  return !season.endsAt || now < Date.parse(season.endsAt);
}
