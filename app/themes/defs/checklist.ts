import type { Theme } from "../types.ts";

/** Big boxes to tick: bright, friendly, rounded; bought items get struck through. */
export const checklist: Theme = {
  slug: "checklist",
  name: "Checklist",
  group: "workspace",
  idea: "Big boxes to tick: bright, friendly and rounded, and bought items get struck through.",
  light: {
    paper: "#fffcf0", card: "#ffffff", sunk: "#f6f0d9", ink: "#1d1a12", ink2: "#433d2c", ink3: "#625a45",
    line: "#ece3c4", lineStrong: "#d4c693", want: "#c2351b", wantInk: "#ffffff", wantSoft: "#fde3dc",
    deal: "#14703f", dealSoft: "#dcf2e4", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#191712", card: "#24211a", sunk: "#12100c", ink: "#f8f3e3", ink2: "#d8d0b9", ink3: "#ada590",
    line: "#37322a", lineStrong: "#524b3d", want: "#ff8a6e", wantInk: "#2a0b04", wantSoft: "#3d1c14",
    deal: "#7fdca2", dealSoft: "#15301f", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "rounded", price: "rounded" },
  radius: { card: "18px", control: "999px", input: "14px", image: "12px" },
  traits: ["soft", "checklist"],
  layout: "list",
};
