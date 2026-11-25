import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "dorm-room-shopping-list",
  order: 22,
  group: "school",
  title: "A dorm room shopping list that stays on budget",
  description:
    "List what your dorm room needs before move-in. Your AI agent adds options with prices and links, and family can see exactly what is still left to get.",
  h1: "Set up your dorm room without overspending",
  intro: "Write down what the room needs. Ask your agent for options, tick things off as you buy them, and share the link so family can see what's left.",
  label: "Dorm room setup",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Dorm move-in: still to get",
      description: "Shared room, shared bathroom down the hall.",
      look: "sheet",
      items: [
        {
          want: "Twin XL sheets, two sets",
          details: "Regular twin sheets won't fit the dorm mattress.",
          products: [
            { title: "Jersey knit sheet set, twin XL", store: "Campus Corner Goods", price: "24.99", was: "34.99", by: "Claude" },
            { title: "Microfiber twin XL sheets, 2-pack", store: "Bramble Home", price: "29.00", by: "ChatGPT", note: "Two full sets for about the price of one elsewhere." },
          ],
        },
        {
          want: "A desk lamp with a USB port",
          bought: 0,
          products: [
            { title: "Clamp-on LED desk lamp with USB port", store: "Lantern & Co.", price: "19.99", by: "Gemini" },
            { title: "Gooseneck lamp, three brightness levels", store: "Northgate Office", price: "22.50", was: "27.00", by: "Claude" },
          ],
        },
        {
          want: "Mattress topper, twin XL, under $60",
          products: [
            { title: "3-inch memory foam topper, twin XL", store: "Restwell Outlet", price: "54.99", was: "89.99", earlier: ["89.99", "69.99"], by: "Claude", note: "Ships rolled in a box; give it a day to expand." },
            { title: "2-inch gel foam topper, twin XL", store: "Campus Corner Goods", price: "44.00", by: "Grok" },
          ],
        },
        {
          want: "Shower caddy and shower sandals",
          products: [
            { title: "Mesh shower caddy, 8 pockets", store: "Bramble Home", price: "12.99", by: "ChatGPT" },
            { title: "Quick-dry shower sandals", store: "Trailside Footwear", price: "14.00", coupon: "MOVEIN10", by: "Claude" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before move-in day",
      look: "today",
      items: [
        {
          want: "Find out what the dorm doesn't allow",
          status: "in_progress",
          updates: [{ title: "Housing rules: no candles or space heaters", body: "The housing page also limits microwaves to 700 watts and asks for surge-protected power strips only.", links: ["https://example.com/housing-rules"], by: "Claude" }],
        },
        { want: "Pick a move-in time slot", dueInDays: 4, updates: [{ title: "Morning slots on Saturday are still open", body: "Slots run every 30 minutes; carts are shared, so earlier is calmer.", links: ["https://example.org/move-in"], by: "Gemini" }] },
        { want: "Compare the cost of shipping three boxes to campus" },
        { want: "Agree with my roommate on the mini fridge and rug", status: "done", doneNote: "Jordan brings the fridge, I bring the rug." },
      ],
    },
    research: {
      format: "research",
      title: "Dorm questions",
      look: "doc",
      items: [
        {
          want: "Are my belongings covered in a dorm, or do I need my own renter's insurance?",
          accepted: 0,
          updates: [
            { title: "Often covered by a family homeowner's policy, with limits", body: "Many policies cover a student's things away at school up to a share of the total. Check the policy wording before buying a separate plan.", links: ["https://example.com/student-coverage"], by: "Claude" },
            { title: "Buy a student renter's plan", body: "Quotes $12 a month, but doesn't check whether existing coverage applies.", links: ["https://example.org/renters-plans"], by: "ChatGPT" },
          ],
        },
        {
          want: "Do I need deep-pocket sheets if I add a topper?",
          status: "in_progress",
          updates: [{ title: "Yes: look for 15-inch pockets", body: "The dorm mattress is 8 inches and the topper adds 3, so standard pockets will slip off.", by: "Gemini" }],
        },
        { want: "Is it cheaper to buy a mini fridge or rent one through the campus program?" },
      ],
    },
  },
} satisfies Persona;
