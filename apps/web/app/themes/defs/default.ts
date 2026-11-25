import type { Theme } from "../types.ts";

/** The site's own look: warm near-white, near-black type, hairlines, one crimson accent. */
export const defaultTheme: Theme = {
  slug: "default",
  name: "The Want MCP",
  group: "default",
  idea: "The plain look: warm near-white, near-black type, hairline rows and one crimson accent.",
  light: {
    paper: "#faf9f6", card: "#ffffff", sunk: "#f2f0eb", ink: "#1d1b18", ink2: "#4b4842", ink3: "#6b665e",
    line: "#e6e2da", lineStrong: "#8c877d", want: "#b5174f", wantInk: "#ffffff", wantSoft: "#f6e6ec",
    deal: "#0f7a47", dealSoft: "#e3f1e8", warn: "#8a5300", warnSoft: "#f8eedb", danger: "#b42318",
  },
  dark: {
    paper: "#131211", card: "#191816", sunk: "#1d1c19", ink: "#f2f0eb", ink2: "#c8c4bb", ink3: "#9c978d",
    line: "#2d2b27", lineStrong: "#77726a", want: "#f2709a", wantInk: "#1a0008", wantSoft: "#3a1a26",
    deal: "#5fd395", dealSoft: "#15291e", warn: "#f0b45a", warnSoft: "#2e2412", danger: "#ff8a80",
  },
  fonts: { display: "sans" },
  radius: { card: "6px", control: "4px", input: "4px", image: "4px" },
  card: "flat",
};
