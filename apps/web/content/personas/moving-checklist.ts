import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "moving-checklist",
  order: 25,
  group: "moving",
  title: "A moving checklist your AI agent helps work through",
  description:
    "Put your move on one list: movers, utilities, lease questions and what the new apartment needs. Your agent gathers quotes and drafts; you decide and book.",
  h1: "Get through your move on one list",
  intro: "Your agent collects mover quotes, utility options and drafts. You decide, book and sign, and the list shows what's left before moving day.",
  label: "Moving checklist",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "New apartment: things that fit",
      description: "Measured from the floor plan; the bedroom alcove is 48 inches.",
      look: "sheet",
      items: [
        {
          want: "A dresser no wider than 48 inches",
          products: [
            { title: "6-drawer dresser, 47 in. wide", store: "Elm & Ash Furniture", price: "349.00", was: "429.00", by: "Claude" },
            { title: "Low 4-drawer dresser, 44 in. wide", store: "Parkside Home", price: "279.99", by: "Grok", note: "Arrives flat-packed; about 90 minutes to assemble." },
          ],
        },
        {
          want: "About 30 medium moving boxes",
          bought: 0,
          products: [
            { title: "Medium moving boxes, 25-pack", store: "Boxwell Supply", price: "54.99", by: "ChatGPT" },
            { title: "Used moving boxes, 30 mixed sizes", store: "Second Haul Boxes", price: "25.00", by: "Gemini", note: "Pickup only, within 10 miles." },
          ],
        },
        {
          want: "Blackout curtains, 84 inches, two panels",
          products: [
            { title: "Thermal blackout panels, 52 x 84 in., pair", store: "Parkside Home", price: "39.99", earlier: ["49.99", "44.99"], by: "Claude" },
            { title: "Linen-look blackout curtains, pair", store: "Hearthline", price: "54.00", was: "68.00", coupon: "NEWHOME", by: "Codex" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Move by the 31st",
      look: "board",
      items: [
        {
          want: "Get three quotes from local movers for a one-bedroom",
          status: "in_progress",
          updates: [{ title: "Two online estimates in: $780 and $1,050", body: "Both are a three-person crew for four hours; the higher one includes wardrobe boxes. The third company quotes only by phone, so that one is waiting on you.", links: ["https://example.com/mover-quotes"], by: "Claude" }],
        },
        {
          want: "Set up internet at the new apartment for move-in day",
          dueInDays: 9,
          updates: [{ title: "Two providers serve the building", body: "Fiber at $55 a month with free installation if booked a week ahead, or cable at $45 plus a $90 install fee.", links: ["https://example.org/internet-options"], by: "ChatGPT" }],
        },
        { want: "Transfer electric and gas to the new address", details: "Stop service at the old place the day after move-out." },
        { want: "Send the notice to vacate to the current landlord", status: "done", doneNote: "Agent drafted it; sent by email and certified mail on the 1st." },
      ],
    },
    research: {
      format: "research",
      title: "Lease and move questions",
      look: "doc",
      items: [
        {
          want: "Can the landlord keep part of the deposit for small nail holes?",
          accepted: 0,
          updates: [
            { title: "Usually not: the state guide calls them normal wear", body: "The state's tenant guide lists minor nail holes as normal wear and tear, and the lease adds nothing stricter.", links: ["https://example.org/tenant-guide"], by: "Claude" },
            { title: "It depends on the lease", body: "Links a general article that doesn't cover this state.", links: ["https://example.com/deposit-article"], by: "ChatGPT" },
          ],
        },
        {
          want: "When does renter's insurance have to start under the new lease?",
          status: "in_progress",
          updates: [{ title: "From the lease start date, not move-in", body: "Section 12 asks for proof of coverage from the 28th, three days before the move.", by: "Gemini" }],
        },
        { want: "Is it cheaper to book movers for a weekday?" },
      ],
    },
  },
} satisfies Persona;
