import type { Theme } from "../types.ts";

/** The site's own identity: warm paper and ink, one hot "want" pink. */
export const defaultTheme: Theme = {
  slug: "default",
  name: "The Want MCP",
  group: "default",
  idea: "Warm paper and ink with one hot pink, the site's own identity.",
  light: {
    paper: "#f7f2ea", card: "#fffdf9", sunk: "#efe8dc", ink: "#1b1512", ink2: "#4a403a", ink3: "#6f645c",
    line: "#e3d9ca", lineStrong: "#c9bba7", want: "#d1236f", wantInk: "#ffffff", wantSoft: "#fbe3ee",
    deal: "#0f7a47", dealSoft: "#ddf3e7", warn: "#9a5a00", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#15110f", card: "#1f1a17", sunk: "#110e0c", ink: "#f6efe6", ink2: "#d3c7ba", ink3: "#a99c8f",
    line: "#342c27", lineStrong: "#4d423b", want: "#ff5c9d", wantInk: "#1b0510", wantSoft: "#3a1527",
    deal: "#4ade80", dealSoft: "#12301f", warn: "#f5b13d", warnSoft: "#36270d", danger: "#ff8a80",
  },
};
