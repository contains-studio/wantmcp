import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "gift-registry-from-any-store",
  order: 34,
  group: "events",
  title: "Build a gift registry list from any store",
  description:
    "Write down what you'd love for your new home. Your AI agent finds the exact item at stores you choose, with price and link, and you share one list to read.",
  h1: "A registry list from any store",
  intro: "List what you'd actually use, then ask your agent to find each one at the stores you like. Share the link so people can read it.",
  label: "Registry list, any store",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Our first kitchen",
      description: "The things we'd use every week, from the stores we like.",
      look: "sheet",
      items: [
        {
          want: "A burr coffee grinder that does espresso and drip",
          details: "Quiet enough for 6 am. Under $200.",
          products: [
            { title: "Conical burr grinder, 40 settings", store: "Copperline Kitchen", price: "149.00", earlier: ["169.00", "159.00"], by: "Claude", image: "grinder", note: "Has a separate dial for fine espresso settings." },
            { title: "Flat burr grinder, single-dose hopper", store: "Morning Ritual Coffee Co.", price: "189.00", by: "Gemini", image: "grinder" },
          ],
        },
        {
          want: "A 5.5-quart enameled Dutch oven, any dark color",
          products: [
            { title: "Enameled cast-iron Dutch oven, 5.5 qt, navy", store: "Hearth & Table", price: "119.95", was: "159.95", by: "ChatGPT" },
            { title: "Round Dutch oven, 6 qt, charcoal", store: "Maple Street Home", price: "94.00", by: "Claude", note: "Half a quart bigger; the lid knob is oven-safe to 500°F." },
          ],
        },
        {
          want: "Eight everyday dinner plates, stoneware, oven-safe",
          products: [
            { title: "Stoneware dinner plate, 11 in, set of 4, oat", store: "Fieldstone", price: "58.00", by: "Muse", note: "Two sets for eight." },
            { title: "Speckled stoneware plates, set of 8", store: "Paper & Pine Studio", price: "96.00", was: "120.00", by: "Gemini" },
          ],
        },
        {
          want: "A small espresso machine with a steam wand",
          products: [
            { title: "Compact espresso machine, 15 bar, steam wand", store: "Harbor Electronics", price: "299.00", was: "349.00", by: "Claude", image: "espresso" },
            { title: "Single-boiler espresso maker, stainless", store: "Morning Ritual Coffee Co.", price: "379.00", by: "Codex", image: "espresso" },
          ],
        },
        {
          want: "A knife block set we already chose",
          bought: 0,
          products: [{ title: "Six-piece knife set with walnut block", store: "Hearth & Table", price: "210.00", by: "ChatGPT", note: "We bought this one ourselves during the fall sale." }],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Registry: getting the list ready",
      look: "today",
      items: [
        {
          want: "Ask the agent to fill in a second store for every item",
          details: "So people have a choice of where to shop.",
          status: "in_progress",
          updates: [{ title: "Second store added for four of five", body: "The knife set is only sold at one store, so it keeps one link.", by: "Claude" }],
        },
        {
          want: "Ask for fresh prices before the invitations go out",
          dueInDays: 10,
          details: "Each new price lands under the old one, so we can see what changed since we added it.",
        },
        { want: "Add a few items under $40 so there's a range" },
        { want: "Decide whether the list is public or private", status: "done", doneNote: "Public, so the link works for anyone. No addresses or personal details on it." },
      ],
    },
    research: {
      format: "research",
      title: "Registry: before we add it",
      look: "doc",
      items: [
        {
          want: "Is a 5.5-quart Dutch oven big enough for two, with friends over sometimes?",
          accepted: 0,
          updates: [
            { title: "Yes: fits a whole chicken or soup for six", body: "Most recipe sites size 5 to 6 quarts for four to six servings, which covers two people with leftovers or a small dinner party.", links: ["https://example.com/dutch-oven-sizes"], by: "Gemini" },
            { title: "Go to 7 quarts only for big batches", body: "Larger pots help with stock and bread for a crowd, but weigh about four pounds more.", links: ["https://example.org/cookware-guide"], by: "Claude" },
          ],
        },
        {
          want: "What are the return windows at the stores on our list?",
          status: "in_progress",
          updates: [{ title: "Three stores checked: 30 to 90 days", body: "Copperline Kitchen gives 90 days with a gift receipt. Fieldstone and Hearth & Table give 30. Two stores still to check.", links: ["https://example.com/returns-compared"], by: "ChatGPT" }],
        },
        { want: "Which espresso machine is easier to descale?" },
      ],
    },
  },
} satisfies Persona;
