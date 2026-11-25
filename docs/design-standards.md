# Design standards

The rules every client of The Want MCP follows, on every screen and in every list theme. They
are based on WCAG 2.2 AA and on the conventions Apple's Human Interface Guidelines and Google's
Material guidelines share, so they carry over to native apps: sizes are given in CSS pixels,
which map to points on iOS and dp on Android.

In the web app (`apps/web`), the shared controls in `app/components/ui.tsx` and the control rules
in `app/app.css` apply them, and `pnpm check:a11y` (axe) and `pnpm check:contrast` test them. A new
client should have the same single source for its controls and the same two checks.

## Spacing

Spacing comes from a 4px scale: 4, 8, 12, 16, 24, 32, 48, 64 (in the web app, Tailwind `1 2 3 4 6 8 12 16`).
Use 8 between related controls, 12 to 16 inside cards and between fields, 24 to 32 between
sections, and 48 or more between page bands. Odd values (6, 10, 14) are only used inside a
component to centre text optically.

## Type

| Role | Size | Notes |
| --- | --- | --- |
| Display (home) | 56 to 72px | Bricolage, extra bold, capitals allowed |
| h1 | 40 to 48px | one per page |
| h2 | 24 to 30px | |
| h3 | 18 to 20px | |
| Body | 16px | line height 1.55 |
| Small | 14px | meta lines, labels |
| Caption | 12 to 13px | eyebrows, timestamps; never for sentences people must read |

Form fields are always 16px (on the web, so phones do not zoom into them; natively, the
platform's body size). Body text is at most about 70
characters per line (65ch).

## Controls

- **One height per size.** `sm` 36px, `md` 44px (the default), `lg` 52px, set by `--ctl-sm`,
  `--ctl` and `--ctl-lg`. Inputs, selects and buttons of one size are exactly the same height.
  On touch screens (`pointer: coarse`) `sm` becomes 44px, so every touch target is at least
  44 by 44px. Text-only buttons and links in running text are at least 24px tall (WCAG 2.5.8).
- **A row shares height and baseline.** Controls in one row use the same size and align to the
  bottom of their fields (`items-end`), so labels of different lengths do not push a control out
  of line. Labels in a row must fit on one line; widen the column rather than wrap.
- **Labels.** Every control has a label. The label sits above its control, never beside it or
  inside it; placeholders are examples, not labels. In one row, either every control has a
  visible label or none do (a single input and its button may rely on the section heading and
  a visually hidden label). Hints go under the control, errors under the hint.
- **Select.** The native `<select>` is restyled to match the input: same border, radius, height,
  padding and focus ring, with a drawn chevron. No native border or outline shows through.
- **Radius and borders.** Fields use `--r-input`, buttons `--r-control`, cards `--r-card`.
  Field and button borders are 1.5px, card borders 1px (1.5px in outline themes). Pills
  (fully round) are for buttons, chips and badges; text areas never become pills.
- **Focus.** One focus ring everywhere: a 3px outline in the focus colour, 2px outside the
  element, shown on keyboard focus (`:focus-visible`; browsers also show it on text fields
  whenever they are focused).
  Never removed, never replaced by a colour change alone. The focus colour has at least 3:1
  contrast with the page.

## Buttons

One primary action per view (`variant="primary"`, the brand colour). Everything else is
secondary (solid ink), plain (outline) or danger (outline in red). A destructive action is never
the primary one and asks for confirmation. Button text says what happens ("Add task", "Make
private"), not "OK" or "Submit".

## Colour roles

| Token | Role |
| --- | --- |
| `--paper` | page background |
| `--card`, `--sunk` | raised and recessed surfaces |
| `--ink`, `--ink-2`, `--ink-3` | text: primary, secondary, tertiary (all at least 4.5:1 on paper and card) |
| `--line`, `--line-strong` | dividers; field borders (`--line-strong` at least 3:1 where it is the only edge) |
| `--want` / `--want-ink` | brand and primary action; text on it |
| `--deal` | savings, success, "done" |
| `--warn` | deals ending, unverified content |
| `--danger` | errors and destructive actions |
| `--focus` | the focus ring |

Colour is never the only signal: status also has a word or an icon.

## States

Every control has five states and they look the same in every theme:

- **default**
- **hover:** a slightly stronger border, or a brighter fill for solid buttons; nothing moves
- **focus-visible:** the focus ring above
- **disabled:** 55% opacity and a not-allowed cursor, still readable, and never the only way of
  saying why something cannot be done
- **error:** a red border, `aria-invalid`, and a message under the field linked with
  `aria-describedby`

## Motion

Nothing moves on its own. Transitions are 120ms colour changes; with reduced motion they are
off. Live updates announce themselves in a polite live region, not with animation.

## Themes

A theme may change colours, fonts, radius, card style, page layout and decoration. It may not
change control heights, spacing rhythm, label placement, the focus ring or contrast, and it
keeps the heading order and the item and entry anchors (`#itm_`, `#ent_` on the web). The contrast
check tests every theme's text, controls and focus colours in light and dark, including text over
gradients and bands.
