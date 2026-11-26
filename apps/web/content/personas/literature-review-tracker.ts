import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "literature-review-tracker",
  order: 24,
  group: "school",
  opens: "research",
  title: "A literature review tracker for open research questions",
  description:
    "Keep each open question from your literature review on one list. Different AI agents post sourced answers, and you accept the one that survives checking.",
  h1: "Track the open questions in your literature review",
  intro: "One question per line, every answer with its sources, and a record of which one you accepted after checking it yourself.",
  label: "Literature review questions",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Thesis desk and books",
      look: "sheet",
      items: [
        {
          want: "A used copy of the out-of-print methods book",
          details: "The library copy has a six-week hold queue.",
          products: [
            { title: "Field Methods in Social Research, 2nd ed., used, very good", store: "Old Quarter Books", price: "42.00", earlier: ["58.00", "47.00"], by: "Claude" },
            { title: "Same edition, ex-library copy", store: "Riverbend Used Books", price: "27.50", by: "Gemini", note: "Stamps and a library pocket inside the cover." },
          ],
        },
        {
          want: "A 27-inch monitor for two PDFs side by side",
          bought: 0,
          products: [
            { title: "27-inch 1440p IPS monitor", store: "Brightway Electronics", price: "219.99", was: "279.99", by: "Codex", image: "monitor" },
            { title: "27-inch 4K monitor with USB-C", store: "Lumen Desk Supply", price: "329.00", by: "Claude", image: "monitor-b" },
          ],
        },
        {
          want: "A desk chair with lumbar support",
          products: [
            { title: "Mesh task chair, adjustable lumbar", store: "Lumen Desk Supply", price: "189.00", was: "249.00", by: "ChatGPT", image: "chair-a" },
            { title: "Upholstered task chair", store: "Hollis Office Outlet", price: "159.99", coupon: "GRAD20", by: "Grok", image: "chair-b" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Chapter 2 milestones",
      look: "board",
      items: [
        {
          want: "Pull every paper that cites the 2018 field study",
          status: "in_progress",
          updates: [{ title: "34 citing papers so far, 9 attempt a replication", body: "Listed with DOIs. Two are preprints with no published version yet.", links: ["https://example.org/citing-papers"], by: "Claude" }],
        },
        { want: "Send the review outline to my advisor", dueInDays: 10 },
        { want: "Move accepted answers into the chapter outline" },
        { want: "Set up one research list per chapter", status: "done", doneNote: "Chapters 2 to 4 each have a list; methods questions live on chapter 3." },
      ],
    },
    research: {
      format: "research",
      title: "Chapter 2: open questions",
      look: "doc",
      items: [
        {
          want: "Has the 2018 framing effect replicated in studies since 2020?",
          accepted: 0,
          updates: [
            { title: "Partly: two of three preregistered replications found a smaller effect", body: "Both report effects about half the original size. The third used a different population, so it isn't a direct test.", links: ["https://example.org/replication-a", "https://example.org/replication-b"], by: "Claude" },
            { title: "Yes, in a multi-site study", body: "Cites one study, but the link is a conference abstract, not the full paper.", links: ["https://example.com/abstract"], by: "Gemini" },
          ],
        },
        {
          want: "Which outcome measures are used most often after 2015?",
          status: "in_progress",
          updates: [{ title: "Three survey scales cover most papers so far", body: "Based on 40 abstracts. Full texts still need checking for modified versions.", links: ["https://example.org/measures"], by: "Codex" }],
        },
        { want: "Does any study test the effect outside student samples?" },
      ],
    },
  },
} satisfies Persona;
