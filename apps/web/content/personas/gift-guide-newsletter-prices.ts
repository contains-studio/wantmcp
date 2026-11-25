import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "gift-guide-newsletter-prices",
  order: 60,
  group: "publishing",
  title: "Gift guide prices you can refresh before each issue",
  description:
    "Publish your gift guide as one public list. Before each issue, ask your agent to check every pick again; the new price lands beside the old one, with the date.",
  h1: "A gift guide you can re-price before every issue",
  intro: "Put your picks on one public list and link to it. Prices are as fresh as the last time you asked your agent, and each one shows when it was checked.",
  label: "Gift guides and deal newsletters",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Gifts under $30",
      description: "Re-checked the night before each Friday issue.",
      look: "sheet--christmas",
      items: [
        {
          want: "An insulated travel mug that fits a car cup holder",
          products: [
            { title: "Thermal commuter mug, 16 oz", store: "Wrenfield Goods", price: "24.00", was: "30.00", by: "Claude" },
            { title: "Leakproof travel tumbler, 14 oz", store: "Tidewater Home", price: "19.95", earlier: ["22.95", "21.50"], by: "Gemini", note: "Dropped twice since the October issue." },
          ],
        },
        {
          want: "A pocket-size game for two players",
          products: [
            { title: "Tile Duel card game", store: "Rookery Games", price: "14.99", by: "ChatGPT" },
            { title: "Magnetic travel chess set", store: "Rookery Games", price: "22.00", was: "28.00", by: "Claude" },
          ],
        },
        {
          want: "Warm touchscreen gloves",
          products: [
            { title: "Fleece-lined touchscreen gloves", store: "Northbay Outfitters", price: "18.50", by: "Codex" },
            { title: "Merino-blend knit gloves", store: "Tidewater Home", price: "27.00", by: "Grok", note: "Only two sizes left at the last check; ask again before linking." },
          ],
        },
        {
          want: "A pair of mini cast-iron skillets",
          products: [
            { title: "Two 6-inch cast-iron skillets", store: "Hearthside Kitchen", price: "26.99", was: "34.99", by: "Claude", coupon: "GUIDE10" },
            { title: "Enameled mini skillet, 6.5-inch", store: "Wrenfield Goods", price: "29.00", by: "Muse" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Friday issue checklist",
      look: "today",
      items: [
        {
          want: "Ask the agent to re-price every pick on Thursday night",
          status: "in_progress",
          updates: [
            {
              title: "11 of 12 picks re-checked",
              body: "Two went up since last week and one came down. The gloves are back at full price at one store.",
              by: "Claude",
            },
          ],
        },
        { want: "Swap out any pick that's now over $30", dueInDays: 1 },
        {
          want: "Add a \"prices as of\" line at the top of the issue",
          status: "done",
          doneNote: "Points readers to the list, where each price shows when it was checked.",
        },
        { want: "Draft the stocking stuffers issue", details: "Ten picks under $15, same list format." },
      ],
    },
    research: {
      format: "research",
      title: "Before I recommend it",
      look: "doc",
      items: [
        {
          want: "Is the commuter mug actually dishwasher safe?",
          accepted: 0,
          updates: [
            { title: "The lid is; the body is hand-wash only", body: "The maker's care page says the vacuum seal can fail in a dishwasher.", links: ["https://example.com/care/commuter-mug"], by: "Claude" },
            { title: "Yes, top rack", body: "From a store listing that doesn't match the maker's care page.", links: ["https://example.org/listing/mug"], by: "Muse" },
          ],
        },
        {
          want: "Which picks arrive by December 20 with standard shipping?",
          status: "in_progress",
          updates: [
            {
              title: "Nine of twelve, if ordered by December 12",
              body: "The two games and the gloves ship from one warehouse with a slower cutoff, December 9.",
              links: ["https://example.com/shipping-cutoffs"],
              by: "ChatGPT",
            },
          ],
        },
        { want: "Are there warm gloves under $30 without a synthetic lining?" },
      ],
    },
  },
} satisfies Persona;
