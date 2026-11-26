import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "break-a-big-task-into-steps",
  order: 39,
  group: "delegating",
  opens: "tasks",
  title: "Break a vague task into small next steps",
  description:
    "Type the big, fuzzy job as it comes to you. Your AI agent splits it into steps, does what it can, and posts the next small step right on the task.",
  h1: "From a vague job to the next small step",
  intro: "Write the task the way it sits in your head. Your agent splits it up, does the parts it can and shows you one next step.",
  label: "Next steps for big tasks",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Small things the steps need",
      description: "Only what the next steps call for.",
      look: "sheet",
      items: [
        {
          want: "A file box with hanging folders for the tax papers",
          products: [
            { title: "Portable file box with 12 hanging folders", store: "Paper & Pine Studio", price: "24.99", was: "32.99", by: "Claude" },
            { title: "Expanding file, 13 pockets, letter size", store: "Northway Supply", price: "14.49", by: "Gemini", note: "Smaller, but enough for one year." },
          ],
        },
        {
          want: "Clear storage bins for the garage shelves, about 10",
          products: [
            { title: "Stackable clear bins, 27 qt, set of 6", store: "Maple Street Home", price: "49.99", earlier: ["59.99", "54.99"], by: "ChatGPT" },
            { title: "Latching storage totes, 30 qt, each", store: "Kettle & Pine", price: "8.99", by: "Codex", coupon: "ORGANIZE10" },
          ],
        },
        {
          want: "Painter's tape and a marker for labeling bins",
          bought: 0,
          products: [
            { title: "Painter's tape, 1.4 in, 2-pack, with fine marker", store: "Northway Supply", price: "11.98", by: "Grok" },
            { title: "Label tape and marker kit", store: "Paper & Pine Studio", price: "9.50", by: "Claude" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "The big ones, in steps",
      look: "today",
      items: [
        {
          want: "Sort out taxes",
          status: "in_progress",
          updates: [
            {
              title: "Split into five steps; the first one is ready",
              body: "1. Collect the W-2 and the two 1099s. 2. Find last year's return. 3. Gather charity receipts. 4. Pick a filing method. 5. File. Next small step: search your email for \"1099\" and save the two forms to one folder.",
              by: "Claude",
            },
          ],
        },
        {
          want: "Deal with the garage",
          dueInDays: 12,
          details: "Before the cold weather.",
          updates: [{ title: "Four steps, smallest first", body: "Clear one shelf, then bag donations, book a pickup, and buy bins for what stays. Next small step: clear the top shelf only and set aside anything to donate.", by: "Gemini" }],
        },
        { want: "Figure out the dentist thing" },
        { want: "Plan Dad's birthday dinner", status: "done", doneNote: "Table booked for six at the Italian place, Saturday at 7." },
      ],
    },
    research: {
      format: "research",
      title: "What I need to know first",
      look: "doc",
      items: [
        {
          want: "Can I still file for free this year?",
          accepted: 0,
          updates: [
            { title: "Yes: the free filing option covers W-2 and 1099 income", body: "The IRS page on free filing lists the income limits and the forms each program supports. Both of yours are covered.", links: ["https://example.org/irs/free-file"], by: "Claude" },
            { title: "The state return may need a separate program", body: "The state revenue site lists two free options for state returns; one also imports the federal return.", links: ["https://example.org/state-revenue/free-filing"], by: "ChatGPT" },
          ],
        },
        {
          want: "Where can old paint cans from the garage go?",
          status: "in_progress",
          updates: [{ title: "The county takes latex paint on the first Saturday", body: "The county's drop-off site accepts latex and oil paint; latex can also go in the trash once dried out. Checking the hours.", links: ["https://example.org/county/household-hazardous-waste"], by: "Gemini" }],
        },
        { want: "How long should I keep old tax papers?" },
      ],
    },
  },
} satisfies Persona;
