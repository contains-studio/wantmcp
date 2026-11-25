import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "co-parenting-shared-list",
  order: 20,
  group: "home",
  title: "A shared list for co-parents in two homes",
  description:
    "One private list for what a child needs across two homes: who is getting it, what it cost and when it was done. Either parent can add and tick things off.",
  h1: "Keep a child's needs on one list",
  intro: "Write down what is needed, who is handling it and what it cost. Both homes see the same list, with or without an agent.",
  label: "Co-parenting across two homes",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Things to get",
      description: "Private. Note which home it goes to.",
      look: "sheet",
      items: [
        {
          want: "Winter coat, kids' size 10, waterproof",
          bought: 0,
          products: [
            { title: "Insulated parka, kids' 10, navy", store: "Northway Supply", price: "64.99", was: "89.99", by: "Claude" },
            { title: "Waterproof shell with fleece liner, kids' 10", store: "Trailhead Outfitters", price: "72.00", by: "ChatGPT" },
          ],
        },
        {
          want: "Soccer cleats, youth size 4",
          products: [
            { title: "Youth firm-ground cleats, size 4", store: "Stride Shoe Barn", price: "39.99", earlier: ["49.99", "44.99"], by: "Gemini", image: "shoe" },
            { title: "Molded cleats, youth 4, black", store: "Fieldhouse Sports", price: "34.50", by: "Claude" },
          ],
        },
        {
          want: "A second tablet charger and headphones, one set for each home",
          products: [
            { title: "USB-C charger with 6 ft cable", store: "Harbor Electronics", price: "19.99", by: "Codex" },
            { title: "Kids' volume-limited headphones", store: "Circuit Corner", price: "24.99", was: "29.99", by: "Grok", coupon: "KIDS5" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Coming up",
      look: "today",
      items: [
        {
          want: "Sign up for spring soccer",
          status: "in_progress",
          updates: [{ title: "Registration opens Monday", body: "The fee is $85; the form asks for both addresses and a medical release.", by: "Claude" }],
        },
        { want: "Book the dentist cleaning", dueInDays: 10, details: "Either Tuesday or Thursday after school works." },
        { want: "Buy the gym uniform", status: "done", doneNote: "Bought for $34. Shirt and shorts are in the backpack." },
        { want: "Send the science fair poster board with the backpack on Sunday" },
      ],
    },
    research: {
      format: "research",
      title: "To look into",
      look: "doc",
      items: [
        {
          want: "Which day camps cover both weeks of spring break?",
          accepted: 0,
          updates: [
            { title: "Two camps run both weeks", body: "The community center and the science museum both run full-day camps for both weeks; the museum's fills first.", links: ["https://example.org/spring-camps"], by: "Claude" },
            { title: "One camp offers week-by-week sign-up", body: "The rec center lets you book each week separately, which suits a split schedule.", links: ["https://example.com/rec-center-camp"], by: "Gemini" },
          ],
        },
        {
          want: "Does the school send report cards to both addresses?",
          status: "in_progress",
          updates: [{ title: "Yes, if both are on file", body: "The district's records page says a second mailing address can be added through the front office.", links: ["https://example.org/district-records"], by: "ChatGPT" }],
        },
        { want: "What size bike fits a ten-year-old who is 54 inches tall?" },
      ],
    },
  },
} satisfies Persona;
