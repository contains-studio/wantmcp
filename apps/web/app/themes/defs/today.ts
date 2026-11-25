import type { Theme } from "../types.ts";

/** A calm to-do list: lots of air, a big title with a coloured round mark, soft square ticks and a round add button. */
export const today: Theme = {
  slug: "today",
  aliases: ["checklist"],
  name: "Checklist",
  caption: "Calm to-do",
  group: "workspace",
  natural: "tasks",
  stylesheet: true,
  idea: "A calm to-do list: lots of air, a big bold title with a coloured round mark, soft ticks, notes under each item and a round add button.",
  light: {
    paper: "#ffffff", card: "#ffffff", sunk: "#f4f5f7", ink: "#1d1d1f", ink2: "#45474b", ink3: "#6b6e73",
    line: "#eceef1", lineStrong: "#b9bdc4", want: "#1b66d6", wantInk: "#ffffff", wantSoft: "#e6effc",
    deal: "#1d7a44", dealSoft: "#e2f4e8", warn: "#8f4d00", warnSoft: "#fdf0dc", danger: "#c0262d",
  },
  dark: {
    paper: "#1c1d21", card: "#24262b", sunk: "#202226", ink: "#f2f3f5", ink2: "#c9ccd1", ink3: "#9a9ea6",
    line: "#2f3238", lineStrong: "#4b4f57", want: "#5b9dff", wantInk: "#08162d", wantSoft: "#1c2a42",
    deal: "#6cd496", dealSoft: "#17301f", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "sans", price: "sans" },
  radius: { card: "14px", control: "999px", input: "10px", image: "10px" },
  card: "flat",
  traits: ["checklist", "fab", "roomy"],
  layout: "list",
};
