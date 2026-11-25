import { ART } from "../art.ts";
import type { Theme } from "../types.ts";

/** Bunting, sprinkles and bubbly shapes in party colours. */
export const birthday: Theme = {
  slug: "birthday",
  name: "Birthday",
  group: "occasion",
  stylesheet: true,
  art: ART.birthday,
  idea: "Bunting across the top, sprinkles on the page, bubbly rounded cards with candy-coloured tops.",
  accents: {
    light: { band: "#6b2bd9", bandAlt: "#b8215a", bandInk: "#ffffff", hot: "#b8215a", cool: "#5b23c4", barInk: "#ffffff" },
    dark: { band: "#3a1f7a", bandAlt: "#7a1640", bandInk: "#fbf6ff", hot: "#b8215a", cool: "#5b23c4", barInk: "#ffffff" },
  },
  light: {
    paper: "#fff8ec", card: "#ffffff", sunk: "#fdeeda", ink: "#241536", ink2: "#47385a", ink3: "#665879",
    line: "#f1e2cc", lineStrong: "#d2b98f", want: "#6b2bd9", wantInk: "#ffffff", wantSoft: "#ece2fc",
    deal: "#0d6e5c", dealSoft: "#d7f3ec", warn: "#8a4b00", warnSoft: "#fdeed6", danger: "#c0262d",
  },
  dark: {
    paper: "#1a1230", card: "#251a42", sunk: "#140e26", ink: "#fbf6ff", ink2: "#d9cdee", ink3: "#ad9fcb",
    line: "#352757", lineStrong: "#54427e", want: "#ffb547", wantInk: "#2a1600", wantSoft: "#3d2a26",
    deal: "#6fe3c6", dealSoft: "#123630", warn: "#ffd166", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "rounded" },
  radius: { card: "24px", control: "999px", input: "16px", image: "18px" },
  traits: ["soft"],
};
