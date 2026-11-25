import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "roommate-supplies-and-chores-list",
  order: 16,
  group: "home",
  title: "A roommate list for shared supplies and chores",
  description:
    "One private list for the apartment: who buys the router, who emails the landlord, what it cost. Roommates tick things off on the web, no agent needed.",
  h1: "Share the apartment's jobs and buys",
  intro: "Put shared supplies and chores where every roommate can see them. Whoever uses an agent can ask it for options; everyone else just ticks things off.",
  label: "Roommates sharing an apartment",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Apartment 4B supplies",
      description: "Shared buys only. Add the price when you pay.",
      look: "sheet",
      items: [
        {
          want: "Wi-Fi router that covers three bedrooms",
          bought: 0,
          products: [
            { title: "Dual-band Wi-Fi 6 router", store: "Harbor Electronics", price: "79.99", was: "109.99", by: "Claude" },
            { title: "Mesh Wi-Fi 6, two-pack", store: "Circuit Corner", price: "129.00", by: "ChatGPT", note: "Better for the back bedroom, $49 more." },
          ],
        },
        {
          want: "A vacuum under $80 for the hardwood floors",
          products: [
            { title: "Cordless stick vacuum, 30-minute battery", store: "Maple Street Home", price: "74.99", earlier: ["99.99", "89.99"], by: "Gemini" },
            { title: "Bagless upright, 25 ft cord", store: "Kettle & Pine", price: "69.00", by: "Claude" },
          ],
        },
        {
          want: "Paper towels and dish soap in bulk",
          products: [
            { title: "Paper towels, 12 rolls", store: "Corner Pantry Wholesale", price: "18.49", by: "Codex" },
            { title: "Dish soap refill, 90 oz", store: "Corner Pantry Wholesale", price: "8.99", was: "11.49", by: "Codex", coupon: "SAVE2" },
          ],
        },
        {
          want: "A shower curtain and liner",
          products: [
            { title: "Waffle-weave shower curtain, white", store: "Linen Lane", price: "24.00", by: "Muse" },
            { title: "Clear PEVA liner, magnet weights", store: "Maple Street Home", price: "9.99", by: "Claude" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Apartment jobs",
      look: "board",
      items: [
        {
          want: "Email the landlord about the dripping kitchen faucet",
          status: "in_progress",
          updates: [{ title: "Draft ready for Maya to send", body: "Short email with the date it started and a photo. The lease asks for repair requests in writing.", by: "Claude" }],
        },
        { want: "Get internet set up before Jordan moves in", dueInDays: 5 },
        { want: "Split the router cost", status: "done", doneNote: "$79.99 split three ways, $26.66 each. Everyone paid." },
        { want: "Agree a trash and recycling rotation" },
      ],
    },
    research: {
      format: "research",
      title: "Apartment questions",
      look: "doc",
      items: [
        {
          want: "Which internet plans serve our building?",
          accepted: 0,
          updates: [
            { title: "Two cable plans and one fiber plan", body: "The fiber plan is $55 a month with no contract; the cable plans need a 12-month term.", links: ["https://example.com/address-check"], by: "Claude" },
            { title: "Fiber is listed but not installed yet", body: "The provider's map shows our block as coming soon, so cable may be the only option this month.", links: ["https://example.org/fiber-map"], by: "Gemini" },
          ],
        },
        {
          want: "What do our lease and the city's tenant guide say about who fixes appliances?",
          status: "in_progress",
          updates: [{ title: "Lease section 9 covers appliances", body: "It says the landlord repairs supplied appliances; the city guide links the rules for response times.", links: ["https://example.org/tenant-guide"], by: "ChatGPT" }],
        },
        { want: "Do we each need our own renters insurance?" },
      ],
    },
  },
} satisfies Persona;
