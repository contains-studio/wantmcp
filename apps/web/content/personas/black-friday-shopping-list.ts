import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "black-friday-shopping-list",
  order: 1,
  group: "deals",
  title: "A Black Friday list with the price before the sale",
  description:
    "Write down what you planned to buy anyway. Your AI agent adds each store's price and the price before the sale, so you can judge every Black Friday deal.",
  h1: "A Black Friday list with the price before the sale",
  intro: "List the few things you meant to buy anyway. Ask your agent before and during the sale, and each price it finds lands next to the last one.",
  label: "Black Friday buying",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Black Friday: the five things",
      description: "Planned before the sale, checked during it.",
      look: "sheet--black-friday",
      items: [
        {
          want: "Over-ear noise-canceling headphones, under $250",
          details: "For flights. Comfortable for six hours; a case that folds flat isn't needed.",
          products: [
            { title: "Quietline 700 wireless, over-ear", store: "Harbor Electronics", price: "199.00", was: "279.00", earlier: ["279.00", "249.00"], by: "Claude", note: "The $249 \"sale\" price in October was the list price two weeks before." },
            { title: "Aria ANC Pro headphones", store: "Fieldstone", price: "229.99", was: "299.99", by: "ChatGPT" },
            { title: "Tempo Studio NC, refurbished", store: "Second Spin Audio", price: "149.00", by: "Claude", note: "Certified refurbished, one-year warranty." },
          ],
        },
        {
          want: "A 6-quart air fryer with a window",
          products: [
            { title: "Crispwell 6 qt with viewing window", store: "Maple Street Home", price: "89.99", was: "129.99", by: "Codex", coupon: "BF15" },
            { title: "Two-basket air fryer, 8 qt", store: "Copperline Kitchen", price: "119.00", was: "159.00", by: "Claude" },
          ],
        },
        {
          want: "A robot vacuum that handles dog hair",
          details: "Hardwood and two rugs. No mopping needed.",
          products: [
            { title: "Roamer S8 with self-empty base", store: "Kettle & Pine", price: "299.00", was: "449.00", earlier: ["449.00", "329.00"], by: "ChatGPT" },
            { title: "PetPro robot vacuum, rubber brushes", store: "Harbor Electronics", price: "249.99", by: "Claude" },
          ],
        },
        {
          want: "Winter boots, women's size 8, waterproof",
          bought: 0,
          products: [
            { title: "Ridgeline waterproof boot, women's 8", store: "Trailhead Outfitters", price: "98.00", was: "140.00", by: "Claude", image: "shoe" },
            { title: "Insulated snow boot, women's 8", store: "Northway Supply", price: "112.50", by: "Codex" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Sale week plan",
      look: "today",
      items: [
        {
          want: "Ask the agent for prices on the whole list Monday and again on Friday",
          details: "Same entries, so the history shows the drop.",
          status: "in_progress",
          updates: [{ title: "Monday prices posted for all five", body: "Four of five are already lower than in October. The vacuum is the same as its October sale price.", by: "Claude" }],
        },
        { want: "Check return windows on anything over $200", dueInDays: 2, updates: [{ title: "Both stores: 30 days, holiday purchases until Jan 31", body: "Fieldstone charges a 15% restocking fee on opened headphones.", links: ["https://example.com/returns"], by: "ChatGPT" }] },
        { want: "Set the gift budget with Sam: $600 total", status: "done", doneNote: "Agreed $600, headphones count as a gift." },
      ],
    },
    research: {
      format: "research",
      title: "Is it actually a deal?",
      look: "doc",
      items: [
        {
          want: "Was the headphones' $199 price lower at any time this year?",
          accepted: 0,
          updates: [
            { title: "No: $199 is the lowest since January", body: "Prices posted on this list and the store's own price history show $279 most of the year, $249 in October and $199 now.", links: ["https://example.com/price-history"], by: "Claude" },
          ],
        },
        {
          want: "Do price-match policies cover online-only competitors?",
          status: "in_progress",
          updates: [{ title: "Harbor matches online, Fieldstone doesn't", body: "Harbor matches identical items from listed online stores until Dec 24. Fieldstone matches only its own lower price within 14 days.", links: ["https://example.org/price-match"], by: "Gemini" }],
        },
        { want: "Is the refurbished pair worth $50 less than new?" },
      ],
    },
  },
} satisfies Persona;
