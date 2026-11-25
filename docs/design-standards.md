# Design standards

The rules every client of The Want MCP follows, on every screen and in every list theme. They
are based on WCAG 2.2 AA and on the conventions Apple's Human Interface Guidelines and Google's
Material guidelines share, so they carry over to native apps: sizes are given in CSS pixels,
which map to points on iOS and dp on Android.

In the web app (`apps/web`), the shared controls in `app/components/ui.tsx` and the control rules
in `app/app.css` apply them, and `pnpm check:a11y` (axe) and `pnpm check:contrast` test them. A new
client should have the same single source for its controls and the same two checks.

## The look

Restraint. Almost no colour, type and layout do the work, and every element is a plain
rectangle. Things this product does not do: gradient washes, tinted backgrounds behind labels,
pill chips, soft cards with shadows, an icon in a coloured square beside every label, extra-bold
display type, monospace labels everywhere.

- **Palette.** A warm near-white page (`--paper`), one deeper warm grey for alternate sections and
  the footer (`--sunk`), white for fields and media (`--card`), near-black text (`--ink`), two greys
  (`--ink-2`, `--ink-3`), a hairline (`--line`) and a field border (`--line-strong`, at least 3:1).
  Dark mode mirrors it: near-black page, warm off-white text.
- **One accent.** Crimson `#b5174f` (dark mode `#f2709a`): the brand mark's own pink, deepened so it
  carries white text at 6.6:1. It is used only for the primary action and the mark, nowhere else.
  Savings green, warning amber and error red are status colours, not decoration.
- **Type.** Inter (variable, with its optical-size axis) for display and UI; Newsreader for
  section headings; JetBrains Mono only for codes, keys and coupons. All open-licence and
  self-hosted.
- **Sections.** Pages are bands of generous vertical space (80 to 96px on desktop), alternating
  `--paper` and `--sunk` where it helps. A content section is two columns on desktop: on the left
  a label, a serif heading, one or two short lines, a few rows separated by hairlines and
  full-width buttons; on the right a large real render of the product. On phones the columns
  stack.

## Spacing

Spacing comes from a 4px scale: 4, 8, 12, 16, 24, 32, 48, 64 (in the web app, Tailwind `1 2 3 4 6 8 12 16`).
Use 8 between related controls, 12 to 16 inside cards and between fields, 24 to 32 between
sections, and 48 or more between page bands. Odd values (6, 10, 14) are only used inside a
component to centre text optically.

## Type

| Role | Size | Face | Notes |
| --- | --- | --- | --- |
| Display (home headline) | 64 to 84px | Inter, weight 300 | tracking −0.035em, centred, two lines (`.display`) |
| h1 | 40 to 56px | Inter, weight 400 | list titles; one per page |
| Section heading | 32 to 38px | Newsreader, weight 400 | `.serif` |
| h3 | 18 to 20px | Inter, weight 600 | |
| Body | 16px | Inter | line height 1.55 |
| Small | 14px | Inter | meta lines |
| Label | 12px | Inter 500, uppercase, tracking 0.08em, `--ink-3` | `.eyebrow`; sparingly, one per block at most |

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
- **Radius and borders.** Small radii: 3px for badges, 4px for buttons and fields
  (`--r-control`, `--r-input`), 6px for panels and media (`--r-card`). All borders are 1px:
  `--line` for dividers and panels, `--line-strong` for fields. No shadows. The only pill on the
  site is the small "Start a list" button in the header.
- **Focus.** One focus ring everywhere: a 3px outline in the focus colour, 2px outside the
  element, shown on keyboard focus (`:focus-visible`; browsers also show it on text fields
  whenever they are focused).
  Never removed, never replaced by a colour change alone. The focus colour has at least 3:1
  contrast with the page.

## Buttons

Three kinds, all rectangles: **primary** (solid accent, one per view), **secondary** (solid
near-black) and **plain** (the page colour with a 1px near-black border); plus **danger** (outline
in red). In narrow columns buttons are full width and stack. A destructive action is never
the primary one and asks for confirmation. Button text says what happens ("Add task", "Make
private"), not "OK" or "Submit".

## Colour roles

| Token | Role |
| --- | --- |
| `--paper` | page background |
| `--card` | fields and media frames |
| `--sunk` | alternate sections, the footer, selected rows |
| `--ink`, `--ink-2`, `--ink-3` | text: primary, secondary, tertiary (all at least 4.5:1 on paper and card) |
| `--line`, `--line-strong` | dividers; field borders (`--line-strong` at least 3:1 where it is the only edge) |
| `--want` / `--want-ink` | the primary action and the mark only; text on it |
| `--deal` | savings, success, "done" |
| `--warn` | deals ending, unverified content |
| `--danger` | errors and destructive actions |
| `--focus` | the focus ring: near-black in light mode, off-white in dark |

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

The default list look is the plain style above: hairline rows, no cards. Templates (Board,
Sections, Today, Heat, Sheet, Doc, Tracker) and occasions are dressed versions of it. A theme may
change colours, fonts, radius, card style, page layout and decoration. It may not
change control heights, spacing rhythm, label placement, the focus ring or contrast, and it
keeps the heading order and the item and entry anchors (`#itm_`, `#ent_` on the web). The contrast
check tests every theme's text, controls and focus colours in light and dark, including text over
gradients and bands.
