import type { Theme } from "../../themes/types.ts";

/** A project tracker: a white surface, collapsible sections, rows with a round tick, owner, due date and status. */
export const sections: Theme = {
  slug: "sections",
  name: "Sections",
  caption: "Collapsible sections",
  group: "workspace",
  natural: "tasks",
  stylesheet: true,
  idea: "A project tracker: collapsible sections of rows with a round tick, agent, due date and a status pill; items open in a side panel.",
  accents: { light: { band: "#2a2b2e" }, dark: { band: "#0f1011" } },
  light: {
    paper: "#f3f3f4", card: "#ffffff", sunk: "#f5f4f3", ink: "#1e1f21", ink2: "#3d3e40", ink3: "#5f6062",
    line: "#ebeaea", lineStrong: "#b8b7b6", want: "#c0392f", wantInk: "#ffffff", wantSoft: "#fdeceb",
    deal: "#0f6b4a", dealSoft: "#dff3ea", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#18191b", card: "#1e1f21", sunk: "#232427", ink: "#f5f4f3", ink2: "#d4d3d2", ink3: "#a2a0a2",
    line: "#3a3b3d", lineStrong: "#565557", want: "#ff8a80", wantInk: "#2a0a07", wantSoft: "#43252a",
    deal: "#5fd1a2", dealSoft: "#17352a", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "sans", price: "sans" },
  radius: { card: "8px", control: "6px", input: "6px", image: "6px" },
  card: "outline",
  traits: ["soft"],
  layout: "sections",
};
