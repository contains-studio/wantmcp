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
import { defaultTheme } from "./defs/default.ts";
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
import { lookView, type ThemeView } from "./view.ts";

/** Templates: how a list is laid out. Default cards first. */
export const TEMPLATES: Theme[] = [defaultTheme, board, sections, today, heat, sheet, doc, tracker];

/** Occasions: how a list is dressed, on any template. In calendar order from the end of November. */
export const OCCASIONS: Theme[] = [blackFriday, cyberMonday, chanukah, christmas, kwanzaa, newYear, valentines, halloween, birthday];

/** Every look that existed as a single theme before templates and occasions were separate. */
export const THEMES: Theme[] = [...TEMPLATES, ...OCCASIONS];

const index = (list: Theme[]) => new Map(list.flatMap((t) => [[t.slug, t] as const, ...(t.aliases ?? []).map((a) => [a, t] as const)]));
const TEMPLATE_BY_SLUG = index(TEMPLATES);
const OCCASION_BY_SLUG = index(OCCASIONS);

export interface Look {
  template: Theme;
  occasion: Theme | null;
  /** Canonical slug: `board`, `christmas` (an occasion on Default cards) or `board--christmas`. */
  slug: string;
}

/** The slug a list stores for a template and an occasion. */
export function lookSlug(template: string, occasion: string | null): string {
  const t = TEMPLATE_BY_SLUG.get(template)?.slug ?? "default";
  const o = occasion ? (OCCASION_BY_SLUG.get(occasion)?.slug ?? null) : null;
  if (!o) return t;
  return t === "default" ? o : `${t}--${o}`;
}

/**
 * Reads a stored look. `board`, `christmas`, `board--christmas`, old names (`hanukkah`,
 * `checklist`), and anything unknown: each half falls back on its own (to Default cards, to no occasion).
 */
export function resolveLook(slug: string | null | undefined): Look {
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
  const tpl = template ?? defaultTheme;
  return { template: tpl, occasion, slug: lookSlug(tpl.slug, occasion?.slug ?? null) };
}

/** Kept for callers that think in single themes: the template, or the occasion on Default cards. */
export function getTheme(slug: string | null | undefined): Theme {
  const { template, occasion } = resolveLook(slug);
  return occasion && template.slug === "default" ? occasion : template;
}

export function getThemeView(slug: string | null | undefined): ThemeView {
  const look = resolveLook(slug);
  return lookView(look.template, look.occasion, look.slug);
}

export function templateViews(): ThemeView[] {
  return TEMPLATES.map((t) => lookView(t, null, t.slug));
}

export function occasionViews(template = "default"): ThemeView[] {
  const tpl = TEMPLATE_BY_SLUG.get(template) ?? defaultTheme;
  return OCCASIONS.map((o) => lookView(tpl, o, lookSlug(tpl.slug, o.slug)));
}

export function allThemeViews(): ThemeView[] {
  return [...templateViews(), ...occasionViews()];
}
