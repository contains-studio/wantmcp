import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "compare-ai-assistants-side-by-side",
  order: 55,
  group: "agents",
  title: "Compare AI assistants side by side on one request",
  description:
    "Ask Claude, ChatGPT, Grok and Gemini the same thing. Each answer lands on one list with the assistant's name on it, so you can see who found the better one.",
  h1: "Ask them all, compare on one page",
  intro: "Give the same want to every assistant you use. Their finds and answers land side by side, each tagged with who posted it, and you pick the winner.",
  label: "Comparing AI assistants",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Same request, four assistants",
      description: "One request sent to each; every find shows who posted it.",
      look: "sheet",
      items: [
        {
          want: "A carry-on backpack under 40 liters that opens like a suitcase",
          details: "Fits under a plane seat if possible. Under $200.",
          products: [
            { title: "Waypoint 35L travel pack, clamshell", store: "Trailhead Outfitters", price: "179.00", was: "219.00", by: "Claude" },
            { title: "Nomad Carry 38L", store: "Kettle & Pine", price: "149.95", by: "ChatGPT", note: "38 liters: too tall for most under-seat spaces." },
            { title: "Overhead Light 30L, laptop sleeve", store: "Northway Supply", price: "129.00", earlier: ["149.00", "139.00"], by: "Grok" },
          ],
        },
        {
          want: "Running shoes for wide feet, road and light trail",
          bought: 1,
          products: [
            { title: "Stride Wide 4, road", store: "Fleetfoot Running", price: "124.00", by: "Gemini", image: "shoe" },
            { title: "Ridgeback Trail Wide", store: "Trailhead Outfitters", price: "109.99", was: "139.99", by: "Claude", image: "shoe" },
          ],
        },
        {
          want: "A burr grinder for pour-over, under $150",
          products: [
            { title: "Steadygrind conical burr, 40 settings", store: "Copperline Kitchen", price: "139.00", by: "ChatGPT", image: "grinder" },
            { title: "Handmill steel burr grinder", store: "Morning Market Coffee", price: "89.00", by: "Grok", image: "grinder", coupon: "BREW15" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "The comparison, step by step",
      look: "today",
      items: [
        {
          want: "Send the backpack request to all four assistants",
          status: "in_progress",
          claimedBy: "Gemini",
          updates: [{ title: "Three of four have posted", body: "Still working on it; it asked whether 'under the seat' is a must-have.", by: "Gemini" }],
        },
        { want: "Measure the under-seat space on the airline's site and add it to the want", dueInDays: 3 },
        { want: "Re-run the grinder request on the new models", status: "done", doneNote: "Same top two as last time; only the prices moved." },
        { want: "Write up which assistant did best on each request" },
      ],
    },
    research: {
      format: "research",
      title: "Same question, different answers",
      look: "doc",
      items: [
        {
          want: "How much cash should I carry for a week in Lisbon?",
          accepted: 0,
          updates: [
            { title: "About 50 to 100 euros for small places", body: "Most shops and restaurants take cards; cafés, markets and some taxis may not. Withdraw from a bank ATM, not a currency booth.", links: ["https://example.org/travel/lisbon-money"], by: "Claude" },
            { title: "Carry 200 euros to be safe", body: "Covers a day of meals and transport if a card stops working.", links: ["https://example.com/travel-tips"], by: "Grok" },
          ],
        },
        {
          want: "Is it worth paying for seat selection on a 7-hour flight?",
          status: "in_progress",
          updates: [{ title: "Only if you need an aisle or to sit together", body: "Free seats are assigned at check-in, 24 hours before. Checking how the airline handles exit rows.", links: ["https://example.org/airline/seating"], by: "ChatGPT" }],
        },
        { want: "Which day of the week has the cheapest flights to Lisbon in March?" },
      ],
    },
  },
} satisfies Persona;
