import type { Theme } from "../types.ts";

/** Electric blue and magenta on a grid: chamfered panels, monospace readouts. */
export const cyberMonday: Theme = {
  slug: "cyber-monday",
  name: "Cyber Monday",
  group: "occasion",
  stylesheet: true,
  idea: "Electric blue and magenta on a fine grid: chamfered panels, monospace readouts and scan lines.",
  light: {
    paper: "#eef1ff", card: "#ffffff", sunk: "#e1e6fb", ink: "#0a0f2e", ink2: "#2c3463", ink3: "#4a5284",
    line: "#d2d8f5", lineStrong: "#9ea8de", want: "#5a19d6", wantInk: "#ffffff", wantSoft: "#e9e0fb",
    deal: "#006e7a", dealSoft: "#d6f4f6", warn: "#8a4b00", warnSoft: "#fdeed6", danger: "#c0124f",
  },
  dark: {
    paper: "#05071a", card: "#0b1030", sunk: "#04061a", ink: "#e8ecff", ink2: "#bfc6f0", ink3: "#949dd0",
    line: "#1b2254", lineStrong: "#323d85", want: "#2ef2ff", wantInk: "#00151a", wantSoft: "#0c2a3d",
    deal: "#2ef2ff", dealSoft: "#0c2a3d", warn: "#ffc857", warnSoft: "#2e2410", danger: "#ff5fa2",
  },
  fonts: { display: "mono", price: "mono" },
  radius: { card: "0", control: "0", input: "0", image: "0" },
  card: "outline",
  traits: ["mono-meta"],
  contrast: {
    light: [{ label: "magenta accent text on card", fg: "#b0127a", bg: "#ffffff" }],
    dark: [{ label: "magenta accent text on card", fg: "#ff5fd2", bg: "#0b1030" }],
  },
};
