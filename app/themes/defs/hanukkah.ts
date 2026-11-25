import type { Theme } from "../types.ts";

/** Candlelight on deep blue: silver and blue, high-contrast serif, nine slender candles. */
export const hanukkah: Theme = {
  slug: "hanukkah",
  name: "Hanukkah",
  group: "occasion",
  idea: "Candlelight on deep blue: silver and blue, a high-contrast serif and nine slender candles.",
  light: {
    paper: "#f2f5fb", card: "#ffffff", sunk: "#e4eaf6", ink: "#0d1e3d", ink2: "#33456a", ink3: "#52638a",
    line: "#d8e0ef", lineStrong: "#aebbd6", want: "#1f48c9", wantInk: "#ffffff", wantSoft: "#dfe7fb",
    deal: "#0d6b47", dealSoft: "#d8f1e6", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#08142c", card: "#102247", sunk: "#050d1d", ink: "#eef2fb", ink2: "#c4cfe6", ink3: "#9aa9c8",
    line: "#1f3563", lineStrong: "#34508a", want: "#9dbbff", wantInk: "#08142c", wantSoft: "#1a2f5e",
    deal: "#6ee7b7", dealSoft: "#0d2e2c", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "didone" },
  radius: { card: "12px", control: "10px", image: "8px" },
  traits: ["serif-display"],
  motifColor: { light: "#1f48c9", dark: "#d6e0f5" },
  motif: (c) => {
    const xs = [60, 95, 130, 165, 200, 235, 270, 305, 340];
    const candles = xs
      .map((x, i) => {
        const top = i === 4 ? 90 : 120;
        return `<path d="M${x} ${top}v120"/><path d="M${x} ${top - 8}c-6-8-3-16 0-22 3 6 6 14 0 22z" fill="${c}" stroke="none"/>`;
      })
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.3">
      ${candles}<path d="M50 240h300M200 240v30M160 270h80"/></svg>`;
  },
};
