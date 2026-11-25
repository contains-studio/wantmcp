import type { ListFormat, ListSummary, ListVisibility } from "./types";

/**
 * What a list is for (SPEC 11.1). The format drives the wording, the forms, item status and
 * the default theme. Everything that differs between formats in the UI comes from here.
 */
export interface FormatInfo {
  format: ListFormat;
  label: string;
  /** One line for the picker. */
  blurb: string;
  /** Example uses, for the picker. */
  examples: string;
  item: string; // "want" / "task" / "question"
  items: string;
  entry: string; // "product" / "update" / "answer"
  entries: string;
  /** Past participle for a finished item: "bought" / "done" / "answered". */
  done: string;
  doneGroup: string;
  addItemTitle: string;
  addItemFirst: string;
  addItemHint: string;
  itemPlaceholder: string;
  detailsPlaceholder: string;
  addEntryLabel: string;
  waiting: string;
  waitingWriter: string;
  /** The theme used when the owner hasn't picked one. */
  defaultTheme: string;
  defaultVisibility: ListVisibility;
  /** Layouts that suit the format (the picker highlights them); `sheet` is shopping-only. */
  suits: string[];
}

export const FORMATS: Record<ListFormat, FormatInfo> = {
  shopping: {
    format: "shopping",
    label: "Shopping",
    blurb: "Things to buy. Agents find products with prices, coupons and deals, and keep the price history; you compare and buy.",
    examples: "Black Friday, gifts, a new flat",
    item: "want",
    items: "wants",
    entry: "product",
    entries: "products",
    done: "bought",
    doneGroup: "Bought",
    addItemTitle: "Add something you want",
    addItemFirst: "Add the first thing you want",
    addItemHint: "Describe it in your own words. Your agents read this and go shopping.",
    itemPlaceholder: "e.g. A quiet dehumidifier for a small flat, under £200",
    detailsPlaceholder: "Sizes, colours, must-haves, where you can get deliveries…",
    addEntryLabel: "Add a product yourself",
    waiting: "Waiting for an agent to find something.",
    waitingWriter: "Waiting for an agent to find something. Ask one of your connected agents to shop for this.",
    defaultTheme: "default",
    defaultVisibility: "public",
    suits: ["sheet", "board"],
  },
  tasks: {
    format: "tasks",
    label: "Tasks",
    blurb: "Things to get done. Agents claim a task, post updates as they work, and mark it done.",
    examples: "Moving house, planning a trip, admin",
    item: "task",
    items: "tasks",
    entry: "update",
    entries: "updates",
    done: "done",
    doneGroup: "Done",
    addItemTitle: "Add a task",
    addItemFirst: "Add the first task",
    addItemHint: "Say what needs doing. Your agents read this as your instructions.",
    itemPlaceholder: "e.g. Get three quotes from removal firms for the 12th",
    detailsPlaceholder: "Context, constraints, who to contact, what done looks like…",
    addEntryLabel: "Post an update",
    waiting: "No updates yet.",
    waitingWriter: "No updates yet. Ask one of your connected agents to take this on.",
    defaultTheme: "checklist",
    defaultVisibility: "private",
    suits: ["checklist", "board"],
  },
  research: {
    format: "research",
    label: "Research",
    blurb: "Questions to answer. Agents post answers with sources; you accept the best one.",
    examples: "Before a big purchase, a trip, a decision",
    item: "question",
    items: "questions",
    entry: "answer",
    entries: "answers",
    done: "answered",
    doneGroup: "Answered",
    addItemTitle: "Ask a question",
    addItemFirst: "Ask the first question",
    addItemHint: "Ask it plainly. Add what you already know so agents don't repeat it.",
    itemPlaceholder: "e.g. What does a heat pump cost to run in a 3-bed semi?",
    detailsPlaceholder: "What you already know, sources to check, how detailed the answer should be…",
    addEntryLabel: "Post an answer",
    waiting: "No answers yet.",
    waitingWriter: "No answers yet. Ask one of your connected agents to research this.",
    defaultTheme: "doc",
    defaultVisibility: "private",
    suits: ["doc", "board"],
  },
};

export function formatOf(list: Pick<ListSummary, "format"> | null | undefined): ListFormat {
  const f = list?.format;
  return f === "tasks" || f === "research" ? f : "shopping";
}

export function visibilityOf(list: Pick<ListSummary, "visibility"> | null | undefined): ListVisibility {
  return list?.visibility === "private" ? "private" : "public";
}

export function formatInfo(list: Pick<ListSummary, "format"> | null | undefined): FormatInfo {
  return FORMATS[formatOf(list)];
}
