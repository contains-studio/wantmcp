import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "fact-check-claims-tracker",
  order: 50,
  group: "research",
  title: "Track claims to check, with sources for each one",
  description:
    "A private list of the claims in your story. Your agents post answers with primary sources, you compare them, and you accept the one that holds up.",
  h1: "Every claim, its sources and its answer",
  intro: "Write each claim you need to check as a question on a private list. Your agents post answers with links; you accept the one you'll stand behind.",
  label: "Checking claims for a story",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Field kit refresh",
      description: "Made private: nobody needs to see this one.",
      look: "sheet",
      items: [
        {
          want: "A pocket voice recorder with a stereo mic",
          details: "Long battery life; must record straight to a card, not an app.",
          products: [
            { title: "Clearnote R40 stereo recorder, 16 GB", store: "Signal & Sons", price: "89.00", was: "119.00", earlier: ["119.00", "99.00"], by: "Claude" },
            { title: "Fieldtone pocket recorder with card slot", store: "Press Row Supply", price: "74.50", by: "Grok" },
          ],
        },
        {
          want: "A 2 TB portable SSD for interview files",
          products: [
            { title: "Slate 2 TB USB-C portable SSD, encrypted", store: "Harbor Electronics", price: "139.99", was: "169.99", by: "ChatGPT", note: "Hardware encryption with a PIN pad." },
            { title: "Pocket SSD 2 TB, rugged", store: "Press Row Supply", price: "124.00", by: "Claude" },
          ],
        },
        {
          want: "A clip-on lavalier mic for phone interviews",
          bought: 0,
          products: [
            { title: "Clipwire lav mic, 6 ft cable, USB-C", store: "Signal & Sons", price: "24.99", by: "Grok" },
            { title: "Two-person lav kit, USB-C", store: "Press Row Supply", price: "39.00", by: "ChatGPT" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Transit story: before it runs",
      look: "board",
      items: [
        {
          want: "Draft the records request for the 2023 bus inspection reports",
          status: "in_progress",
          updates: [{ title: "Draft ready for review", body: "Cites the state records law, asks for reports in their original format and names the date range. Needs the records officer's current address.", links: ["https://example.org/records-request-template"], by: "Claude" }],
        },
        { want: "Build a timeline of every council vote on the route cuts", dueInDays: 2, updates: [{ title: "Seven votes found so far", body: "Minutes for the June meeting aren't posted yet; the timeline marks that gap.", links: ["https://example.org/council/minutes"], by: "Gemini" }] },
        { want: "Check the spelling of every name and title in the draft", status: "done", doneNote: "Two titles corrected against the agency staff page." },
        { want: "Ask the agency for comment on the ridership figure" },
      ],
    },
    research: {
      format: "research",
      title: "Claims to check: transit cuts",
      look: "doc",
      items: [
        {
          want: "When did the transit agency first publish the 38% ridership drop?",
          accepted: 0,
          updates: [
            { title: "In the March board packet, page 14", body: "The figure first appears in a chart in the March board packet. The press release repeating it came out nine days later.", links: ["https://example.org/agency/board-packet-march", "https://example.org/agency/press-release"], by: "Claude" },
            { title: "In the press release", body: "The earliest public mention found in news coverage is the press release.", links: ["https://example.com/news/transit"], by: "Grok" },
          ],
        },
        {
          want: "Does the 38% compare the same months in both years?",
          status: "in_progress",
          updates: [{ title: "Probably not: one year counts 11 months", body: "The 2022 total in the packet's appendix covers February to December. Asking the agency to confirm before we say so.", links: ["https://example.org/agency/board-packet-march#appendix"], by: "Gemini" }],
        },
        { want: "Is the 'oldest fleet in the state' claim true for buses in service today?" },
      ],
    },
  },
} satisfies Persona;
