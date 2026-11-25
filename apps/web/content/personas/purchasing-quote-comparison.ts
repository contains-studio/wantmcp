import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "purchasing-quote-comparison",
  order: 45,
  group: "work",
  title: "Compare supplier quotes with dated, sourced prices",
  description:
    "Put a requisition on a private list. Your AI agents add comparable options from several suppliers, and each price shows the date it was checked.",
  h1: "Comparable options, each price dated",
  intro: "Describe what the department needs. Your agents post options from several suppliers with links, and every price shows when it was checked.",
  label: "Purchasing comparisons",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Req: finance floor refresh",
      description: "Private. Unit prices; quantities in each want.",
      look: "sheet",
      items: [
        {
          want: "27-inch QHD monitors, height-adjustable stand, quantity 40",
          details: "3-year warranty with advance replacement. USB-C preferred.",
          products: [
            { title: "ProView 27 QHD, USB-C, 3-yr advance exchange", store: "Corridor Business IT", price: "248.00", earlier: ["262.00", "255.00"], by: "Claude", image: "monitor", checkedHoursAgo: 4 },
            { title: "Workline 27 QHD, HAS stand", store: "Tristate Tech Supply", price: "231.50", was: "259.00", by: "ChatGPT", image: "monitor-b", note: "Warranty is 3 years return-to-depot, not advance exchange." },
            { title: "OfficeVue 27 QHD, USB-C hub", store: "Bluestem Technology", price: "264.99", by: "Gemini", image: "monitor", coupon: "VOLUME40" },
          ],
        },
        {
          want: "USB-C docking stations, dual display, quantity 40",
          products: [
            { title: "Dual 4K USB-C dock, 100W", store: "Corridor Business IT", price: "179.00", by: "Codex" },
            { title: "Universal USB-C dock, 96W", store: "Tristate Tech Supply", price: "164.00", was: "189.00", by: "Claude" },
          ],
        },
        {
          want: "Full-size wired keyboards, quantity 40",
          bought: 0,
          products: [
            { title: "Quiet full-size keyboard, USB", store: "Bluestem Technology", price: "24.75", by: "ChatGPT", image: "keyboard" },
            { title: "Spill-resistant keyboard, USB", store: "Corridor Business IT", price: "27.40", by: "Claude", image: "keyboard" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Requisition steps",
      look: "tracker",
      items: [
        {
          want: "Request written quotes from the top two monitor suppliers",
          status: "in_progress",
          updates: [{ title: "Quote request drafted with specs and quantity", body: "Same wording for both so the replies compare line by line. Ready for you to send.", by: "Claude" }],
        },
        {
          want: "Confirm the budget line with finance before the 15th",
          dueInDays: 5,
        },
        { want: "Get the spec signed off by the floor manager", status: "done", doneNote: "Approved by email; USB-C made required." },
        { want: "Check delivery lead times for 40 units against the move date" },
      ],
    },
    research: {
      format: "research",
      title: "Supplier questions",
      look: "doc",
      items: [
        {
          want: "Which suppliers offer advance-exchange warranty on the monitors?",
          accepted: 0,
          updates: [
            {
              title: "Corridor and Bluestem do; Tristate is return-to-depot",
              body: "From each supplier's warranty page for the listed models.",
              links: ["https://example.com/corridor/warranty", "https://example.org/bluestem/support"],
              by: "Claude",
            },
            {
              title: "Tristate sells an advance-exchange upgrade for $18 a unit",
              body: "Listed as an add-on at checkout, not on the product page.",
              links: ["https://example.com/tristate/warranty-upgrade"],
              by: "Gemini",
            },
          ],
        },
        {
          want: "Do any of the three offer volume pricing at 40 units?",
          status: "in_progress",
          updates: [{ title: "Bluestem posts a code for 25 or more", body: "The other two say to ask for a quote; their posted prices are single-unit.", links: ["https://example.org/bluestem/volume"], by: "ChatGPT" }],
        },
        { want: "What is each supplier's return window for unopened units?" },
      ],
    },
  },
} satisfies Persona;
