/**
 * The review of each pair on /themes/compare: what changed and why (the caption), which version is better and the
 * reason, and the findings behind it.
 *
 * How it was judged. Both versions of every look were captured on a phone in dark mode (WebKit, 390 by 844, touch,
 * Reduce Motion) and on a desktop in light mode (1280 by 900), with their natural kind of list and one other. A
 * reviewer who was not told which version was which scored them with Impeccable's critique method (six of Nielsen's
 * ten heuristics apply to a read-only sample, each 0 to 4, so 24 at most) and the owner's seven questions; Impeccable's
 * detector then scanned all sixteen pages at both sizes. What the reviewer found wrong with the redesign was fixed
 * afterwards, so the redesigned scores are a floor, not a claim.
 */
export type Better = "next" | "current" | "even";

export interface LookNote {
  slug: string;
  /** One or two sentences: what changed and why. */
  caption: string;
  /** One line: what its header is made of, the thing that says which look this is in the first 200px. */
  head: string;
  better: Better;
  /** One line for the summary table. */
  reason: string;
  /** Design critique (Impeccable's method: heuristics, cognitive load, its craft floor, its detector). */
  critique: string[];
  /** The owner's seven questions, by number. */
  questions: string[];
  /** Heuristic totals out of 24 from the blind review: current, then redesigned. */
  score: [number, number];
}

export const LOOK_NOTES: LookNote[] = [
  {
    slug: "sheet",
    head: "A band of the sheet's own surface with the counts in ruled cells: the top row of the table.",
    caption:
      "The page grid, the accent bar and the monospace counts are gone; each want is a plain white card on a quiet ground. On a phone, who found a price, when and where runs the card's full width, so it takes two lines instead of three or four.",
    better: "next",
    reason: "The same table with less around it; the trust line is two lines on a phone, not four.",
    score: [15, 17],
    critique: [
      "Current: a 6px accent bar, a grid drawn on the page, monospace counts and a dotted rule after \"Bought\" are decoration; the detector also reports a flat type scale on a phone (16, 18.4 and 20.8px).",
      "Redesigned: one fewer cognitive-load failure (1 against 2). Three products and the start of the next want fit the first phone screen.",
      "Redesigned, still open: the trust line starts under the photo, not under the name, so a row has two left edges. Both versions drew \"Lowest\" at 9.6px; the redesign sets it at 11px.",
    ],
    questions: [
      "Question 1: current fails on the bar, grid and monospace; redesigned passes.",
      "Question 6: current is heavier (outlined card inside a bordered header band); redesigned passes.",
      "Trust details are complete in both, and word for word the same (a test compares them).",
    ],
  },
  {
    slug: "today",
    head: "The title beside a pie that fills as tasks get done.",
    caption:
      "Round ticks, one hairline between tasks, and what an agent posted sits under its task without a box. Due dates are plain words (only an overdue one is coloured), and the mark by the title is a pie that fills as tasks get done.",
    better: "next",
    reason: "Shorter and calmer, and store names are whole: the current one cuts \"Harbor Electroni/cs\" on a phone.",
    score: [15, 17],
    critique: [
      "Current: on a phone with a shopping list, store names break inside a word (\"HARBOR ELECTRONI/CS\", \"COPPERLIN/E KITCHEN\"). That alone loses.",
      "Current: an amber flag on every due date, so the colour tells nothing apart; updates sit in filled cards; a price about 1.6 times the redesign's size.",
      "Redesigned: 989px against 1,213px for the same four tasks on a phone; the finished task stays on the first desktop screen. Still open: a visitor sees a 5px dot where the owner has a tick, and the provenance line can start with a dot.",
    ],
    questions: [
      "Question 1: current fails (flag glyph, card around every update); redesigned passes.",
      "Question 6: current fails (names cut mid-word, heavy); redesigned has one nit (a line starting with \"·\", from a shared component).",
      "Question 7: the cut names show only on a phone in dark mode. The ticks were tested on a real list: they tick and untick, 24px drawn with a 44px target.",
    ],
  },
  {
    slug: "doc",
    head: "A title page: a large serif title, an italic line of counts and the note, on the sheet.",
    caption:
      "A page to read: its own sheet (white, or dark grey at night), everything in the book serif, questions large and light, answers set in under them at reading size. The numbered headings, the grey bar beside every answer and the page-on-a-desk are gone.",
    better: "next",
    reason: "Reads as a document by type alone, where the current one adds numbers, a rule and a bar. The closest call of the eight.",
    score: [14, 16],
    critique: [
      "This pair changed sides once. In the first blind round the current Doc won narrowly (17 to 16): in the redesign, questions and answers were both bold serif of nearly one size. After that was fixed the redesign won the second round (17 to 15) and the third, in WebKit (16 to 14, \"by a moderate margin\").",
      "Current: section numbers, a rule under the title, a side bar on every answer (which also wraps product cards, which are not quotes), and a seam with cramped spacing under the header at 1280.",
      "Redesigned: the second round still called the current one \"the more unmistakable look\", so it got its own sheet colour, one face throughout and ruled product entries. The third round judged it not mistakable for Checklist or Tracker. Still open: a visitor's status line is quiet italic text.",
    ],
    questions: [
      "Question 1: current fails (numbers, title rule, italics); redesigned passes.",
      "Question 6: current fails (heavy, cramped header at 1280, a 20px dead band at the top on a phone); redesigned passes.",
      "Trust details are complete in both.",
    ],
  },
  {
    slug: "board",
    head: "One solid navy band across the page (an occasion's own colour when dressed), with the columns under it.",
    caption:
      "The blue-to-purple backdrop is gone. The header keeps one solid navy band; under it the columns are quiet wells on the page, cards are white, and a small mark before each column's name draws its status (ring, half, filled). Store names on product cards are in sentence case and break only between words.",
    better: "next",
    reason: "The saturated gradient was the opposite of calm; the columns alone say Board.",
    score: [14, 17],
    critique: [
      "Current: a full-page gradient, including about 410px of empty coloured slab under the columns on a phone. Impeccable's detector flags it by name (purple gradient background).",
      "Both cut \"Harbor Electron/ics\" on a phone when the first review ran. The redesign now keeps the name whole; the current one still cuts it.",
      "Redesigned: one cognitive-load failure against two. Still open in both: agents on task cards are a letter in a circle, told apart by colour.",
    ],
    questions: [
      "Question 1 and Question 6: current fails both (decorative backdrop, empty slab, cut name).",
      "Question 6: redesigned passes after the store-name fix.",
      "Columns still swipe sideways on a phone, inside the board only; the page itself does not.",
    ],
  },
  {
    slug: "sections",
    head: "The title with the counts at its right, over a rule that fills as items move to Done.",
    caption:
      "The header is the title and one quiet line again: the blue icon tile and the boxed counts in their own band are gone. The table keeps its folding groups and loses the Status column, which only repeated each group's name; the group's name carries the status mark instead.",
    better: "next",
    reason: "Quieter, and the folding groups alone make it distinct; the current header has a box that looks like a button and is not.",
    score: [16, 18],
    critique: [
      "Current: \"3 open · 1 done · by sample-owner\" sits in a bordered box in its own band (a third header row), beside an icon tile that names nothing; uppercase column heads, column rules and an amber pill.",
      "Redesigned: the highest score of the sixteen (18 of 24) and no cognitive-load failures.",
      "Both repeated the group's status on every row; the redesign dropped that column. Doing so first broke it on a phone (the wide table's columns reached the narrow layout and left each title about 50px). That is fixed, and a test in Chrome and WebKit now holds every look's titles to at least 60% of their row.",
    ],
    questions: [
      "Question 1: current fails (tile, boxed counts); redesigned failed on the repeated status, now removed.",
      "Question 2: current fails (counts in a toolbar band).",
      "Question 6: current fails (a box that reads as a button).",
    ],
  },
  {
    slug: "heat",
    head: "A heavy title over the hot-to-cool scale itself, the key to every bar's colour.",
    caption:
      "Each bar gives the task's words the full width, with its state under them, so a title takes two lines on a phone instead of four. The bars still run hot to cool and touch as one scale. It now follows the device: light by day, dark at night.",
    better: "next",
    reason: "Names get the full width on a phone, and it no longer shows a black page in light mode.",
    score: [12, 14],
    critique: [
      "Current: titles are squeezed into a column about 150px wide (\"Will the / electrical panel / need an / upgrade?\"), and the page is black at 1280 in light mode.",
      "Both score lowest of the eight. Red for the first bar reads as an alarm, and the order is carried by colour and position alone. That is the look's idea, not its styling.",
      "Redesigned: separate rounded bars read as cards in the first round; they now touch, with only the ends rounded.",
    ],
    questions: [
      "Question 6: current fails (titles broken over four lines); redesigned passes on layout.",
      "Question 7: current fails at 1280 in light mode.",
      "Neither shows who, when or a due date on a bar; both show them once the bar is opened.",
    ],
  },
  {
    slug: "tracker",
    head: "A compact title bar on the panel's own surface, the counts at its right, then rows led by status lights.",
    caption:
      "The made-up issue numbers (\"WNT-1\"), the blue square and the monospace are gone. One dense panel of rows, each led by a status light, with its due date and who has it on one line; under it, the activity runs down a rail, each update led by who posted it and when.",
    better: "next",
    reason: "Its identity was costume: invented issue numbers and monospace. Status lights and the activity rail are real.",
    score: [14, 17],
    critique: [
      "Current: \"WNT-1\" to \"WNT-3\" are numbers nobody assigned; monospace on dates, prices and names (\"$649 . 99\" with a gap); bordered update boxes inside a bordered panel, which the detector reports as nested cards.",
      "Current: the ChatGPT mark is black on the dark panel at 1280 in light mode, nearly invisible. The redesign shows the marks made for dark surfaces.",
      "Redesigned: 879px against 1,051px on a phone; one cognitive-load failure against three. The first round said it was \"Checklist in a grey panel\"; the rail and the compact status line came after that, and the third round judged the two not mistakable.",
    ],
    questions: [
      "Question 1: current fails (decorative text, the square). Redesigned had one nit, the status pill reading as a repeat of the update's byline; the pill now sits on the due line.",
      "Question 6 and Question 7: current fails (invisible mark at 1280 light).",
      "Trust details are complete in both. The redesign also shows a product's note (what a coupon does), which the current one hides.",
    ],
  },
  {
    slug: "gallery",
    head: "A small centred title, as on an album, so the photos start high on the page.",
    caption:
      "The same masonry of photos. Under each, the price has its own line and the store the next one, in full, instead of \"at Harbor / Electronics\" broken across two; the status tag lines up with the title and shows on word cards.",
    better: "next",
    reason: "A small, safe gain: the price and the whole store name each get a line. Otherwise the two are the same.",
    score: [15, 16],
    critique: [
      "The closest pair after Doc. Current: store names split across lines, and \"Bought\" sits about 8px in from the title's edge.",
      "Both, from the shared card: a bought want shows the cheapest offer (\"$588 at Route 9 Auto\") where Sheet says what was paid (\"$612.00 at Northway Tire\"). That is a defect in the component, not in either look.",
      "Both: with tasks or research there are no photos, so it is a masonry of word cards and drifts toward Board.",
    ],
    questions: [
      "Question 6: current fails on the split store names; redesigned passes.",
      "Trust: neither shows who found a price, when or \"Lowest\" on a card; both show them when the card is opened.",
      "Question 1: equal.",
    ],
  },
];

export const SUMMARY = {
  recommendation:
    "Adopt all eight. Board, Sections, Tracker, Checklist, Heat and Sheet are clear gains: each drops something the current look only wears (a gradient, a toolbar band, invented issue numbers, a flag on every date, a page grid) or fixes something broken on a phone (store names cut mid-word, titles on four lines). Gallery is a small, safe gain. Doc is the closest call and the one pair that changed sides between reviews: look at it on a research list of your own first.",
  /** How sure this is, and what has not been checked the same way. */
  caveat:
    "Reviewed blind three times, the last in WebKit. The redesigned Checklist, Doc and Tracker were judged not mistakable for one another (the current Checklist and Tracker were), and the eight redesigned headers had one pair that could be swapped, Board and Sections, against four in the current set. Board's band was made navy after that round to separate that pair; that one change has not had a blind review.",
  ship: [
    "Make the redesigned set the default: move the eight stylesheets and definitions into place of the current ones and drop the `nx` indirection. About a day, most of it re-recording the existing look tests (Sheet, Checklist and Gallery have their own specs), which were not run against the redesign.",
    "Look at the places that draw looks small: the home page's \"Pick a look\" row, the gallery at /themes and list settings. They were not checked with the redesign.",
    "Two calls for the owner: Heat would no longer be always dark (one line to put back), and Board keeps a navy band where every other look takes the site's neutrals.",
    "Fix in the shared components, for both sets: Gallery's bought card showing the cheapest offer instead of what was paid; \"2 h\" in the status beside \"2 hr. ago\" in the byline; a provenance line that can start with \"·\"; white initials on bright avatars in dark mode (1.7:1) in the current looks.",
    "Remove this page, its frames and their two narrow exceptions (framing and forced appearance, both for frame addresses only), or keep them unlinked.",
  ],
  untested: [
    "A real iPhone. Everything was run in Playwright's WebKit at 390 by 844 with touch, dark mode and Reduce Motion, which is close but not the device.",
    "The owner's view of the redesign beyond Checklist: menus, add forms, the opened item panel and the share flow were exercised only on a tasks list with ?look=next.",
    "Every occasion on every redesigned look by eye. Contrast is computed for all 72 combinations; two were looked at (Black Friday on Board, Christmas on Heat) and two more run through axe.",
    "Empty lists, lists with one item, very long titles, and lists with dozens of items in the redesign.",
    "Firefox, and screens between 390 and 1280 wide.",
  ],
};
