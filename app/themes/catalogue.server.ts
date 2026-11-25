/**
 * Every list theme. To add one: create a file in ./defs exporting a Theme, then add it here.
 * Pages never import this; loaders turn the chosen theme into a ThemeView.
 */
import { birthday } from "./defs/birthday.ts";
import { blackFriday } from "./defs/black-friday.ts";
import { board } from "./defs/board.ts";
import { checklist } from "./defs/checklist.ts";
import { christmas } from "./defs/christmas.ts";
import { cyberMonday } from "./defs/cyber-monday.ts";
import { defaultTheme } from "./defs/default.ts";
import { doc } from "./defs/doc.ts";
import { halloween } from "./defs/halloween.ts";
import { hanukkah } from "./defs/hanukkah.ts";
import { newYear } from "./defs/new-year.ts";
import { sheet } from "./defs/sheet.ts";
import { tracker } from "./defs/tracker.ts";
import { valentines } from "./defs/valentines.ts";
import type { Theme } from "./types.ts";
import { themeView, type ThemeView } from "./view.ts";

export const THEMES: Theme[] = [
  defaultTheme,
  blackFriday,
  cyberMonday,
  christmas,
  hanukkah,
  newYear,
  valentines,
  halloween,
  birthday,
  doc,
  board,
  tracker,
  checklist,
  sheet,
];

const BY_SLUG = new Map(THEMES.map((t) => [t.slug, t]));

/** Unknown or missing slugs fall back to the default theme. */
export function getTheme(slug: string | null | undefined): Theme {
  return (slug && BY_SLUG.get(slug)) || defaultTheme;
}

export function getThemeView(slug: string | null | undefined): ThemeView {
  return themeView(getTheme(slug));
}

export function allThemeViews(): ThemeView[] {
  return THEMES.map(themeView);
}
