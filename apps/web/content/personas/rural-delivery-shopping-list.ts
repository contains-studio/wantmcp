import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "rural-delivery-shopping-list",
  order: 67,
  group: "anywhere",
  title: "Shop only what delivers to your rural ZIP code",
  description:
    "Make your list private, add your ZIP code once, and ask your agent which stores deliver there, what delivery costs and when it would arrive, before you order.",
  h1: "Only what delivers to your ZIP code",
  intro: "Make the list private, put your ZIP code in the details, and ask your agent to check delivery before price. Errands for the next trip to town go on a task list.",
  label: "Rural and remote delivery",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Before the cold sets in",
      description: "Private. Delivery to our ZIP code checked first, then price.",
      look: "sheet",
      items: [
        {
          want: "A 7-cubic-foot chest freezer, delivered by December 10",
          details: "Gravel drive; curbside drop-off is fine.",
          products: [
            { title: "7 cu ft chest freezer", store: "Prairie Line Appliance", price: "239.00", was: "279.00", by: "Claude", note: "Delivers to this ZIP code by freight: $79, 8 to 12 business days." },
            { title: "7 cu ft garage-ready chest freezer", store: "County Road Supply", price: "259.99", by: "ChatGPT", note: "Free delivery within 50 miles of the store; this ZIP code is 64 miles out." },
          ],
        },
        {
          want: "A replacement chain for an 18-inch chainsaw bar",
          bought: 0,
          products: [
            { title: "18-inch replacement chain, 3/8 pitch", store: "Ridgeback Farm & Ranch", price: "24.99", by: "Gemini", note: "Ships by mail; 4 to 6 days." },
            { title: "18-inch low-kickback chain", store: "Prairie Line Appliance", price: "21.49", earlier: ["26.99", "23.99"], by: "Grok", note: "Store pickup only." },
          ],
        },
        {
          want: "Whole-house water filter cartridges, two of them",
          products: [
            { title: "Sediment filter, 10 x 4.5 in, 2-pack", store: "Wellspring Water Co.", price: "34.95", by: "Codex", coupon: "WINTER10" },
            { title: "Carbon block cartridges, 2-pack", store: "County Road Supply", price: "41.00", was: "48.00", by: "Claude" },
          ],
        },
        {
          want: "A heated water bucket for the chicken coop",
          products: [
            { title: "Heated 5-gallon bucket, thermostat", store: "Ridgeback Farm & Ranch", price: "39.99", by: "Muse", note: "Ships to this ZIP code; $12.50 shipping." },
            { title: "Heated poultry waterer, 3 gallon", store: "Henhouse Supply", price: "54.00", by: "ChatGPT" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Next trip to town",
      look: "today",
      items: [
        {
          want: "Ask the agent to check delivery for everything on the list",
          status: "in_progress",
          updates: [
            {
              title: "Three of four deliver here",
              body: "The cheaper chain was store pickup only, so the one that ships by mail is ordered.",
              by: "Claude",
            },
          ],
        },
        { want: "Town run: feed store, hardware store, post office", details: "Ask the feed store when the next poultry order comes in.", dueInDays: 4 },
        { want: "Send back the wrong filter cartridge", status: "done", doneNote: "Prepaid label; dropped at the post office." },
        { want: "Write down directions for the freight driver", details: "The map pin lands at the neighbor's gate." },
      ],
    },
    research: {
      format: "research",
      title: "Delivery questions",
      look: "doc",
      items: [
        {
          want: "Will the freezer come to the door, or wait at the freight terminal?",
          accepted: 0,
          updates: [
            { title: "Curbside, after a call to book a delivery window", body: "Prairie Line's freight page says the carrier calls to schedule and leaves it at the curb or end of the drive.", links: ["https://example.com/prairie-line/freight"], by: "Claude" },
            { title: "Terminal pickup only", body: "From a general carrier page; this store's own terms say curbside.", links: ["https://example.org/carrier/rural"], by: "Grok" },
          ],
        },
        {
          want: "Which stores within 80 miles keep 18-inch chains in stock?",
          status: "in_progress",
          updates: [
            {
              title: "Two so far, both listed in stock this week",
              body: "One is on the usual town route. Store pages can lag, so it's worth a call before driving.",
              links: ["https://example.com/stock/chain-18"],
              by: "Gemini",
            },
          ],
        },
        { want: "What's the cheapest way to get a heavy appliance up a long gravel drive?" },
      ],
    },
  },
} satisfies Persona;
