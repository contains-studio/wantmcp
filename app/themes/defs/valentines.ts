import type { Theme } from "../types.ts";

/** Letterpress on blush card: wine and rose, an italic serif, a few outlined hearts. */
export const valentines: Theme = {
  slug: "valentines",
  name: "Valentine's Day",
  group: "occasion",
  idea: "Letterpress on blush card: wine and rose, an italic serif and a few outlined hearts.",
  light: {
    paper: "#fbf2f2", card: "#fffafa", sunk: "#f4e4e6", ink: "#350c19", ink2: "#5c2e3c", ink3: "#7a4b59",
    line: "#efd8dc", lineStrong: "#dcb0ba", want: "#b0123e", wantInk: "#ffffff", wantSoft: "#fbe0e7",
    deal: "#1d6b47", dealSoft: "#dcefe3", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#1c0a11", card: "#2a111a", sunk: "#13060b", ink: "#fbe9ee", ink2: "#e3c3cd", ink3: "#bf98a5",
    line: "#45202c", lineStrong: "#663342", want: "#ff7aa0", wantInk: "#2a0711", wantSoft: "#45172a",
    deal: "#7fdcaa", dealSoft: "#123022", warn: "#f5b13d", warnSoft: "#36270d", danger: "#ff8a80",
  },
  fonts: { display: "serif" },
  radius: { card: "22px", control: "999px", image: "16px" },
  traits: ["serif-display", "italic-display"],
  motif: (c) => {
    const heart = (x: number, y: number, s: number) =>
      `<path transform="translate(${x} ${y}) scale(${s})" d="M0 8C-6-4-22 0-20 12c2 10 20 22 20 22s18-12 20-22C22 0 6-4 0 8z"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="${c}" stroke-width="1.6" opacity="0.32">
      ${heart(290, 60, 3)}${heart(170, 50, 1.3)}${heart(200, 200, 1.6)}${heart(360, 220, 1)}${heart(110, 150, 0.9)}</svg>`;
  },
};
