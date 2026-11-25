import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "office-supplies-price-list",
  order: 43,
  group: "work",
  title: "Compare office supply prices on one shared list",
  description:
    "Keep the office's supply and equipment requests on one list. Coworkers add what they need; your AI agent adds stores, prices and the date each was checked.",
  h1: "Keep the office stocked, priced and in one place",
  intro: "Coworkers you invite add requests on the web. Your agent puts current prices next to each one, so restocking starts with the numbers.",
  label: "Office supply buying",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Office requests: December",
      description: "Restock plus two new-hire setups.",
      look: "sheet",
      items: [
        {
          want: "Ergonomic chair for the new designer, under $300",
          details: "Starts the 9th. Adjustable arms; fits a 5'4\" to 6' range.",
          products: [
            { title: "Meridian mesh task chair", store: "Deskwright", price: "249.00", was: "319.00", earlier: ["319.00", "279.00"], by: "ChatGPT", image: "chair-b" },
            { title: "Pivot ergonomic chair, 4D arms", store: "Officeline Direct", price: "289.99", by: "Claude", image: "chair-a", note: "Ships assembled for $25 more." },
          ],
        },
        {
          want: "Toner for the 2nd-floor laser printer, black, high yield",
          bought: 1,
          products: [
            { title: "High-yield black toner, 6,000 pages", store: "Officeline Direct", price: "89.99", by: "Claude" },
            { title: "Compatible high-yield toner, 2-pack", store: "Inkwell Depot", price: "64.50", was: "79.00", by: "Gemini", note: "Compatible, not the printer maker's own." },
          ],
        },
        {
          want: "Whole-bean coffee for the kitchen, 5 lb",
          products: [
            { title: "House blend, medium roast, 5 lb", store: "Ridge Roasters", price: "54.00", by: "Grok", coupon: "OFFICE10" },
            { title: "Breakfast blend whole bean, 5 lb", store: "Northway Supply", price: "47.99", was: "52.99", by: "ChatGPT" },
          ],
        },
        {
          want: "Dry-erase markers, chisel tip, 36 assorted",
          products: [
            { title: "Low-odor markers, 36 count", store: "Officeline Direct", price: "24.99", by: "Codex" },
            { title: "Dry-erase markers, 36 assorted", store: "Paper Trail Supply", price: "19.80", was: "26.40", by: "Claude" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Office jobs",
      look: "today",
      items: [
        {
          want: "Count the supply closet and list what's below two weeks' worth",
          status: "in_progress",
          updates: [{ title: "Low: printer paper, sticky notes, AA batteries", body: "Everything else covers at least a month at the current rate. Paper is the urgent one.", by: "Claude" }],
        },
        {
          want: "Set up desks for the two December hires",
          dueInDays: 6,
          updates: [{ title: "Checklist drafted from the last onboarding", body: "Chair, monitor arm, badge, keys, and a welcome note. Chair is on the shopping list.", by: "ChatGPT" }],
        },
        { want: "Get the kitchen dishwasher serviced", status: "done", doneNote: "Technician replaced the drain hose; invoice filed." },
        { want: "Collect holiday party headcount by Friday" },
      ],
    },
    research: {
      format: "research",
      title: "Office questions",
      look: "doc",
      items: [
        {
          want: "Pods or whole beans: which costs less per cup for 25 people?",
          accepted: 0,
          updates: [
            {
              title: "Beans: about 30 cents a cup against 70 for pods",
              body: "Based on the prices on this list and 2 cups a person a day. The grinder and brewer cost is paid back in about four months.",
              links: ["https://example.com/coffee-cost"],
              by: "Claude",
            },
            {
              title: "Pods cost more but waste less coffee",
              body: "Fewer half-full pots poured away. The gap narrows if afternoon use is low.",
              by: "Gemini",
            },
          ],
        },
        {
          want: "Which office recycling services take toner cartridges for free?",
          status: "in_progress",
          updates: [
            {
              title: "Two local options, one with mail-back labels",
              body: "Officeline Direct takes cartridges in store; the printer maker sends prepaid return labels on request.",
              links: ["https://example.org/toner-recycling"],
              by: "Grok",
            },
          ],
        },
        { want: "Is a standing-desk converter enough, or should we budget for full desks?" },
      ],
    },
  },
} satisfies Persona;
