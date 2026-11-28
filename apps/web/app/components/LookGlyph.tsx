import { useId, type CSSProperties, type ReactNode } from "react";
import type { ThemeView } from "~/themes/view";

/**
 * A layout as a small swatch (list settings › Look): its structure drawn without words (a table for Sheet, boxes to
 * tick for Checklist, columns for Board, and so on) in the look's own colours, so a board is blue-banded, Heat is its
 * gradient from hot to cool (owner, 27 Nov 2026), Tracker is dark, and an occasion re-colours all of them. It stands where a miniature of the page was too
 * small to read; one large real picture (LookFrame) shows the chosen look. The colours are the look's own custom
 * properties (`view.style`), never copied here. Decorative: the name beside it is the label.
 */
const GLYPHS: Record<string, ReactNode | ((id: string) => ReactNode)> = {
  // A table: names and a price column, under the sheet's accent line.
  sheet: (
    <>
      <rect className="g-want" x="0" y="0" width="32" height="2" />
      <path className="g-rule" d="M3 9.4h26M3 14.6h26M21 4.6v15" />
      {[5.6, 10.9, 16.1].map((y, i) => (
        <g key={y}>
          <rect x="4" y={y} width={[12, 9, 13][i]} height="2" rx="1" />
          <rect x="23.5" y={y} width="4.5" height="2" rx="1" opacity="0.6" />
        </g>
      ))}
    </>
  ),
  // Boxes to tick, the first one done.
  today: (
    <>
      <rect className="g-want" x="4" y="3.6" width="4" height="4" rx="1.1" />
      <path className="g-tick" d="M4.9 5.7l0.9 0.9 1.5-1.8" />
      <rect className="g-box" x="4.5" y="9.5" width="3" height="3" rx="0.8" />
      <rect className="g-box" x="4.5" y="14.9" width="3" height="3" rx="0.8" />
      <rect x="11" y="4.6" width="11" height="2" rx="1" opacity="0.45" />
      <rect x="11" y="10" width="16" height="2" rx="1" />
      <rect x="11" y="15.4" width="13" height="2" rx="1" />
    </>
  ),
  // A written page: a heading, then lines of text.
  doc: (
    <>
      <rect x="4" y="4" width="12" height="3.2" rx="1" />
      <rect x="4" y="10" width="24" height="1.5" rx="0.75" opacity="0.6" />
      <rect x="4" y="13.2" width="24" height="1.5" rx="0.75" opacity="0.6" />
      <rect x="4" y="16.4" width="15" height="1.5" rx="0.75" opacity="0.6" />
    </>
  ),
  // Columns of cards under the board's band.
  board: (
    <>
      <rect className="g-band" x="0" y="0" width="32" height="6.5" />
      <rect x="3" y="9" width="7.4" height="5" rx="1.2" opacity="0.85" />
      <rect x="3" y="15.2" width="7.4" height="3.6" rx="1.2" opacity="0.5" />
      <rect x="12.3" y="9" width="7.4" height="3.4" rx="1.2" opacity="0.85" />
      <rect x="12.3" y="13.6" width="7.4" height="5.2" rx="1.2" opacity="0.5" />
      <rect x="21.6" y="9" width="7.4" height="6.4" rx="1.2" opacity="0.85" />
    </>
  ),
  // Groups that fold, each under its own heading.
  sections: (
    <>
      <rect className="g-box" x="3.5" y="3.5" width="25" height="15" rx="2" />
      <path className="g-rule" d="M3.5 11h25" />
      <path className="g-tick g-ink" d="M6 6.3l1.3 1.4 1.3-1.4M6 13.8l1.3 1.4 1.3-1.4" />
      <rect x="11" y="6" width="9" height="2" rx="1" />
      <rect x="11" y="13.5" width="12" height="2" rx="1" />
    </>
  ),
  // Bars, one gradient from hot to cool running down all of them (the same sRGB mix the look itself uses).
  heat: (id) => (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="3" x2="0" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0" className="g-hot" />
          <stop offset="1" className="g-cool" />
        </linearGradient>
      </defs>
      {[3, 6.3, 9.6, 12.9, 16.2].map((y) => (
        <rect key={y} x="3" y={y} width="26" height="2.8" rx="1" fill={`url(#${id})`} />
      ))}
    </>
  ),
  // Dense rows: an id, a title, a state.
  tracker: (
    <>
      {[4, 9.5, 15].map((y, i) => (
        <g key={y}>
          <rect className="g-box" x="3.5" y={y} width="6.5" height="3" rx="1.5" />
          <rect x="12" y={y + 0.5} width={[11, 8, 10][i]} height="2" rx="1" />
          {i === 0 ? <circle className="g-want" cx="27" cy={y + 1.5} r="1.7" /> : <circle className="g-box" cx="27" cy={y + 1.5} r="1.3" />}
        </g>
      ))}
    </>
  ),
  // Photo cards of different heights.
  gallery: (
    <>
      <rect x="3" y="3" width="12.3" height="9.4" rx="1.6" opacity="0.3" />
      <circle cx="6.6" cy="6.3" r="1.3" />
      <path d="M4.4 11.2l3.3-3.4 2.2 2.1 1.6-1.4 2.6 2.7z" />
      <rect x="16.7" y="3" width="12.3" height="5" rx="1.6" opacity="0.55" />
      <rect x="3" y="13.8" width="12.3" height="5.2" rx="1.6" opacity="0.55" />
      <rect x="16.7" y="9.4" width="12.3" height="9.6" rx="1.6" opacity="0.3" />
      <circle cx="20.3" cy="12.7" r="1.3" />
      <path d="M18.1 17.8l3.3-3.4 2.2 2.1 1.6-1.4 2.6 2.7z" />
    </>
  ),
};

/** A layout nobody has drawn yet: plain rows. */
const FALLBACK = (
  <>
    <rect x="4" y="5" width="24" height="2.4" rx="1.2" />
    <rect x="4" y="9.8" width="24" height="2.4" rx="1.2" opacity="0.6" />
    <rect x="4" y="14.6" width="24" height="2.4" rx="1.2" opacity="0.6" />
  </>
);

/** The few of a look's colours the swatch uses, light and dark. */
const KEYS = ["paper", "ink", "want", "want-ink", "occ-band", "occ-hot", "occ-cool"];

export function LookGlyph({ view, className = "" }: { view: Pick<ThemeView, "template" | "style">; className?: string }) {
  // A gradient is found by its id, and each swatch has its own colours: an id of its own.
  const id = `lg${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const glyph = GLYPHS[view.template] ?? FALLBACK;
  const style: Record<string, string> = {};
  for (const mode of ["tl", "td"]) for (const k of KEYS) if (view.style[`--${mode}-${k}`]) style[`--${mode}-${k}`] = view.style[`--${mode}-${k}`];
  return (
    <svg viewBox="0 0 32 22" className={`look-glyph ${className}`} style={style as CSSProperties} aria-hidden="true" focusable="false">
      {typeof glyph === "function" ? glyph(id) : glyph}
    </svg>
  );
}
