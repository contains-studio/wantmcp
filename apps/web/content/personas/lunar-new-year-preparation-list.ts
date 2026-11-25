import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "lunar-new-year-preparation-list",
  order: 14,
  group: "gifts",
  title: "Lunar New Year prep list with order-by dates",
  description:
    "Get ready for Lunar New Year in one shared list: food, gifts, cleaning and the reunion dinner. Your AI agent adds options and order-by dates when you ask.",
  h1: "Get ready for Lunar New Year early",
  intro: "List what to clean, buy, book and give before the eve. Ask your agent which orders need to go in early, and share the jobs with family.",
  label: "Lunar New Year preparations",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "New Year shopping",
      description: "Order early: shops and couriers slow down before the holiday.",
      look: "sheet",
      items: [
        {
          want: "A gift for the grandparents: good oolong tea and a small tea set",
          products: [
            { title: "High-mountain oolong, 150 g gift tin", store: "Jade Leaf Tea House", price: "38.00", was: "45.00", by: "Claude" },
            { title: "Porcelain tea set for two with tray", store: "Pearl River Home Goods", price: "54.99", earlier: ["64.99", "59.99"], by: "Gemini" },
          ],
        },
        {
          want: "Red envelopes, about 40",
          bought: 0,
          products: [
            { title: "Gold-foil red envelopes, pack of 50", store: "Lucky Lantern Paper", price: "8.99", by: "ChatGPT" },
            { title: "Embossed red envelopes, pack of 36", store: "Pearl River Home Goods", price: "11.50", by: "Claude" },
          ],
        },
        {
          want: "Mandarin oranges and a candy tray for visitors",
          products: [
            { title: "Mandarin oranges with leaves, 10 lb box", store: "Sunrise Asian Market", price: "24.99", by: "Codex", note: "In-store pickup only the week before the holiday." },
            { title: "Eight-section lacquer candy tray", store: "Lucky Lantern Paper", price: "19.99", was: "26.00", by: "Grok" },
          ],
        },
        {
          want: "Door decorations and couplets",
          products: [
            { title: "Paper-cut window decorations, set of 12", store: "Lucky Lantern Paper", price: "12.00", by: "Muse" },
            { title: "Red and gold door couplet set", store: "Sunrise Asian Market", price: "9.50", by: "Claude", coupon: "NEWYEAR5" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before the eve",
      look: "sections",
      items: [
        {
          want: "Reserve a table for the reunion dinner, 10 people",
          status: "in_progress",
          updates: [{ title: "Two restaurants with private rooms", body: "Both ask for a deposit to hold the room. Options and phone numbers are in the research list.", by: "Claude" }],
        },
        { want: "Place every online order two weeks before the holiday", dueInDays: 5 },
        { want: "Book train tickets home", status: "done", doneNote: "Booked for the Thursday before. Seats together." },
        { want: "Deep-clean the house before New Year's Eve", details: "Split the rooms between the four of us." },
      ],
    },
    research: {
      format: "research",
      title: "Things to find out",
      look: "doc",
      items: [
        {
          want: "What are the last order dates before couriers slow down?",
          accepted: 0,
          updates: [
            { title: "About ten days before for standard shipping", body: "The three stores on the list each post a holiday cutoff; the earliest is ten days before.", links: ["https://example.com/holiday-cutoffs"], by: "Claude" },
            { title: "Two weeks to be safe", body: "Courier notices for last year mention delays in the final week before the holiday.", links: ["https://example.org/courier-notice"], by: "Gemini" },
          ],
        },
        {
          want: "Which restaurants nearby have a private room for 10 on the eve?",
          status: "in_progress",
          updates: [{ title: "Golden Crane and Lotus Garden", body: "Both list a set dinner menu for the holiday and take reservations by phone.", links: ["https://example.com/golden-crane"], by: "ChatGPT" }],
        },
        { want: "Which dishes can be made two days ahead and still taste fresh?" },
      ],
    },
  },
} satisfies Persona;
