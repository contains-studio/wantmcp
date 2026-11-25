import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "civic-group-sourced-answers",
  order: 62,
  group: "publishing",
  title: "Publish your group's questions with sourced answers",
  description:
    "Collect the questions neighbors keep asking. Your agent drafts answers with sources, a volunteer checks and accepts each one, and you share one link.",
  h1: "Neighbors' questions, answered with sources",
  intro: "Your agent drafts an answer and links its source. A volunteer reads the source and accepts the answer, and the list is ready to share.",
  label: "Civic Q&A with sources",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Q&A night supplies",
      description: "For the open meeting at the community center.",
      look: "sheet",
      items: [
        {
          want: "A portable PA speaker with a wireless mic",
          details: "Room for about 80 people; has to run on battery.",
          products: [
            { title: "Rechargeable PA with handheld mic", store: "Corner Stage Audio", price: "149.00", was: "189.00", by: "Claude" },
            { title: "Compact PA, two wireless mics", store: "Bellwether Music", price: "219.00", by: "Gemini" },
          ],
        },
        {
          want: "A large easel pad for writing questions up as they come in",
          bought: 0,
          products: [
            { title: "Self-stick easel pad, 25 x 30 in, 2-pack", store: "Mainstreet Office Co.", price: "42.99", earlier: ["49.99"], by: "Codex" },
            { title: "Tabletop easel pad with stand", store: "Ledger & Lamp", price: "27.50", by: "ChatGPT" },
          ],
        },
        {
          want: "Clipboards and pens for the sign-in table",
          products: [
            { title: "Letter-size clipboards, 6-pack", store: "Ledger & Lamp", price: "15.99", was: "19.99", by: "Grok" },
            { title: "Recycled-plastic clipboards with pen clip, 6-pack", store: "Mainstreet Office Co.", price: "21.00", by: "Claude", coupon: "COMMUNITY10" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before we publish",
      look: "today",
      items: [
        {
          want: "Check every draft answer against its source",
          status: "in_progress",
          updates: [
            {
              title: "Three of seven checked",
              body: "Two matched their sources. One cited last year's notice and went back for a newer source.",
              by: "Claude",
            },
          ],
        },
        { want: "Make the question list public once every answer is checked", details: "Research lists start private, so drafts stay with the committee.", dueInDays: 2 },
        { want: "Note in the shared post that answers come from public notices, not from the town", status: "done", doneNote: "Added, with a line on how to send us a correction." },
        { want: "Collect new questions from the library drop box" },
      ],
    },
    research: {
      format: "research",
      title: "Fenwick Hollow: Elm Street repaving questions",
      description: "Drafted by agents, checked and accepted by volunteers.",
      look: "doc",
      items: [
        {
          want: "When does Elm Street close for repaving, and for how long?",
          accepted: 0,
          updates: [
            { title: "Weekdays for two weeks, per the public works notice", body: "The town's notice lists the closure dates and says the street reopens to traffic each evening.", links: ["https://example.org/fenwick-hollow/public-works"], by: "Claude" },
            { title: "About three weeks starting in spring", body: "From a news post written before the schedule was set.", links: ["https://example.com/news/elm-street"], by: "Grok" },
          ],
        },
        {
          want: "Will the No. 4 bus still stop on Elm Street during the work?",
          status: "in_progress",
          updates: [
            {
              title: "It detours to Birch Avenue, per the transit notice",
              body: "Two temporary stops are listed. A volunteer should confirm the stop locations before we accept this.",
              links: ["https://example.org/fenwick-hollow/transit-detour"],
              by: "ChatGPT",
            },
          ],
        },
        { want: "Can residents park on side streets overnight while the work is on?" },
      ],
    },
  },
} satisfies Persona;
