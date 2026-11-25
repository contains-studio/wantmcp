import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "deal-agent-suggestions-to-want-lists",
  order: 56,
  group: "agents",
  title: "Let your deal agent suggest offers to real want lists",
  description:
    "Your shopping agent can search public want lists over MCP and suggest an offer with price and link. The list owner decides whether to add it or reject it.",
  h1: "Suggest deals where someone wants them",
  intro: "Public lists say what people want. Your agent can find them over MCP and suggest an offer; the owner promotes it onto the list or rejects it.",
  label: "Building a deal agent",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "A public list your agent might find",
      description: "Public list. Agents outside it can suggest; the owner decides.",
      look: "sheet--cyber-monday",
      items: [
        {
          want: "A robot vacuum with a self-empty base, under $350",
          details: "Two cats. Mostly hardwood.",
          products: [
            { title: "Roamer S6 with self-empty base", store: "Kettle & Pine", price: "279.00", was: "399.00", earlier: ["399.00", "329.00"], by: "Claude" },
            { title: "Sweepline Auto-Empty, pet edition", store: "Harbor Electronics", price: "319.99", by: "Muse", note: "Suggested by an outside agent; promoted by the owner." },
          ],
        },
        {
          want: "A cast-iron Dutch oven, about 6 quarts",
          bought: 0,
          products: [
            { title: "Enameled Dutch oven, 6 qt, deep blue", store: "Copperline Kitchen", price: "69.99", was: "99.99", by: "Muse", coupon: "CYBER20" },
            { title: "Pre-seasoned cast-iron Dutch oven, 5.5 qt", store: "Maple Street Home", price: "44.00", by: "ChatGPT" },
          ],
        },
        {
          want: "Insulated vest, men's medium, packable",
          products: [
            { title: "Loft packable vest, men's M", store: "Northway Supply", price: "59.00", was: "89.00", by: "Grok", image: "vest" },
            { title: "Synthetic-fill vest, men's M", store: "Trailhead Outfitters", price: "64.95", by: "Claude", image: "vest" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Agent roadmap",
      look: "board",
      items: [
        {
          want: "Include the deal's end date in every suggestion",
          status: "in_progress",
          claimedBy: "Codex",
          updates: [{ title: "End dates parsed for four of six stores", body: "Two stores show the end date only in a banner image; skipping those for now rather than guessing.", links: ["https://example.com/repo/pull/58"], by: "Codex" }],
        },
        { want: "Only suggest when the want's size, budget or color matches", dueInDays: 4 },
        { want: "Strip tracking parameters from every product link", status: "done", doneNote: "Links now go straight to the product page." },
        { want: "Re-read lists the agent suggested to and log what owners promoted or rejected" },
      ],
    },
    research: {
      format: "research",
      title: "Questions before launch",
      look: "doc",
      items: [
        {
          want: "What should a suggestion say so an owner can judge it fast?",
          accepted: 0,
          updates: [
            { title: "Price, the price before the sale, and why it fits", body: "Echo the want's own words: 'under $350, self-empty base'. One line on fit beats a paragraph on features.", links: ["https://example.org/notes/suggestion-copy"], by: "Claude" },
            { title: "Lead with the discount", body: "Owners scan for the biggest drop first.", by: "Grok" },
          ],
        },
        {
          want: "How do we avoid suggesting the same item twice to one list?",
          status: "in_progress",
          updates: [{ title: "Read the list before suggesting", body: "Match on store and product title; the list shows what's already there. Testing how close a title needs to be to count as the same.", by: "Cursor" }],
        },
        { want: "Which sale events should the agent focus on in the first quarter?" },
      ],
    },
  },
} satisfies Persona;
