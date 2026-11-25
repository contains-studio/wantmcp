import { FONTS, type Layout, type Palette, type Theme } from "./types.ts";

/** What a page needs to render a theme: serialisable, no theme code on the client. */
export interface ThemeView {
  slug: string;
  name: string;
  group: Theme["group"];
  idea: string;
  layout: Layout;
  checklist: boolean;
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

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}")`;

export function themeView(t: Theme): ThemeView {
  const style: Record<string, string> = {};
  const shadow = (p: Palette, dark: boolean) =>
    t.card === "flat" || t.card === "outline"
      ? "none"
      : p.shadow ?? (dark ? "0 1px 0 rgb(0 0 0 / 0.3), 0 10px 30px -14px rgb(0 0 0 / 0.7)" : "0 1px 0 rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)");
  for (const [mode, p] of [["tl", t.light], ["td", t.dark]] as const) {
    for (const [k, css] of KEYS) style[`--${mode}-${css}`] = p[k] as string;
    style[`--${mode}-shadow`] = shadow(p, mode === "td");
    const motifColor = t.motifColor ? (mode === "tl" ? t.motifColor.light : t.motifColor.dark) : p.want;
    style[`--${mode}-motif`] = t.motif ? svgUrl(t.motif(motifColor)) : "none";
  }
  if (t.fonts?.display) style["--font-display"] = FONTS[t.fonts.display];
  if (t.fonts?.body) style["--font-sans"] = FONTS[t.fonts.body];
  if (t.fonts?.price) style["--font-price"] = FONTS[t.fonts.price];
  if (t.radius?.card) style["--r-card"] = t.radius.card;
  if (t.radius?.control) style["--r-control"] = t.radius.control;
  if (t.radius?.input) style["--r-input"] = t.radius.input;
  if (t.radius?.image) style["--r-image"] = t.radius.image;
  if (t.card === "outline") style["--card-border-w"] = "1.5px";
  const layout = t.layout ?? "grid";
  const traits = t.traits ?? [];
  return {
    slug: t.slug,
    name: t.name,
    group: t.group,
    idea: t.idea,
    layout,
    checklist: traits.includes("checklist"),
    className: ["themed", `theme-${t.slug}`, `layout-${layout}`, ...traits.map((x) => `t-${x}`)].join(" "),
    style,
    swatch: { paper: t.light.paper, card: t.light.card, ink: t.light.ink, want: t.light.want, darkPaper: t.dark.paper, darkWant: t.dark.want },
  };
}
