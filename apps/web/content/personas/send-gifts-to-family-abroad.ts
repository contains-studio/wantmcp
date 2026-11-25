import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "send-gifts-to-family-abroad",
  order: 9,
  group: "gifts",
  title: "Send gifts to family in another country",
  description:
    "Write where the gift is going and when it has to land. Your agent looks for stores that ship there, with prices and delivery notes on one shareable list.",
  h1: "Gifts that reach family overseas",
  intro: "Put the city and the date in the want. Your agent posts options from stores that deliver there, and relatives you invite can add what they're sending too.",
  label: "Sending gifts abroad",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Christmas gifts to Manila",
      description: "Everything here has to ship to Quezon City by Dec 20.",
      look: "sheet",
      items: [
        {
          want: "Rice cooker for Mama and Papa, 220-volt",
          details: "Must be a 220V model. Delivered by Dec 20.",
          products: [
            { title: "5.5-cup induction rice cooker, 220V", store: "Pacific Home Direct", price: "129.00", was: "149.00", by: "Claude", note: "Ships to the Philippines; store lists 7 to 10 business days and $24 delivery." },
            { title: "Micom rice cooker, 6 cup, 220V", store: "Global Kitchen Export", price: "112.50", by: "Gemini", note: "Delivery fee shown at checkout; import fees not included." },
          ],
        },
        {
          want: "Tablet for my nephew, about $200",
          details: "Charger has to work on 220V. He's 11 and mostly reads and draws.",
          products: [
            { title: "10-inch tablet, 64 GB, with stylus", store: "Harbor Electronics", price: "189.99", was: "229.99", earlier: ["229.99", "209.99"], by: "ChatGPT", note: "Charger rated 100 to 240V. Harbor doesn't ship abroad, so it would go in a box with the rest." },
            { title: "10-inch kids tablet with case, 32 GB", store: "Islandwide Gadgets", price: "174.00", by: "Claude", note: "Manila store, delivers in Metro Manila in 2 to 3 days." },
          ],
        },
        {
          want: "Warm scarf for Lola's trip to Baguio",
          bought: 0,
          products: [
            { title: "Lambswool scarf, heather gray", store: "Fieldstone", price: "38.00", by: "Gemini" },
            { title: "Knit scarf and glove set", store: "Northway Supply", price: "29.95", was: "39.95", by: "Grok" },
          ],
        },
        {
          want: "Box of US snacks the cousins ask for",
          products: [
            { title: "Holiday snack box, 24 pieces", store: "Mill Creek Pantry", price: "44.00", by: "Claude", note: "Store lists 10 to 14 business days to the Philippines." },
            { title: "Candy and cookie gift tin", store: "Copperline Kitchen", price: "36.50", by: "ChatGPT" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Getting it there",
      look: "today",
      items: [
        {
          want: "Find stores that deliver to Quezon City before Christmas",
          status: "in_progress",
          updates: [{ title: "Two direct, one local", body: "Pacific Home Direct and Global Kitchen Export ship there; Islandwide Gadgets is a Manila store. Still checking the snack boxes.", links: ["https://example.com/ships-to-ph"], by: "Claude" }],
        },
        { want: "Order everything that ships from the US", dueInDays: 8 },
        { want: "Confirm Tita Lorna's delivery address", status: "done", doneNote: "Address and phone number for the courier confirmed." },
        { want: "Invite Ate Joy so she can add what she's sending from Toronto" },
      ],
    },
    research: {
      format: "research",
      title: "Before it ships",
      look: "doc",
      items: [
        {
          want: "Will a US rice cooker work in the Philippines?",
          accepted: 0,
          updates: [
            { title: "Only a 220V model, or with a transformer", body: "Outlets there are 220V. A 120V cooker needs a step-down transformer, so the list only has 220V models.", links: ["https://example.com/voltage-guide"], by: "Claude" },
            { title: "Buying locally avoids the issue", body: "Stores in Manila sell the same type of cooker already wired for local outlets.", links: ["https://example.org/local-appliances"], by: "Gemini" },
          ],
        },
        {
          want: "Is it cheaper to buy the tablet from a Manila store?",
          status: "in_progress",
          updates: [{ title: "Close, once shipping is counted", body: "Islandwide's price is about the same as Harbor's plus a share of the box shipping. Checking warranty coverage there.", links: ["https://example.com/tablet-compare"], by: "ChatGPT" }],
        },
        { want: "Which items might be held up or taxed on arrival?" },
      ],
    },
  },
} satisfies Persona;
