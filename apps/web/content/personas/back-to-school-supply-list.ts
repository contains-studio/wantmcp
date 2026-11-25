import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "back-to-school-supply-list",
  order: 19,
  group: "home",
  title: "Back-to-school supply list with prices from two stores",
  description:
    "Paste the school supply list, add sizes, and ask your AI agent for prices from two stores each. Keep it private and reuse the sizes next fall.",
  h1: "Get the school supply list done in one evening",
  intro: "Type in the teacher's list and each child's sizes. Ask your agent for prices, and buy the whole list before the first day.",
  label: "Back-to-school shopping",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Third grade supply list",
      description: "From the teacher's list. Private.",
      look: "sheet",
      items: [
        {
          want: "24 #2 pencils, pre-sharpened",
          bought: 0,
          products: [
            { title: "Yellow #2 pencils, 24-pack, sharpened", store: "Penny Lane Office", price: "3.49", was: "4.99", by: "Claude" },
            { title: "Pre-sharpened pencils, 30-pack", store: "Schoolhouse Supply Co.", price: "4.25", by: "ChatGPT" },
          ],
        },
        {
          want: "Four wide-ruled spiral notebooks, different colors",
          products: [
            { title: "Wide-ruled 70-sheet notebook, 4-pack", store: "Schoolhouse Supply Co.", price: "5.96", earlier: ["7.96", "6.96"], by: "Gemini" },
            { title: "Spiral notebooks, wide-ruled, single", store: "Penny Lane Office", price: "1.25", by: "Claude", note: "Price per notebook, limit 10." },
          ],
        },
        {
          want: "Sneakers for gym, kids' size 2, velcro",
          products: [
            { title: "Kids' runner, hook-and-loop, size 2", store: "Stride Shoe Barn", price: "34.99", was: "44.99", by: "Codex", image: "shoe" },
            { title: "Court sneaker, kids' 2, white", store: "Trailhead Outfitters", price: "39.00", by: "ChatGPT", coupon: "BTS10" },
          ],
        },
        {
          want: "A backpack that fits a 2-inch binder",
          products: [
            { title: "Kids' backpack, 16 in, padded straps", store: "Trailhead Outfitters", price: "29.99", by: "Claude" },
            { title: "School backpack with bottle pocket, 17 in", store: "Stride Shoe Barn", price: "24.50", was: "32.00", by: "Grok" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before the first day",
      look: "today",
      items: [
        {
          want: "Get prices on the whole supply list",
          status: "in_progress",
          updates: [{ title: "18 of 22 items priced", body: "Four items need the exact brand the teacher named; asked the school office.", by: "Claude" }],
        },
        { want: "Label everything with names", dueInDays: 6 },
        { want: "Measure feet for new sneakers", status: "done", doneNote: "Kids' 2 now, up from 13 in the spring." },
        { want: "Drop off the shared classroom supplies at open house" },
      ],
    },
    research: {
      format: "research",
      title: "School questions",
      look: "doc",
      items: [
        {
          want: "Does our state have a sales tax holiday for school supplies in August?",
          accepted: 0,
          updates: [
            { title: "Yes, the second weekend of August", body: "The state revenue department lists the dates and which items qualify, including clothing under a price limit.", links: ["https://example.org/tax-holiday"], by: "Claude" },
            { title: "Supplies count, backpacks have a cap", body: "Backpacks qualify only under a set price; the full list is on the same page.", links: ["https://example.org/tax-holiday/items"], by: "Gemini" },
          ],
        },
        {
          want: "Which calculator does the seventh-grade math class require?",
          status: "in_progress",
          updates: [{ title: "A scientific calculator, no graphing", body: "The teacher's syllabus from last year asks for any basic scientific model.", links: ["https://example.com/math-syllabus"], by: "ChatGPT" }],
        },
        { want: "Are reusable water bottles allowed in class?" },
      ],
    },
  },
} satisfies Persona;
