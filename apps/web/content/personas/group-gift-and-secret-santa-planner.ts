import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "group-gift-and-secret-santa-planner",
  order: 8,
  group: "gifts",
  title: "Organize a group gift or Secret Santa",
  description:
    "Keep the ideas under the spending limit, the jobs and who's done what on one list. Invite the group to tick things off on the web, no agent needed.",
  h1: "Run the group gift from one list",
  intro: "Your agent gathers ideas under the limit and posts updates on the jobs. People you invite can add ideas and tick off their part on the web.",
  label: "Group gifts and Secret Santa",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Office exchange, $25 limit",
      description: "Ideas anyone in the exchange can borrow.",
      look: "sheet--christmas",
      items: [
        {
          want: "Desk gifts under $25 that aren't a mug",
          products: [
            { title: "Desk plant in a self-watering pot", store: "Greenhouse & Co.", price: "22.00", by: "Claude" },
            { title: "Wireless charging pad, walnut finish", store: "Harbor Electronics", price: "24.99", was: "34.99", by: "ChatGPT" },
            { title: "Mini cable organizer set", store: "Fieldstone", price: "14.50", by: "Cursor" },
          ],
        },
        {
          want: "Food gifts that ship well, under $25",
          products: [
            { title: "Hot cocoa sampler, six flavors", store: "Mill Creek Pantry", price: "19.95", by: "Gemini" },
            { title: "Small-batch hot sauce trio", store: "Ember & Oak", price: "24.00", earlier: ["28.00"], by: "Claude" },
          ],
        },
        {
          want: "Farewell gift for Priya from the whole team, about $150",
          details: "She's moving to Denver and getting into skiing.",
          bought: 0,
          products: [
            { title: "Insulated ski gloves, women's M", store: "Summit Supply Co.", price: "89.00", was: "120.00", by: "ChatGPT" },
            { title: "Framed trail map of the Front Range", store: "Paper Lantern", price: "64.00", by: "Claude", note: "With the gloves, $153 total." },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Gift exchange to-dos",
      look: "today--christmas",
      items: [
        {
          want: "Find out who can't do the exchange on Dec 18",
          status: "in_progress",
          updates: [{ title: "Nine replies, three still out", body: "Two people prefer the 17th; nobody has a hard conflict on either date.", by: "Claude" }],
        },
        { want: "Collect $12 each for Priya's gift", dueInDays: 5, details: "Dana ticks it off once all twelve have paid." },
        { want: "Pick the exchange date and spending limit", status: "done", doneNote: "Dec 18 after lunch, $25 limit." },
        { want: "Book the small conference room for the party" },
        { want: "Get a card everyone can sign for Priya" },
      ],
    },
    research: {
      format: "research",
      title: "Exchange questions",
      look: "doc",
      items: [
        {
          want: "How do we include the two teammates who work remotely?",
          accepted: 0,
          updates: [
            { title: "Ship their gifts straight to them", body: "Most stores on the ideas list ship gift-wrapped to another address; open them together on a video call.", links: ["https://example.com/gift-shipping"], by: "Claude" },
            { title: "Give them e-gift cards instead", body: "Instant delivery, though it's less of a surprise.", links: ["https://example.org/e-gifts"], by: "ChatGPT" },
          ],
        },
        {
          want: "What's a fair way to draw names without an app?",
          status: "in_progress",
          updates: [{ title: "Names in a hat, with a redraw rule", body: "If someone draws their own name, everyone draws again. Still checking a simple fix for people on the same team.", links: ["https://example.com/name-draw"], by: "Gemini" }],
        },
        { want: "Can the team gift come out of the office party budget?" },
      ],
    },
  },
} satisfies Persona;
