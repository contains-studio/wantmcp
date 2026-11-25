/**
 * List themes. A theme is data: palettes, fonts, shapes, traits, a layout and an optional
 * motif. It is turned into CSS custom properties on the server (see view.ts), so a visitor
 * downloads only the values of the theme their list uses.
 */

export interface Palette {
  paper: string; // page background
  card: string; // card surface
  sunk: string; // recessed surface (image wells, code)
  ink: string; // body text and prices
  ink2: string; // secondary text
  ink3: string; // meta text
  line: string;
  lineStrong: string;
  want: string; // accent: primary buttons, "lowest" badge, focus
  wantInk: string; // text on accent
  wantSoft: string; // tinted accent background
  deal: string; // savings text
  dealSoft: string; // savings badge background
  warn: string;
  warnSoft: string;
  danger: string;
  shadow?: string;
}

/** Font stacks. Only self-hosted fonts (Bricolage, Inter, JetBrains Mono) or system stacks. */
export const FONTS = {
  grotesque: '"Bricolage Grotesque Variable", ui-sans-serif, system-ui, sans-serif',
  sans: '"Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, ui-serif, serif',
  didone: 'Didot, "Bodoni 72", "Bodoni MT", "Iowan Old Style", Georgia, ui-serif, serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Bricolage Grotesque Variable", system-ui, sans-serif',
} as const;
export type FontKey = keyof typeof FONTS;

/**
 * How an item's entries are arranged.
 * grid: cards side by side (default) · list: one readable column · rows: compact rows ·
 * board: items as columns of cards · sheet: a comparison table per item.
 */
export type Layout = "grid" | "list" | "rows" | "board" | "sheet";

/** Generic style switches defined once in app.css (`.t-<trait>`). */
export type Trait = "serif-display" | "upper-display" | "italic-display" | "soft" | "mono-meta" | "dense" | "roomy" | "checklist";

export interface Theme {
  slug: string;
  name: string;
  group: "default" | "occasion" | "workspace";
  /** One line: the design idea. */
  idea: string;
  light: Palette;
  dark: Palette;
  fonts?: { display?: FontKey; body?: FontKey; price?: FontKey };
  /** Corner radii (CSS lengths). */
  radius?: { card?: string; control?: string; input?: string; image?: string };
  /** raised: soft shadow · flat: no shadow · outline: no shadow, heavier border. */
  card?: "raised" | "flat" | "outline";
  traits?: Trait[];
  layout?: Layout;
  /** Decorative SVG drawn behind the list header. Receives a stroke/fill colour; returns <svg> markup. */
  motif?: (color: string) => string;
  /** Motif colour per mode; defaults to the accent. */
  motifColor?: { light: string; dark: string };
}
