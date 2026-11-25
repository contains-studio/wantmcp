import type { Theme } from "../types.ts";

/** A quiet page to write on: white paper, a book serif, one readable column of entries. */
export const doc: Theme = {
  slug: "doc",
  name: "Doc",
  group: "workspace",
  idea: "A quiet page to write on: white paper, a book serif and one readable column of entries.",
  light: {
    paper: "#ffffff", card: "#ffffff", sunk: "#f5f4f2", ink: "#1c1917", ink2: "#44403c", ink3: "#655f59",
    line: "#e7e5e4", lineStrong: "#cfcac6", want: "#2457c5", wantInk: "#ffffff", wantSoft: "#e5edfb",
    deal: "#15703f", dealSoft: "#ddf2e4", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#1a1a1b", card: "#1f1f21", sunk: "#141415", ink: "#ece9e4", ink2: "#ccc8c2", ink3: "#a39f99",
    line: "#2f2f32", lineStrong: "#46464a", want: "#8fb1ff", wantInk: "#0d1830", wantSoft: "#1d2a45",
    deal: "#7ad79c", dealSoft: "#16301f", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "serif", body: "serif", price: "sans" },
  radius: { card: "6px", control: "6px", input: "6px", image: "4px" },
  card: "flat",
  traits: ["serif-display", "roomy"],
  layout: "list",
};
