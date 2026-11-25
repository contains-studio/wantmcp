import type { Palette } from "./types.ts";

/**
 * The site's palette, mirrored from the tokens in app/app.css (keep the two in step). Every layout
 * without an occasion takes its neutrals and its one accent from here, so a list in Sheet,
 * Checklist or Doc stays the same product; occasions bring their own palettes.
 */
export const SITE: { light: Palette; dark: Palette } = {
  light: {
    paper: "#fbfbfd", card: "#ffffff", sunk: "#f5f5f7", ink: "#1d1d1f", ink2: "#424245", ink3: "#6e6e73",
    line: "#e5e5ea", lineStrong: "#86868b", want: "#0a6fe0", wantInk: "#ffffff", wantSoft: "#eaf3fe",
    deal: "#187a48", dealSoft: "#e9f6ee", warn: "#8a5300", warnSoft: "#fdf3e1", danger: "#d70015",
  },
  dark: {
    paper: "#000000", card: "#1c1c1e", sunk: "#111113", ink: "#f5f5f7", ink2: "#c7c7cc", ink3: "#a1a1a6",
    line: "#38383a", lineStrong: "#7c7c80", want: "#66adff", wantInk: "#001a38", wantSoft: "#0d2440",
    deal: "#4cd48a", dealSoft: "#10301e", warn: "#ffb340", warnSoft: "#33270d", danger: "#ff6961",
  },
};
