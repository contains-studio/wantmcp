import type { Theme } from "../types.ts";

/** Black, red and green: a kinara with seven candles over a woven border. */
export const kwanzaa: Theme = {
  slug: "kwanzaa",
  name: "Kwanzaa",
  group: "occasion",
  stylesheet: true,
  idea: "Black, red and green: a kinara with seven candles (three red, one black, three green) above a woven border.",
  light: {
    paper: "#faf5ea", card: "#fffdf7", sunk: "#f0e8d6", ink: "#14110d", ink2: "#3c352c", ink3: "#5d5446",
    line: "#e6dcc6", lineStrong: "#b5a684", want: "#b3122a", wantInk: "#ffffff", wantSoft: "#f8e0e2",
    deal: "#0b6b35", dealSoft: "#dcefe2", warn: "#7f5300", warnSoft: "#fbefd2", danger: "#b3122a",
  },
  dark: {
    paper: "#0d0c0b", card: "#191715", sunk: "#090808", ink: "#f8f2e5", ink2: "#d9d0bf", ink3: "#ada393",
    line: "#2b2723", lineStrong: "#4a433b", want: "#ef4b5f", wantInk: "#1c0204", wantSoft: "#3a1218",
    deal: "#4fcf86", dealSoft: "#123020", warn: "#f2c14e", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "grotesque" },
  radius: { card: "6px", control: "6px", input: "6px", image: "4px" },
  traits: ["upper-display"],
  contrast: {
    light: [
      { label: "band text on black", fg: "#f8f2e5", bg: "#0d0c0b" },
      { label: "green on black band (large)", fg: "#2fae63", bg: "#0d0c0b", need: 3 },
    ],
    dark: [{ label: "band text on black", fg: "#f8f2e5", bg: "#000000" }],
  },
};
