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
  /**
   * When each occasion's tile leaves the band: the instant its last day is over (midnight US Pacific, written with
   * its offset). Past it, the band leads with the next occasion. The occasion itself (its look, its /for page, a list
   * already dressed for it) is unaffected.
   */
  over: Record<string, string>;
  /** ISO instant; the whole band is hidden from then on (to switch it off early). null keeps it to `over`. */
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
  // Pacific time is UTC-8 all of this season (no daylight saving from 1 Nov to 14 Mar).
  over: {
    "black-friday": "2026-11-28T00:00:00-08:00", // through Fri 27 Nov 2026
    "cyber-monday": "2026-12-01T00:00:00-08:00", // through Mon 30 Nov 2026
    chanukah: "2026-12-13T00:00:00-08:00", // through Sat 12 Dec 2026 (25 Kislev to 2 Tevet 5787)
    christmas: "2026-12-26T00:00:00-08:00", // through Fri 25 Dec 2026
    kwanzaa: "2027-01-02T00:00:00-08:00", // through Fri 1 Jan 2027
  },
  endsAt: null,
};

/** The occasions the band shows at `now`, in order: those whose last day isn't over yet. */
export function seasonTiles(season: Season, now: number): string[] {
  if (season.endsAt && now >= Date.parse(season.endsAt)) return [];
  return season.occasions.filter((slug) => {
    const over = season.over[slug];
    return !over || now < Date.parse(over);
  });
}

/** Whether the band shows at `now`: not switched off, and some occasion still to come. */
export function seasonActive(season: Season, now: number): boolean {
  return seasonTiles(season, now).length > 0;
}
