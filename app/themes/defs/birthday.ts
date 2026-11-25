import type { Theme } from "../types.ts";

/** Frosting and confetti: soft rounded type, generous corners, a still scatter of colour. */
export const birthday: Theme = {
  slug: "birthday",
  name: "Birthday",
  group: "occasion",
  idea: "Frosting and confetti: rounded type, generous corners and a still scatter of colour.",
  light: {
    paper: "#fff8ee", card: "#ffffff", sunk: "#fbeedd", ink: "#1f1a3a", ink2: "#463f66", ink3: "#625b82",
    line: "#f1e3cf", lineStrong: "#dcc6a6", want: "#0f6f66", wantInk: "#ffffff", wantSoft: "#d3f1ec",
    deal: "#a3305a", dealSoft: "#fbe1ea", warn: "#8a5300", warnSoft: "#fdf0d5", danger: "#b42318",
  },
  dark: {
    paper: "#17142b", card: "#221e40", sunk: "#100e20", ink: "#f6f3ff", ink2: "#d4cff0", ink3: "#aba5cf",
    line: "#332e5c", lineStrong: "#4a4480", want: "#5eead4", wantInk: "#062b27", wantSoft: "#173b3c",
    deal: "#ff9cc0", dealSoft: "#3d1730", warn: "#f5c76a", warnSoft: "#33280e", danger: "#ff8a80",
  },
  fonts: { display: "rounded", body: "sans", price: "rounded" },
  radius: { card: "24px", control: "999px", input: "16px", image: "18px" },
  traits: ["soft"],
  motif: () => {
    const dots: Array<[number, number, string, string]> = [
      [60, 50, "#f59e0b", "c"], [140, 30, "#ec4899", "r"], [220, 70, "#14b8a6", "c"], [300, 40, "#8b5cf6", "r"],
      [360, 110, "#f59e0b", "r"], [250, 150, "#ec4899", "c"], [330, 200, "#14b8a6", "c"], [180, 210, "#8b5cf6", "c"],
      [90, 140, "#14b8a6", "r"], [370, 270, "#ec4899", "r"], [270, 260, "#f59e0b", "c"], [30, 240, "#8b5cf6", "c"],
    ];
    const shapes = dots
      .map(([x, y, col, k], i) =>
        k === "c"
          ? `<circle cx="${x}" cy="${y}" r="${6 + (i % 3) * 2}" fill="${col}"/>`
          : `<rect x="${x}" y="${y}" width="16" height="7" rx="3" fill="${col}" transform="rotate(${(i * 37) % 180} ${x} ${y})"/>`,
      )
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" opacity="0.45">${shapes}</svg>`;
  },
};
