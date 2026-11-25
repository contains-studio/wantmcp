import { ART } from "../art.ts";
import type { Theme } from "../types.ts";

/** Evergreen, cranberry and gold: a full-bleed evergreen band, items wrapped like parcels, finds on gift tags. */
export const christmas: Theme = {
  slug: "christmas",
  name: "Christmas",
  group: "occasion",
  stylesheet: true,
  art: ART.christmas,
  idea: "Evergreen, cranberry and gold: a full-bleed evergreen band, every item wrapped like a parcel and every find on a gift tag.",
  light: {
    paper: "#f7f1e4", card: "#fffbf2", sunk: "#efe6d2", ink: "#16261d", ink2: "#3b4a40", ink3: "#5a6a5f",
    line: "#e4d9c0", lineStrong: "#b9a984", want: "#a3152f", wantInk: "#ffffff", wantSoft: "#f8e1e4",
    deal: "#0f6a3c", dealSoft: "#ddf0e3", warn: "#855000", warnSoft: "#fbefd2", danger: "#a3152f",
  },
  dark: {
    paper: "#0b2a1d", card: "#113726", sunk: "#08211a", ink: "#fbf3e2", ink2: "#dcd3bf", ink3: "#b5ae99",
    line: "#1d4a35", lineStrong: "#336b50", want: "#f0c75e", wantInk: "#2a1a00", wantSoft: "#2c3a1c",
    deal: "#8fe0b0", dealSoft: "#123d2a", warn: "#f5c76a", warnSoft: "#3a2f10", danger: "#ff9a9a",
  },
  fonts: { display: "serif" },
  radius: { card: "10px", control: "999px", input: "10px", image: "8px" },
  traits: ["serif-display"],
  accents: {
    light: { band: "#0e3b28", bandAlt: "#165a3d", bandInk: "#fbf3e2", hot: "#a3152f", cool: "#0e5a3a", barInk: "#ffffff" },
    dark: { band: "#06180f", bandAlt: "#0e3b28", bandInk: "#fbf3e2", hot: "#b3203a", cool: "#145c3c", barInk: "#ffffff" },
  },
  // On Default cards the header is an evergreen band with a gold eyebrow.
  contrast: (_p, _a, mode) => [
    { label: "band text on evergreen", fg: "#fbf3e2", bg: mode === "light" ? "#0e3b28" : "#06180f" },
    { label: "gold eyebrow on evergreen band", fg: "#e9bf55", bg: mode === "light" ? "#0e3b28" : "#06180f" },
  ],
};
