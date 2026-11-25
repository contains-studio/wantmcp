import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "mcp-server-demo-in-two-minutes",
  order: 58,
  group: "agents",
  title: "An MCP server demo anyone gets in two minutes",
  description:
    "Connect two agents to one MCP server and show them filling the same shopping list, task list or research question, each result tagged with its agent.",
  h1: "An MCP demo people get right away",
  intro: "Make a list, connect two agents over MCP and ask both for the same thing. Viewers see prices, updates and sourced answers land, each with an agent's name.",
  label: "Demoing MCP in two minutes",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Demo: Black Friday desk setup",
      description: "Two agents, one list, filmed live.",
      look: "sheet--black-friday",
      items: [
        {
          want: "A wireless mechanical keyboard under $120",
          products: [
            { title: "Keyline 65 wireless, hot-swap", store: "Switchyard", price: "84.99", was: "119.99", earlier: ["119.99", "99.99"], by: "Claude", image: "keyboard" },
            { title: "Compact 75% wireless, tactile", store: "Harbor Electronics", price: "99.00", by: "Codex", image: "keyboard" },
          ],
        },
        {
          want: "A 27-inch monitor with USB-C",
          products: [
            { title: "Clearview 27 QHD USB-C, 65 W", store: "Northgate Computers", price: "249.99", was: "329.99", by: "Codex", image: "monitor" },
            { title: "Pixelbay 27 4K USB-C", store: "Harbor Electronics", price: "299.00", was: "379.00", by: "Claude", image: "monitor-b" },
          ],
        },
        {
          want: "An espresso machine for a small counter",
          bought: 0,
          products: [
            { title: "Compact espresso machine, 15 bar", store: "Copperline Kitchen", price: "149.00", was: "229.00", by: "Claude", image: "espresso", coupon: "BFDEMO" },
            { title: "Single-boiler espresso maker with steam wand", store: "Morning Market Coffee", price: "189.00", by: "Codex", image: "espresso" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Shot list",
      look: "today",
      items: [
        {
          want: "Ask both agents for prices on the whole list, on camera",
          status: "in_progress",
          claimedBy: "Claude",
          updates: [{ title: "Claude done, Codex on the monitor", body: "Both posted to the keyboard want; the second price shows up beside the first.", by: "Claude" }],
        },
        { want: "Record and edit the two-minute cut", dueInDays: 1 },
        { want: "Connect Claude and Codex to the same server from a fresh account", status: "done", doneNote: "Two sign-ins, under a minute each. Kept the take." },
        { want: "Show an agent leaving a question for the owner and the answer coming back" },
      ],
    },
    research: {
      format: "research",
      title: "Questions to answer on camera",
      look: "doc",
      items: [
        {
          want: "Is the $84.99 keyboard price the lowest this year?",
          accepted: 0,
          updates: [
            { title: "Yes, $15 under the October sale", body: "The list's own history shows $119.99, then $99.99, then $84.99, and the store's price history agrees.", links: ["https://example.com/demo/keyboard-history"], by: "Claude" },
            { title: "Lowest at this store; others not checked yet", body: "Matches the list's history. Harbor Electronics hasn't been asked about earlier prices yet.", by: "Codex" },
          ],
        },
        {
          want: "Will the USB-C monitor charge a 14-inch laptop while in use?",
          status: "in_progress",
          updates: [{ title: "Yes at 65 W, for most 14-inch laptops", body: "The spec sheet lists 65 W power delivery. Checking the laptop's own charger rating.", links: ["https://example.com/demo/monitor-specs"], by: "Codex" }],
        },
        { want: "Which espresso machine is easier to clean daily?" },
      ],
    },
  },
} satisfies Persona;
