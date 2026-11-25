/**
 * Every list theme. To add one: create a file in ./defs exporting a Theme, then add it here.
 * Pages never import this; loaders turn the chosen theme into a ThemeView.
 */
import { birthday } from "./defs/birthday.ts";
import { blackFriday } from "./defs/black-friday.ts";
import { board } from "./defs/board.ts";
import { chanukah } from "./defs/chanukah.ts";
import { christmas } from "./defs/christmas.ts";
import { cyberMonday } from "./defs/cyber-monday.ts";
import { doc } from "./defs/doc.ts";
import { halloween } from "./defs/halloween.ts";
import { heat } from "./defs/heat.ts";
import { kwanzaa } from "./defs/kwanzaa.ts";
import { newYear } from "./defs/new-year.ts";
import { sections } from "./defs/sections.ts";
import { sheet } from "./defs/sheet.ts";
import { today } from "./defs/today.ts";
import { tracker } from "./defs/tracker.ts";
import { valentines } from "./defs/valentines.ts";
import type { Theme } from "./types.ts";
import type { ListFormat } from "../lib/types.ts";
import { lookView, type ThemeView } from "./view.ts";

/** Templates: how a list is laid out. (The old Cards look, slug `default`, is retired: see resolveLook.) */
export const TEMPLATES: Theme[] = [sheet, today, doc, board, sections, heat, tracker];

/** Occasions: how a list is dressed, on any template. In calendar order from the end of November. */
export const OCCASIONS: Theme[] = [blackFriday, cyberMonday, chanukah, christmas, kwanzaa, newYear, valentines, halloween, birthday];

/** Every look. */
export const THEMES: Theme[] = [...TEMPLATES, ...OCCASIONS];

const index = (list: Theme[]) => new Map(list.flatMap((t) => [[t.slug, t] as const, ...(t.aliases ?? []).map((a) => [a, t] as const)]));
const TEMPLATE_BY_SLUG = index(TEMPLATES);
const OCCASION_BY_SLUG = index(OCCASIONS);

/** The layout a list uses when it has none of its own (or a retired one): by format. */
export const FORMAT_TEMPLATE: Record<ListFormat, Theme> = { shopping: sheet, tasks: today, research: doc };

export interface Look {
  template: Theme;
  occasion: Theme | null;
  /** Canonical slug: `board` or `board--christmas`. */
  slug: string;
}

/** The slug a list stores for a template and an occasion. */
export function lookSlug(template: string, occasion: string | null, format: ListFormat = "shopping"): string {
  const t = TEMPLATE_BY_SLUG.get(template)?.slug ?? FORMAT_TEMPLATE[format].slug;
  const o = occasion ? (OCCASION_BY_SLUG.get(occasion)?.slug ?? null) : null;
  return o ? `${t}--${o}` : t;
}

/**
 * Reads a stored look. `board`, `board--christmas`, old names (`hanukkah`, `checklist`), an occasion
 * alone (`christmas`), the retired Cards (`default`, `default--christmas`), null and anything unknown:
 * an unknown or retired layout falls back to the format's default layout, keeping the occasion.
 */
export function resolveLook(slug: string | null | undefined, format: ListFormat = "shopping"): Look {
  const raw = (slug ?? "").toLowerCase();
  let template: Theme | undefined;
  let occasion: Theme | null = null;
  if (raw.includes("--")) {
    const [t, o] = raw.split("--", 2);
    template = TEMPLATE_BY_SLUG.get(t);
    occasion = OCCASION_BY_SLUG.get(o) ?? null;
  } else {
    template = TEMPLATE_BY_SLUG.get(raw);
    if (!template) occasion = OCCASION_BY_SLUG.get(raw) ?? null;
  }
  const tpl = template ?? FORMAT_TEMPLATE[format];
  return { template: tpl, occasion, slug: lookSlug(tpl.slug, occasion?.slug ?? null, format) };
}

/** Like resolveLook, but null when either half is unknown (for URLs, where a typo should 404). */
export function parseLook(slug: string): Look | null {
  const raw = slug.toLowerCase();
  if (raw.includes("--")) {
    const [t, o] = raw.split("--", 2);
    if (!TEMPLATE_BY_SLUG.has(t) || !OCCASION_BY_SLUG.has(o)) return null;
  } else if (!TEMPLATE_BY_SLUG.has(raw) && !OCCASION_BY_SLUG.has(raw)) return null;
  return resolveLook(raw);
}

export function getThemeView(slug: string | null | undefined, format: ListFormat = "shopping"): ThemeView {
  const look = resolveLook(slug, format);
  return lookView(look.template, look.occasion, look.slug);
}

export function templateViews(): ThemeView[] {
  return TEMPLATES.map((t) => lookView(t, null, t.slug));
}

/** Every occasion on one layout (Sheet unless another is given). */
export function occasionViews(template = "sheet", only?: readonly string[]): ThemeView[] {
  const tpl = TEMPLATE_BY_SLUG.get(template) ?? sheet;
  const list = only ? OCCASIONS.filter((o) => only.includes(o.slug)) : OCCASIONS;
  return list.map((o) => lookView(tpl, o, lookSlug(tpl.slug, o.slug)));
}

export function allThemeViews(): ThemeView[] {
  return [...templateViews(), ...occasionViews()];
}
