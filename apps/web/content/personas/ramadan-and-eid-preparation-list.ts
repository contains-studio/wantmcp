import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "ramadan-and-eid-preparation-list",
  order: 13,
  group: "gifts",
  title: "Ramadan and Eid preparation list to share",
  description:
    "Share Ramadan and Eid preparations in one list: food, outfits, gifts and visits. Your AI agent adds options and updates, with slack if Eid moves by a day.",
  h1: "Prepare for Ramadan and Eid together",
  intro: "Put the meals, outfits, gifts and errands on one list the household shares. Plan to be ready a day early, since the date can shift.",
  label: "Ramadan and Eid preparations",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Eid outfits and gifts",
      description: "Sizes in the details. Ready two days before the earliest date.",
      look: "sheet",
      items: [
        {
          want: "Eid outfit for Yusuf, boys' size 8, room for alterations",
          details: "Needs to arrive with enough time for hemming.",
          products: [
            { title: "Cotton kurta set, ivory, boys' 8", store: "Crescent Tailoring House", price: "42.00", was: "55.00", by: "Claude" },
            { title: "Embroidered kurta and trousers, navy, boys' 8", store: "Silkroad Kids", price: "48.99", by: "ChatGPT", note: "Free hemming if ordered by the 1st of the month." },
          ],
        },
        {
          want: "Small gifts for five children, about $15 each",
          products: [
            { title: "Illustrated story collection, hardcover", store: "Lamp & Leaf Books", price: "14.99", by: "Gemini" },
            { title: "Craft kit: make-your-own lanterns", store: "Willow Craft Co.", price: "12.50", earlier: ["16.00", "13.50"], by: "Claude" },
            { title: "Gift envelopes, pack of 20", store: "Paper Garden", price: "6.00", by: "Grok" },
          ],
        },
        {
          want: "Medjool dates for the month, about 5 pounds",
          bought: 0,
          products: [
            { title: "Medjool dates, 5 lb box", store: "Oasis Pantry", price: "34.99", by: "Claude" },
            { title: "Medjool dates, 2 lb, pack of 3", store: "Green Valley Grocers", price: "39.00", by: "Codex" },
          ],
        },
        {
          want: "Two large serving platters for Eid lunch",
          products: [
            { title: "Stoneware oval platter, 18 in", store: "Copperline Kitchen", price: "29.00", was: "39.00", by: "Muse" },
            { title: "Hammered metal serving tray, 20 in", store: "Market Lane Home", price: "36.50", by: "ChatGPT", coupon: "HOME15" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before Eid",
      look: "sections",
      items: [
        {
          want: "Get the outfits altered",
          status: "in_progress",
          updates: [{ title: "Tailor can take them next week", body: "Crescent asks for five working days. That leaves two spare days before the earliest possible Eid.", by: "Claude" }],
        },
        { want: "Plan Eid lunch for 12 so it works on either day", dueInDays: 6, details: "Anything cooked ahead should keep an extra day." },
        { want: "Stock the pantry for the first week of Ramadan", status: "done", doneNote: "Rice, lentils, flour and oil done. Dates on the shopping list." },
        { want: "Split the gift wrapping between the three of us" },
      ],
    },
    research: {
      format: "research",
      title: "Questions to settle",
      look: "doc",
      items: [
        {
          want: "Which tailors nearby can hem two outfits in under a week?",
          accepted: 0,
          updates: [
            { title: "Crescent Tailoring, five working days", body: "Its booking page shows openings next week and a flat price per hem.", links: ["https://example.com/crescent-booking"], by: "Claude" },
            { title: "Stitch Corner, three days, walk-in", body: "Walk-ins only, so the wait depends on the day.", links: ["https://example.org/stitch-corner"], by: "Gemini" },
          ],
        },
        {
          want: "Which local food banks take holiday food donations, and what do they need most?",
          status: "in_progress",
          updates: [{ title: "Two take dry goods this month", body: "Both list rice, canned beans and cooking oil as most needed and accept drop-offs on weekdays.", links: ["https://example.org/food-bank-needs"], by: "ChatGPT" }],
        },
        { want: "What is the latest order date if Eid falls a day earlier?" },
      ],
    },
  },
} satisfies Persona;
