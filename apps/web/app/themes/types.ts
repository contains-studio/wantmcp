/**
 * List looks. A look is a template (how the list is laid out: Default cards, Board, Sections…)
 * optionally dressed with an occasion (Christmas, Chanukah…). Both are data: palettes, accents,
 * fonts, shapes, traits, a layout and a stylesheet. They are combined on the server into CSS
 * custom properties (see view.ts), so a visitor downloads only what the chosen look uses.
 *
 * A list stores its look as one slug: `board`, `christmas` (an occasion on Default cards) or
 * `board--christmas`. See catalogue.server.ts.
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

/**
 * Colours an occasion (or a template) lends to the places a template has room for: a band
 * (Board's backdrop, Heat's header, Sections' rail), text on that band, and the two ends of Heat's
 * bars with the text on them. Every pair is checked by `pnpm check:contrast`.
 */
export interface Accents {
  band: string;
  bandAlt: string; // second stop of a band gradient; bandInk must read on it too
  bandInk: string;
  hot: string;
  cool: string;
  barInk: string; // text on Heat's bars, from hot to cool
}

/** Font stacks. Only self-hosted fonts (Bricolage, Inter, JetBrains Mono) or system stacks. */
export const FONTS = {
  grotesque: '"Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  sans: '"Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, ui-serif, serif',
  didone: 'Didot, "Bodoni 72", "Bodoni MT", "Iowan Old Style", Georgia, ui-serif, serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Inter Variable", system-ui, sans-serif',
} as const;
export type FontKey = keyof typeof FONTS;

/**
 * How an item's entries are arranged.
 * grid: cards side by side (default) · list: one readable column · rows: compact rows ·
 * board: shopping lists get one column per item; task and research lists get status columns
 * of item cards that open in a panel · sheet: a comparison table per item (shopping only) ·
 * sections: an index of rows in collapsible groups, items open in a side panel ·
 * heat: full-width colour-graded bars, items open in a panel.
 */
export type Layout = "grid" | "list" | "rows" | "board" | "sheet" | "sections" | "heat";

/** Generic style switches defined once in app.css (`.t-<trait>`). */
export type Trait = "serif-display" | "upper-display" | "italic-display" | "soft" | "mono-meta" | "dense" | "roomy" | "checklist";

/** An extra contrast pair the theme's stylesheet relies on (text over a gradient, a backdrop…). */
export interface ContrastPair {
  label: string;
  fg: string;
  bg: string;
  /** 4.5 for text (default), 3 for large text or UI parts. */
  need?: number;
}

export interface Theme {
  slug: string;
  /** Old slugs that still resolve to this theme. */
  aliases?: string[];
  /** A theme whose identity is dark (or light) looks the same in both modes: light and dark palettes are equal. */
  scheme?: "light" | "dark";
  /** Has its own stylesheet at /theme-css/<slug>.css (public/theme-css), loaded only where the theme is used. */
  stylesheet?: boolean;
  /** Format the theme is designed around; the gallery previews it with that format. */
  natural?: "shopping" | "tasks" | "research";
  /** Extra pairs for `pnpm check:contrast`, per mode, given the combined palette and accents. */
  contrast?: (p: Palette, a: Accents, mode: "light" | "dark") => ContrastPair[];
  name: string;
  /** Three words or fewer, under the thumbnail. */
  caption: string;
  /** Templates are "default" and "workspace"; occasions dress any template. */
  group: "default" | "occasion" | "workspace";
  /** Accents per mode (missing ones fall back to the template's, then to the palette). */
  accents?: { light?: Partial<Accents>; dark?: Partial<Accents> };
  /** Occasions: the drawn art as SVG markup, for the share image (the stylesheet carries its own copy). */
  art?: string;
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
}
