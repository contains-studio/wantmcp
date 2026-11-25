import { FONTS, type Accents, type Layout, type Palette, type Theme } from "./types.ts";

/** What a page needs to render a look: serialisable, no theme code on the client. */
export interface ThemeView {
  /** The look's slug as stored on a list: `board`, `christmas`, `board--christmas`. */
  slug: string;
  name: string;
  template: string;
  occasion: string | null;
  group: Theme["group"];
  idea: string;
  layout: Layout;
  checklist: boolean;
  fab: boolean;
  scheme: "light" | "dark" | null;
  natural: "shopping" | "tasks" | "research";
  /** The stylesheets this look needs (template, then occasion), each loaded only where used. */
  stylesheets: string[];
  /** Class names for the themed wrapper. */
  className: string;
  /** Custom properties for the themed wrapper's style attribute. */
  style: Record<string, string>;
  /** A few colours for swatches. */
  swatch: { paper: string; card: string; ink: string; want: string; darkPaper: string; darkWant: string };
}

const KEYS: Array<[keyof Palette, string]> = [
  ["paper", "paper"],
  ["card", "card"],
  ["sunk", "sunk"],
  ["ink", "ink"],
  ["ink2", "ink-2"],
  ["ink3", "ink-3"],
  ["line", "line"],
  ["lineStrong", "line-strong"],
  ["want", "want"],
  ["wantInk", "want-ink"],
  ["wantSoft", "want-soft"],
  ["deal", "deal"],
  ["dealSoft", "deal-soft"],
  ["warn", "warn"],
  ["warnSoft", "warn-soft"],
  ["danger", "danger"],
];

const ACCENT_KEYS: Array<[keyof Accents, string]> = [
  ["band", "band"],
  ["bandAlt", "band-alt"],
  ["bandInk", "band-ink"],
  ["hot", "hot"],
  ["cool", "cool"],
  ["barInk", "bar-ink"],
];

export const HEAT_HOT = "#c4122f";
export const HEAT_COOL = "#3a3fc4";

/** The palette and accents a look uses in one mode. */
export function lookColors(template: Theme, occasion: Theme | null, mode: "light" | "dark"): { palette: Palette; accents: Accents } {
  // If either half is always dark, the look is always dark and uses the dark palette in both modes.
  const fixedDark = template.scheme === "dark" || occasion?.scheme === "dark";
  const m = fixedDark ? "dark" : mode;
  const palette = (occasion ?? template)[m];
  const accents: Accents = {
    band: palette.ink,
    bandAlt: palette.ink2,
    bandInk: palette.paper,
    hot: HEAT_HOT,
    cool: HEAT_COOL,
    barInk: "#ffffff",
    ...template.accents?.[m],
    ...occasion?.accents?.[m],
  };
  return { palette, accents };
}

/** Combines a template and an optional occasion into what a page needs. */
export function lookView(template: Theme, occasion: Theme | null, slug: string): ThemeView {
  // On Default cards an occasion is the whole look (as before the two were separate choices).
  const dressed = occasion && template.slug === "default" ? occasion : template;
  const style: Record<string, string> = {};
  for (const [mode, prefix] of [["light", "tl"], ["dark", "td"]] as const) {
    const { palette: p, accents: a } = lookColors(template, occasion, mode);
    for (const [k, css] of KEYS) style[`--${prefix}-${css}`] = p[k] as string;
    for (const [k, css] of ACCENT_KEYS) style[`--${prefix}-occ-${css}`] = a[k];
    const flat = dressed.card === "flat" || dressed.card === "outline";
    style[`--${prefix}-shadow`] = flat
      ? "none"
      : p.shadow ?? (mode === "dark" ? "0 1px 0 rgb(0 0 0 / 0.3), 0 10px 30px -14px rgb(0 0 0 / 0.7)" : "0 1px 0 rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)");
  }
  if (dressed.fonts?.display) style["--font-display"] = FONTS[dressed.fonts.display];
  if (dressed.fonts?.body) style["--font-sans"] = FONTS[dressed.fonts.body];
  if (dressed.fonts?.price) style["--font-price"] = FONTS[dressed.fonts.price];
  // On other templates the occasion lends its display face to the list title only.
  if (occasion && dressed !== occasion && occasion.fonts?.display) style["--font-occ-display"] = FONTS[occasion.fonts.display];
  if (dressed.radius?.card) style["--r-card"] = dressed.radius.card;
  if (dressed.radius?.control) style["--r-control"] = dressed.radius.control;
  if (dressed.radius?.input) style["--r-input"] = dressed.radius.input;
  if (dressed.radius?.image) style["--r-image"] = dressed.radius.image;
  if (dressed.card === "outline") style["--card-border-w"] = "1.5px";

  const layout = template.layout ?? "grid";
  const traits = dressed.traits ?? [];
  const scheme = template.scheme === "dark" || occasion?.scheme === "dark" ? "dark" : (template.scheme ?? occasion?.scheme ?? null);
  const light = lookColors(template, occasion, "light").palette;
  const dark = lookColors(template, occasion, "dark").palette;
  const stylesheets = [template, occasion].filter((t): t is Theme => !!t?.stylesheet).map((t) => `/theme-css/${t.slug}.css`);
  return {
    slug,
    name: occasion ? (template.slug === "default" ? occasion.name : `${template.name} · ${occasion.name}`) : template.name,
    template: template.slug,
    occasion: occasion?.slug ?? null,
    group: occasion ? "occasion" : template.group,
    idea: occasion && template.slug !== "default" ? `${template.idea} Dressed for ${occasion.name}.` : (occasion ?? template).idea,
    layout,
    checklist: traits.includes("checklist") || !!template.traits?.includes("checklist"),
    fab: !!template.traits?.includes("fab"),
    scheme,
    natural: template.slug === "default" ? (occasion?.natural ?? "shopping") : (template.natural ?? "shopping"),
    stylesheets,
    className: [
      "themed",
      `theme-${slug}`,
      `tpl-${template.slug}`,
      occasion ? `occ-${occasion.slug} has-occ` : "no-occ",
      `layout-${layout}`,
      scheme ? `scheme-${scheme}` : "",
      ...traits.map((x) => `t-${x}`),
    ]
      .filter(Boolean)
      .join(" "),
    style,
    swatch: { paper: light.paper, card: light.card, ink: light.ink, want: light.want, darkPaper: dark.paper, darkWant: dark.want },
  };
}
