/**
 * The words of /explorations/redesigning-the-looks, look by look. Everything said here can be checked in the example
 * beside it.
 */
import type { ListFormat } from "~/lib/types";

export interface LookChapter {
  slug: string;
  /** Adopted as redrawn, or kept as it was. */
  decision: "adopted" | "kept";
  /** What the look is for, and what a reader can do in its example. */
  lead: string;
  /** What changed and why. */
  paras: string[];
  /** One thing to try: a view to set (a link does it), then what to look at. */
  tryView?: { format?: ListFormat; width?: "phone" | "desktop"; mode?: "light" | "dark" };
  tryLabel?: string;
  tryIt: string;
}

export const CHAPTERS: LookChapter[] = [
  {
    slug: "sheet",
    decision: "adopted",
    lead: "Sheet is the price table, and the look a shopping list gets by default. Open a product row to see its price history.",
    paras: [
      "Before, Sheet wore its idea: a grid drawn on the page, a blue bar across the top, counts in monospace. None of it told you anything about the list.",
      "After, each want is a plain card on a quiet ground, and the counts sit in ruled cells at the head of the sheet, like the first row of the table.",
    ],
    tryView: { format: "shopping", width: "phone" },
    tryLabel: "Show a shopping list at phone width",
    tryIt: "then switch to Before. Who found a price, when and where takes three or four lines under each product. In After the same words take two.",
  },
  {
    slug: "today",
    decision: "adopted",
    lead: "Checklist is the calm to-do list, and the default for tasks. This example is the owner's view (without the box for adding a task), so the ticks work: tick a task and it moves to Done, tick it there and it comes back.",
    paras: [
      "Before, every due date carried an amber flag, so the color told nothing apart, and each update sat in its own filled card.",
      "After, a date is plain words unless it is overdue, a hairline separates tasks, and what an agent did sits under its task without a box.",
    ],
    tryView: { format: "shopping", width: "phone" },
    tryLabel: "Show a shopping list at phone width",
    tryIt: "then switch to Before and read the first store's name: it breaks inside a word. After breaks names only between words.",
  },
  {
    slug: "board",
    decision: "adopted",
    lead: "Board is kanban: a column for each status. Scroll it sideways.",
    paras: [
      "Before sat on a blue-to-purple gradient that covered the whole page, including the empty part under the columns. The detector flagged it.",
      "After keeps one solid band for the header and lets the columns sit on the page as quiet wells. A small mark before each column's name draws its status: a ring while open, half filled in progress, filled when done.",
    ],
    tryIt: "Switch to Before and scroll to the end of the columns: the gradient carries on under them, with nothing on it.",
  },
  {
    slug: "sections",
    decision: "adopted",
    lead: "Sections is an outline: groups that fold, one row for each item. Open and close a group.",
    paras: [
      "Before had a third row in its header: the counts in a bordered box that looked like a button and was not, beside an icon that named nothing.",
      "After puts the counts with the title, over a rule that fills as items move to Done. The Status column is gone, because each group's name already said it; the group's name carries the status mark instead.",
    ],
    tryView: { width: "desktop" },
    tryLabel: "Show it at desktop width",
    tryIt: "to see the columns line up. At phone width each row stacks its agent and due date under the title.",
  },
  {
    slug: "tracker",
    decision: "adopted",
    lead: "Tracker is built like an issue tracker, and is always dark, whatever Appearance says.",
    paras: [
      "Before printed issue numbers, WNT-1 to WNT-3, that nobody had assigned, and set dates, names and prices in monospace. It looked like a tracker without working like one.",
      "After, each row is led by a status light (a ring while open, half amber in progress, green when done), and what happened under it runs down a rail, each update led by who posted it and when.",
    ],
    tryView: { mode: "light" },
    tryLabel: "Set Appearance to Light",
    tryIt: "and switch to Before: one agent's mark is black on the dark panel. After uses the marks made for dark surfaces.",
  },
  {
    slug: "gallery",
    decision: "adopted",
    lead: "Gallery is a pin board: photos at their natural heights. Tap a card to open the want.",
    paras: [
      "This is the smallest change of the six. Under each photo the price now has its own line and the store the next one, in full. Before, a long store name broke across two lines.",
      "The title is small and centred, as on an album, so the photos start higher on the page.",
    ],
    tryView: { format: "tasks" },
    tryLabel: "Show a task list",
    tryIt: "With no photos both versions are word cards, and Gallery drifts toward Board. We did not solve that.",
  },
  {
    slug: "doc",
    decision: "kept",
    lead: "Doc is a page to read, and the default for research.",
    paras: [
      "We redrew it without the numbered headings and without the rule beside each answer: one sheet, one serif, questions large and light. Reviewed blind, the redrawn Doc lost the first round by a point and won the next two.",
      "The owner preferred the old one. The numbers, the side rule and its type are what make it Doc, so Doc stays exactly as it was. Kept is the page a research list uses today; Proposed is the one we did not adopt.",
    ],
    tryIt: "Switch between Kept and Proposed, and decide for yourself.",
  },
  {
    slug: "heat",
    decision: "kept",
    lead: "Heat orders a list from hot to cool: do the red one first. Tap a bar to open it.",
    paras: [
      "The proposal made Heat follow the device, light by day, put the scale under its title and gave each bar's words the full width. Reviewed blind it scored a little higher than the old one. Both scored lowest of the eight, because the order is carried by color and position alone.",
      "The owner preferred Heat as it is: always dark, its blocks, its header. It stays. One thing changed that you cannot see here: in an opened item, agents' marks are the ones made for dark surfaces.",
      "One fault stays with it. On a phone a long title is squeezed beside its count and breaks over four lines. The fix is easy to see, so it is not ours to make without asking.",
    ],
    tryView: { format: "research", width: "phone" },
    tryLabel: "Show a research list at phone width",
    tryIt: "to see the squeezed titles in Kept, and the full-width ones in Proposed.",
  },
];

/** Blind review totals of 24 (six questions about ease of use, 0 to 4 each): before, then redrawn. */
export const SCORES: Array<[look: string, before: number, after: number, outcome: string]> = [
  ["Sheet", 15, 17, "Adopted"],
  ["Checklist", 15, 17, "Adopted"],
  ["Board", 14, 17, "Adopted"],
  ["Sections", 16, 18, "Adopted"],
  ["Tracker", 14, 17, "Adopted"],
  ["Gallery", 15, 16, "Adopted"],
  ["Doc", 14, 16, "Kept"],
  ["Heat", 12, 14, "Kept"],
];

export const ESSAY = {
  title: "Redesigning the looks",
  kicker: "An interactive essay",
  description: "An interactive essay: the eight layouts of a list page, before and after a redesign, live. Switch them, scroll them, tick them. Six were adopted, two were kept.",
  standfirst: "The Want MCP keeps lists that AI agents work on, and a look is how a list is laid out. We redrew all eight, had them judged blind, adopted six and kept two. Every example here is the real page: switch it, scroll it, tick it.",
  /** The owner's words, verbatim; "Impeccable" is the link. */
  credit: ["The redesign and the critique follow the method of ", "Impeccable", " (Apache 2.0), a design skill for coding agents. None of its files are in this site."] as const,
  creditHref: "https://github.com/pbakaus/impeccable",
  published: "November 2026",
};
