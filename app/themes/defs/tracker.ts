import type { Theme } from "../types.ts";

const p = {
  paper: "#08090c", card: "#0f1115", sunk: "#0b0d10", ink: "#e6e8ee", ink2: "#b4b9c4", ink3: "#8a909c",
  line: "#1c1f26", lineStrong: "#2e333d", want: "#8b7cff", wantInk: "#0b0820", wantSoft: "#1e1a3d",
  deal: "#4cd88e", dealSoft: "#0f2a1d", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
};

/** An issue tracker built for the dark: dense rows, issue numbers, monospace detail, status lights. */
export const tracker: Theme = {
  slug: "tracker",
  name: "Tracker",
  group: "workspace",
  natural: "tasks",
  scheme: "dark",
  stylesheet: true,
  idea: "An issue tracker built for the dark: dense rows with issue numbers, monospace detail and status lights.",
  light: p,
  dark: p,
  fonts: { display: "sans", body: "sans", price: "mono" },
  radius: { card: "6px", control: "6px", input: "6px", image: "4px" },
  card: "outline",
  traits: ["dense", "mono-meta"],
  layout: "rows",
};
