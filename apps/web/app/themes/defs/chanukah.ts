import { ART } from "../art.ts";
import type { Theme } from "../types.ts";

const p = {
  paper: "#08163a", card: "#0f2150", sunk: "#061030", ink: "#f1f4fb", ink2: "#cfd7ea", ink3: "#a7b3cf",
  line: "#1d3470", lineStrong: "#3a5596", want: "#f2c65a", wantInk: "#1b1300", wantSoft: "#22305a",
  deal: "#86e3b8", dealSoft: "#0f3236", warn: "#f5c76a", warnSoft: "#2f2a1c", danger: "#ff9a9a",
};

/** A deep blue night in silver and gold, with a properly drawn nine-branch menorah. */
export const chanukah: Theme = {
  slug: "chanukah",
  aliases: ["hanukkah"],
  name: "Chanukah",
  group: "occasion",
  scheme: "dark",
  stylesheet: true,
  art: ART.chanukah,
  idea: "A deep blue night in silver and gold: a nine-branch menorah with the shamash raised in the middle, and a high-contrast serif.",
  light: p,
  dark: p,
  fonts: { display: "didone" },
  radius: { card: "14px", control: "10px", input: "10px", image: "8px" },
  traits: ["serif-display"],
  accents: {
    light: { band: "#061030", bandAlt: "#1c3a86", bandInk: "#f1f4fb", hot: "#7d5f12", cool: "#1c3a86", barInk: "#ffffff" },
    dark: { band: "#061030", bandAlt: "#1c3a86", bandInk: "#f1f4fb", hot: "#7d5f12", cool: "#1c3a86", barInk: "#ffffff" },
  },
  contrast: () => [{ label: "silver text on card", fg: "#c9d3e6", bg: "#0f2150" }],
};
