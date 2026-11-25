import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "food-pantry-donation-list",
  order: 48,
  group: "work",
  title: "A food pantry needs list donors can read",
  description:
    "Publish what the pantry needs this month on a public list. Your AI agent adds affordable places to buy each item, so donations match what's needed.",
  h1: "Show donors exactly what the pantry needs",
  intro: "Keep this month's needs on one public page. Your agent adds a low price for each item, and you tick off what's been covered as donations come in.",
  label: "Food pantry needs list",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Needed this month",
      description: "Public. Updated by pantry volunteers as donations arrive.",
      look: "sheet",
      items: [
        {
          want: "Diapers, size 4 and size 5",
          details: "Most-requested item. Any brand, unopened packs only.",
          products: [
            { title: "Diapers size 4, 120 count", store: "Northway Supply", price: "32.99", was: "38.99", earlier: ["38.99", "35.49"], by: "ChatGPT" },
            { title: "Diapers size 5, 104 count", store: "Maple Street Market", price: "34.49", by: "Claude" },
          ],
        },
        {
          want: "Canned chicken or tuna, 12-packs",
          products: [
            { title: "Chunk chicken breast, 12.5 oz, 6-pack", store: "Maple Street Market", price: "17.94", by: "Gemini", note: "Two packs make a 12." },
            { title: "Chunk light tuna in water, 12-pack", store: "Harvest Lane Grocery", price: "13.88", was: "15.48", by: "ChatGPT" },
          ],
        },
        {
          want: "Peanut butter, 16 to 18 oz jars",
          bought: 0,
          products: [
            { title: "Creamy peanut butter, 16 oz, 6-pack", store: "Harvest Lane Grocery", price: "14.70", by: "Claude" },
            { title: "Peanut butter 18 oz", store: "Northway Supply", price: "2.89", by: "Grok", coupon: "PANTRY5" },
          ],
        },
        {
          want: "Travel-size hygiene items: toothpaste, soap, deodorant",
          products: [
            { title: "Travel toiletry kit bulk pack, 50 kits", store: "Northway Supply", price: "79.00", was: "92.00", by: "Gemini" },
            { title: "Travel toothpaste, 24 tubes", store: "Maple Street Market", price: "21.60", by: "ChatGPT" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Pantry coordination",
      look: "today",
      items: [
        {
          want: "Update the needs list after Saturday's distribution",
          status: "in_progress",
          updates: [{ title: "Shelf count posted by the volunteer team", body: "Diapers and canned protein are lowest. Pasta and rice are covered through January.", by: "Claude" }],
        },
        {
          want: "Share the list link with the two partner churches and the library",
          dueInDays: 4,
          updates: [{ title: "Short announcement drafted", body: "Gives drop-off hours and the list link, and asks donors to check it the day they shop.", by: "ChatGPT" }],
        },
        { want: "Confirm holiday drop-off hours with the building manager", status: "done", doneNote: "Open Dec 22 and 23, 10 a.m. to 2 p.m." },
        { want: "Ask the agent for fresh prices every Monday in December" },
      ],
    },
    research: {
      format: "research",
      title: "Donation questions",
      look: "doc",
      items: [
        {
          want: "Which items do pantries most often run short of in winter?",
          accepted: 0,
          updates: [
            {
              title: "Protein, diapers and hygiene items come up most",
              body: "Guides from regional food banks list these as hard to get through food drives.",
              links: ["https://example.org/food-bank/most-needed"],
              by: "Claude",
            },
            {
              title: "Cooking oil and spices are often overlooked",
              body: "Several pantry guides mention them as low-cost items that rarely get donated.",
              links: ["https://example.com/pantry-guide"],
              by: "Gemini",
            },
          ],
        },
        {
          want: "Can we accept home-baked goods, or only sealed packaged food?",
          status: "in_progress",
          updates: [{ title: "The regional food bank's partner rules say sealed only", body: "The partner agreement linked here is the one to follow; confirm with the regional coordinator.", links: ["https://example.org/partner-agreement"], by: "ChatGPT" }],
        },
        { want: "Do any local grocers match donations bought for the pantry?" },
      ],
    },
  },
} satisfies Persona;
