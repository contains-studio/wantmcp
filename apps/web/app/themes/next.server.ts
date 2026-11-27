/**
 * The redesigned looks (an exploration on branch looks-impeccable): a second set of the eight layouts that lives beside
 * the current one. Same slugs, same data, same components and markup; each has its own stylesheet under
 * public/theme-css/next and its own wrapper class (`nx nx-<slug>` in place of `tpl-<slug>`), so neither set's rules can
 * reach the other. Nothing here is used unless a page asks for it: /themes/compare and its frames, and a list or a
 * look preview opened with ?look=next.
 */
import { board } from "./defs/board.ts";
import { doc } from "./defs/doc.ts";
import { gallery } from "./defs/gallery.ts";
import { heat } from "./defs/heat.ts";
import { sections } from "./defs/sections.ts";
import { sheet } from "./defs/sheet.ts";
import { today } from "./defs/today.ts";
import { tracker } from "./defs/tracker.ts";
import { resolveLook } from "./catalogue.server.ts";
import type { ContrastPair, Theme } from "./types.ts";
import { lookView, type ThemeView } from "./view.ts";
import type { ListFormat } from "../lib/types.ts";

const hex = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
/** An sRGB mix of two hex colours, as CSS color-mix(in srgb, a, b t%) draws it. */
export const mix = (a: string, b: string, t: number) =>
  `#${[0, 1, 2].map((i) => Math.round(hex(a, i) * (1 - t) + hex(b, i) * t).toString(16).padStart(2, "0")).join("")}`;

/**
 * What a redesigned look changes in its definition. Fonts are left to the site (the system face first), shapes and the
 * rest are in its stylesheet; a look keeps its layout, its natural kind of list and what it is for.
 */
const redesign = (base: Theme, over: Partial<Theme>): Theme => ({ ...base, fonts: undefined, traits: [], accents: undefined, contrast: undefined, ...over });

export const NEXT_TEMPLATES: Theme[] = [
  redesign(sheet, {
    caption: "Price table",
    idea: "A comparison table: one card per want on a quiet ground, products in rows, prices in one column the eye runs down.",
    radius: { card: "18px", image: "8px" },
    card: "raised",
  }),
  redesign(today, {
    caption: "Calm to-do",
    idea: "A to-do list with air: round ticks, one line per task, what an agent did tucked under it.",
    radius: { card: "14px", image: "10px" },
    card: "flat",
    traits: ["checklist"],
  }),
  redesign(doc, {
    caption: "A quiet page",
    idea: "A page to read: one column in a book serif, a rule between questions, answers as paragraphs.",
    radius: { card: "10px", image: "6px" },
    card: "flat",
  }),
  redesign(board, {
    caption: "Kanban columns",
    idea: "Kanban on a calm ground: columns with counts, white cards, the status drawn before each column's name.",
    radius: { card: "14px", image: "8px" },
    card: "flat",
    // The header is one solid band of deep navy (the current Board's blue, without the gradient or the purple), so it
    // is a band in dark mode too, where a neutral one read as plain grey. An occasion brings its own band colour.
    accents: {
      light: { band: "#17365d", bandAlt: "#17365d", bandInk: "#ffffff" },
      dark: { band: "#1d3557", bandAlt: "#1d3557", bandInk: "#f5f5f7" },
    },
    contrast: (_p, a): ContrastPair[] => [
      { label: "header text on the band", fg: a.bandInk, bg: a.band },
      { label: "header chip text on the band", fg: a.bandInk, bg: mix(a.band, a.bandInk, 0.16) },
    ],
  }),
  redesign(sections, {
    caption: "Collapsible sections",
    idea: "An outline: groups that fold, one dense row per item with its agent, due date and status in columns.",
    radius: { card: "12px", image: "6px" },
    card: "flat",
  }),
  redesign(heat, {
    caption: "Hot to cool",
    idea: "Bars graded from hot to cool in the order to do them; finished ones cool to grey. Light or dark with the device.",
    // The current Heat is always dark. The redesign follows the device, like every other page.
    scheme: undefined,
    radius: { card: "14px", image: "6px" },
    card: "flat",
    accents: heat.accents,
    contrast: (p, a): ContrastPair[] => [
      ...[0, 0.25, 0.5, 0.75, 1].map((t) => ({ label: `bar text at ${t * 100}% of the gradient`, fg: a.barInk, bg: mix(a.hot, a.cool, t) })),
      { label: "finished bar text", fg: p.ink3, bg: p.sunk },
      { label: "finished bar title", fg: p.ink2, bg: p.sunk },
    ],
  }),
  redesign(tracker, {
    caption: "Dark issue tracker",
    idea: "An issue tracker for the dark: one dense panel of rows, each led by a status light; nothing printed that isn't real.",
    radius: { card: "10px", image: "4px" },
    card: "flat",
    contrast: (p): ContrastPair[] => [
      { label: "row text on the panel", fg: p.ink, bg: p.card },
      { label: "meta text on the recessed update", fg: p.ink3, bg: p.sunk },
      { label: "in-progress light on the panel (UI, 3:1)", fg: p.warn, bg: p.card, need: 3 },
      { label: "done light on the panel (UI, 3:1)", fg: p.deal, bg: p.card, need: 3 },
    ],
  }),
  redesign(gallery, {
    caption: "Photo cards",
    idea: "A pin board: photos at their natural heights, the want under each, then the best price and where.",
    stylesheet: true,
    radius: { card: "16px", image: "14px" },
    card: "flat",
    contrast: (p): ContrastPair[] => [
      { label: "text card words on the recessed surface", fg: p.ink, bg: p.sunk },
      { label: "text card meta on the recessed surface", fg: p.ink3, bg: p.sunk },
    ],
  }),
];

const NEXT_BY_SLUG = new Map(NEXT_TEMPLATES.map((t) => [t.slug, t]));

/** The redesigned template for a current one (same slug). */
export function nextTemplate(slug: string): Theme {
  const t = NEXT_BY_SLUG.get(slug);
  if (!t) throw new Error(`No redesigned look for ${slug}`);
  return t;
}

/** Like getThemeView, for the redesigned set: the same slug rules (aliases, occasions, defaults by format). */
export function getNextThemeView(slug: string | null | undefined, format: ListFormat = "shopping"): ThemeView {
  const look = resolveLook(slug, format);
  const tpl = nextTemplate(look.template.slug);
  const view = lookView(tpl, look.occasion, look.slug);
  return {
    ...view,
    className: view.className.replace(`tpl-${tpl.slug}`, `nx nx-${tpl.slug}`),
    // The shared base first, then the look, then the occasion's own (unchanged) stylesheet.
    stylesheets: ["/theme-css/next/base.css", `/theme-css/next/${tpl.slug}.css`, ...(look.occasion?.stylesheet ? [`/theme-css/${look.occasion.slug}.css`] : [])],
  };
}

/** `?look=next` on a list or a look preview asks for the redesigned set. Anything else is the current one. */
export function wantsNextLook(request: Request): boolean {
  return new URL(request.url).searchParams.get("look") === "next";
}
