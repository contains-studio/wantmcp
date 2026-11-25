import type { Theme } from "../types.ts";

/** A terminal at midnight: electric violet on ink, monospace type, circuit traces. */
export const cyberMonday: Theme = {
  slug: "cyber-monday",
  name: "Cyber Monday",
  group: "occasion",
  idea: "A terminal at midnight: electric violet, monospace type and circuit traces.",
  light: {
    paper: "#f3f2fd", card: "#ffffff", sunk: "#e6e3fb", ink: "#120e2e", ink2: "#3b3563", ink3: "#5a5486",
    line: "#dcd8f5", lineStrong: "#b4acec", want: "#5326e8", wantInk: "#ffffff", wantSoft: "#e6dffd",
    deal: "#036b4a", dealSoft: "#d3f5e8", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#0b0a1d", card: "#15133a", sunk: "#070614", ink: "#eeebff", ink2: "#c6c0f2", ink3: "#9f98d6",
    line: "#2a2660", lineStrong: "#433d8a", want: "#9d8cff", wantInk: "#0b0a1d", wantSoft: "#251f5c",
    deal: "#3ef0a0", dealSoft: "#0c2e25", warn: "#f5b13d", warnSoft: "#36270d", danger: "#ff8a80",
  },
  fonts: { display: "mono", price: "mono" },
  radius: { card: "6px", control: "6px", input: "6px", image: "4px" },
  card: "outline",
  traits: ["mono-meta"],
  motif: (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="${c}" stroke-width="2" opacity="0.3">
    <path d="M20 60h120l30 30h90l20-20h100M60 140h90l25 25h120l30-30h55M10 220h70l40-40h80l40 40h140"/>
    <g fill="${c}" stroke="none"><circle cx="140" cy="60" r="5"/><circle cx="280" cy="70" r="5"/><circle cx="150" cy="140" r="5"/>
    <circle cx="295" cy="165" r="5"/><circle cx="120" cy="180" r="5"/><circle cx="240" cy="220" r="5"/></g>
  </svg>`,
};
