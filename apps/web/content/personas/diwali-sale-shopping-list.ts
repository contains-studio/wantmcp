import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "diwali-sale-shopping-list",
  order: 63,
  group: "anywhere",
  title: "Diwali sale shopping: the real price after offers",
  description:
    "List your planned Diwali buys. Ask your agent for each store's price, card offer and trade-in credit, then compare what you'd really pay before the sale ends.",
  h1: "Compare Diwali sale prices after card offers",
  intro: "Write down the big buys and the festive extras. Your agent can post each price with the card offer and trade-in terms beside it, so you see what you'd really pay.",
  label: "Diwali and festive sales",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Diwali sale: planned buys",
      description: "Card offers and trade-ins noted on each option.",
      look: "sheet",
      items: [
        {
          want: "A 55-inch 4K TV, under $450 after offers",
          products: [
            { title: "55-inch 4K LED smart TV", store: "Lumen Electronics", price: "429.99", was: "529.99", by: "Claude", note: "Extra 10% off with the Crestline Bank card, capped at $40: about $390." },
            { title: "55-inch QLED smart TV", store: "Parkway Appliance", price: "479.00", earlier: ["549.00", "499.00"], by: "ChatGPT", note: "No card offer. Free wall mount with delivery." },
          ],
        },
        {
          want: "A new phone, trading in the old one",
          details: "128 GB is enough. The old phone works but the battery is tired.",
          products: [
            { title: "Unlocked phone, 128 GB", store: "Signal & Co.", price: "599.00", by: "Gemini", note: "Trade-in credit up to $200 for a working phone, set after inspection." },
            { title: "Unlocked phone, prior model, 128 GB", store: "Lumen Electronics", price: "449.00", was: "549.00", by: "Codex", note: "Trade-in credit up to $120." },
          ],
        },
        {
          want: "An 8-quart electric pressure cooker",
          bought: 0,
          products: [
            { title: "8 qt multi-cooker, stainless pot", store: "Saffron Lane Kitchen", price: "79.99", was: "119.99", by: "Claude", coupon: "FESTIVE15" },
            { title: "8 qt pressure cooker with yogurt setting", store: "Parkway Appliance", price: "94.50", by: "Grok" },
          ],
        },
        {
          want: "Warm-white string lights for the balcony, about 100 feet",
          products: [
            { title: "Plug-in LED string lights, 100 ft", store: "Bright Hollow Home", price: "32.99", was: "44.99", by: "Muse" },
            { title: "Solar string lights, 2 x 50 ft", store: "Bright Hollow Home", price: "39.00", by: "ChatGPT", note: "Needs a sunny spot; about six hours of light on a full charge." },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before the festive weekend",
      look: "sections",
      items: [
        {
          want: "Gather every card offer and its fine print in one place",
          status: "in_progress",
          updates: [
            {
              title: "Three card offers found",
              body: "Two cap the discount at $40 to $50. The third only applies to orders over $500.",
              links: ["https://example.com/card-offers"],
              by: "Claude",
            },
          ],
        },
        { want: "Order diyas, rangoli colors and gift boxes", dueInDays: 4 },
        { want: "Settle the budget for the big buys", status: "done", doneNote: "$1,200 for the TV, phone and cooker; gifts and sweets counted separately." },
        { want: "Back up and reset the old phone before trading it in" },
      ],
    },
    research: {
      format: "research",
      title: "Which offer really wins?",
      look: "doc",
      items: [
        {
          want: "After the card cap, which TV costs less delivered?",
          accepted: 0,
          updates: [
            { title: "The Lumen TV, at about $390 plus free delivery", body: "The 10% card offer stops at $40, so it takes $429.99 to about $390. Parkway's $479 has no card offer.", links: ["https://example.com/lumen/tv-offer"], by: "Claude" },
            { title: "Parkway, once the free wall mount is counted", body: "Only if you'd otherwise buy a mount for about $90, which isn't on the list.", links: ["https://example.org/parkway/tv"], by: "ChatGPT" },
          ],
        },
        {
          want: "Is the trade-in credit guaranteed, or decided after inspection?",
          status: "in_progress",
          updates: [
            {
              title: "Decided after inspection at both stores",
              body: "Signal & Co. quotes up to $200 but sets the final amount when the phone arrives. Still checking Lumen's terms.",
              links: ["https://example.com/signal/trade-in"],
              by: "Gemini",
            },
          ],
        },
        { want: "Which sweet shops ship assorted mithai boxes in time for gifting?" },
      ],
    },
  },
} satisfies Persona;
