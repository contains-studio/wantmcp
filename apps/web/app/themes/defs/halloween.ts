import { ART } from "../art.ts";
import type { Theme } from "../types.ts";

const p = {
  paper: "#110b17", card: "#1b1224", sunk: "#0c0811", ink: "#f6eefc", ink2: "#d6c8e2", ink3: "#ad9cbd",
  line: "#2e2140", lineStrong: "#4b3863", want: "#ff7a1a", wantInk: "#1a0800", wantSoft: "#3a1d0b",
  deal: "#9be15d", dealSoft: "#1d2e12", warn: "#ffc857", warnSoft: "#33260e", danger: "#ff8080",
};

/** Purple-black night, pumpkin orange, a moon, bats and torn-edged cards. */
export const halloween: Theme = {
  slug: "halloween",
  name: "Halloween",
  caption: "Pumpkin and moon",
  group: "occasion",
  scheme: "dark",
  stylesheet: true,
  art: ART.halloween,
  idea: "A purple-black night in pumpkin orange: a full moon with bats, a cobweb corner and torn-edged cards.",
  accents: {
    light: { band: "#1b1224", bandAlt: "#3d1d06", bandInk: "#f6eefc", hot: "#b83c08", cool: "#4b2a7a", barInk: "#ffffff" },
    dark: { band: "#1b1224", bandAlt: "#3d1d06", bandInk: "#f6eefc", hot: "#b83c08", cool: "#4b2a7a", barInk: "#ffffff" },
  },
  light: p,
  dark: p,
  fonts: { display: "grotesque" },
  radius: { card: "6px", control: "8px", input: "8px", image: "4px" },
  traits: ["upper-display"],
};
