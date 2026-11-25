import { ART } from "../art.ts";
import type { Theme } from "../types.ts";

/** Electric blue and magenta on a grid: chamfered panels, monospace readouts. */
export const cyberMonday: Theme = {
  slug: "cyber-monday",
  name: "Cyber Monday",
  caption: "Neon grid",
  group: "occasion",
  stylesheet: true,
  art: ART.cyberMonday,
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
  accents: {
    light: { band: "#1a1f6b", bandAlt: "#5a19d6", bandInk: "#ffffff", hot: "#5a19d6", cool: "#006a76", barInk: "#ffffff" },
    dark: { band: "#05071a", bandAlt: "#2a0a55", bandInk: "#e8ecff", hot: "#5a19d6", cool: "#006a76", barInk: "#ffffff" },
  },
  contrast: (_p, _a, mode) => [
    mode === "light" ? { label: "magenta accent text on card", fg: "#b0127a", bg: "#ffffff" } : { label: "magenta accent text on card", fg: "#ff5fd2", bg: "#0b1030" },
  ],
};
