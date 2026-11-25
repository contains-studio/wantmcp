import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "new-baby-essentials-list",
  order: 18,
  group: "home",
  title: "A baby essentials list with sources you can check",
  description:
    "Keep baby gear on a private list. Your AI agent adds options with store, price and link, and answers safety questions with sources you can check yourself.",
  h1: "Get ready for a baby, one list",
  intro: "Write down what you need and the questions you have. Your agent adds options and points to the official sources, so you can check the answers yourself.",
  label: "Getting ready for a baby",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Before the baby arrives",
      description: "Private list, shared with the people we invite.",
      look: "sheet",
      items: [
        {
          want: "A crib with a firm, fitted mattress",
          details: "New, not second-hand.",
          products: [
            { title: "Convertible crib, solid wood, natural", store: "Little Acorn Nursery", price: "289.00", was: "349.00", by: "Claude", note: "Listing says it meets the current federal crib standard; check the model on the recall search before buying." },
            { title: "Firm crib mattress, waterproof cover", store: "Bluebird Baby", price: "119.99", by: "Gemini" },
          ],
        },
        {
          want: "Rear-facing infant car seat that fits a compact sedan",
          products: [
            { title: "Infant car seat with base, 4 to 35 lb", store: "Bluebird Baby", price: "199.99", earlier: ["229.99", "219.99"], by: "ChatGPT" },
            { title: "Lightweight infant seat, extra base sold separately", store: "Wagon & Wren", price: "169.00", by: "Claude" },
          ],
        },
        {
          want: "A stroller that folds with one hand",
          products: [
            { title: "Compact travel stroller, 15 lb", store: "Wagon & Wren", price: "249.00", was: "299.00", by: "Codex" },
            { title: "Full-size stroller, car seat adapter included", store: "Little Acorn Nursery", price: "329.00", by: "Gemini", coupon: "WELCOME15" },
          ],
        },
        {
          want: "Newborn diapers, two boxes",
          bought: 0,
          products: [
            { title: "Newborn diapers, 128 count", store: "Corner Pantry Wholesale", price: "34.99", by: "Claude" },
            { title: "Plant-based newborn diapers, 120 count", store: "Bluebird Baby", price: "42.00", by: "Grok" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Getting the house ready",
      look: "today",
      items: [
        {
          want: "Sort the hand-me-downs we were given",
          status: "in_progress",
          updates: [{ title: "Clothes sorted by size", body: "Two bags of 0 to 3 months, one of 3 to 6. The bouncer's model is on the research list to check for recalls.", by: "Claude" }],
        },
        { want: "Install the car seat and have the fit checked", dueInDays: 14, details: "Find a certified technician nearby." },
        { want: "Wash the first set of clothes and sheets", status: "done", doneNote: "Done with fragrance-free detergent." },
        { want: "Invite the people helping to the list" },
      ],
    },
    research: {
      format: "research",
      title: "Questions, with sources",
      look: "doc",
      items: [
        {
          want: "Which infant car seats fit a 2019 compact sedan?",
          accepted: 0,
          updates: [
            { title: "Both seats on the list, per the makers' fit guides", body: "Each maker publishes a vehicle fit list; the sedan appears on both. A certified technician can confirm the install.", links: ["https://example.com/fit-guide", "https://example.org/find-a-technician"], by: "Claude" },
            { title: "The lighter seat may sit too upright", body: "The vehicle's manual limits the base angle; check its child-seat section before choosing.", links: ["https://example.org/vehicle-manual"], by: "ChatGPT" },
          ],
        },
        {
          want: "Has the hand-me-down bouncer been recalled?",
          status: "in_progress",
          updates: [{ title: "No recall found for that model number yet", body: "Searched the federal recall database by model number; check the label on the bouncer matches before using it.", links: ["https://example.org/recall-search"], by: "Gemini" }],
        },
        { want: "What do we actually need for the first two weeks?" },
      ],
    },
  },
} satisfies Persona;
