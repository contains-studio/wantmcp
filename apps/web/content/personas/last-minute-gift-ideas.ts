import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "last-minute-gift-ideas",
  order: 6,
  group: "gifts",
  title: "Last-minute gift ideas that arrive in time",
  description:
    "Write who it's for, the budget and the day it has to arrive. Your agent posts options with each store's delivery date, and the list keeps them for next time.",
  h1: "A good gift, in time for the day",
  intro: "Put the date in the want. Your agent finds gifts from stores that say they'll deliver before it, and the ideas stay on the list for next year.",
  label: "Gifts on a deadline",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Jess's birthday, Saturday",
      description: "Everything here has to arrive by Friday.",
      look: "sheet--birthday",
      items: [
        {
          want: "Something for a friend who climbs, under $50",
          details: "Has shoes and a harness. Arrive by Friday; no gift cards.",
          products: [
            { title: "Chalk bag with belt and refillable chalk ball", store: "Basecamp Gear", price: "32.00", by: "Claude", note: "Store says two-day shipping arrives Thursday if ordered by 2 p.m. today." },
            { title: "Hangboard for doorway training", store: "Summit Supply Co.", price: "49.95", was: "64.95", by: "ChatGPT", note: "Delivery estimate is Friday to Monday, so it may miss the day." },
            { title: "Climbing guidebook for the local crag", store: "Trailhead Outfitters", price: "29.95", by: "Claude", note: "In stock for pickup today." },
          ],
        },
        {
          want: "A card and wrapping that won't look rushed",
          bought: 0,
          products: [
            { title: "Letterpress birthday card, mountain print", store: "Paper Lantern", price: "6.50", by: "Gemini" },
            { title: "Recycled kraft gift wrap with twine", store: "Paper Lantern", price: "9.00", by: "Gemini" },
          ],
        },
        {
          want: "Backup plan: an experience I can book online",
          products: [
            { title: "Two-visit day pass, bouldering gym", store: "Crux Climbing Gym", price: "44.00", by: "Grok", note: "Sent by email as a printable voucher." },
            { title: "Intro to lead climbing class, gift voucher", store: "Crux Climbing Gym", price: "75.00", by: "Grok" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before Saturday",
      look: "today--birthday",
      items: [
        {
          want: "Find out which store can actually deliver by Friday",
          status: "in_progress",
          updates: [{ title: "Basecamp Gear says Thursday if ordered today", body: "Summit Supply's estimate runs into Monday. The guidebook can be picked up this afternoon.", links: ["https://example.com/shipping-cutoff"], by: "Claude" }],
        },
        { want: "Place the order before the 2 p.m. cutoff", dueInDays: 0 },
        { want: "Get Jess's new address from Sam", status: "done", doneNote: "Got it, apartment 4B." },
        { want: "Write the card" },
      ],
    },
    research: {
      format: "research",
      title: "Will it get there?",
      look: "doc--birthday",
      items: [
        {
          want: "Does two-day shipping count Saturday as a delivery day?",
          accepted: 0,
          updates: [
            { title: "Not at Basecamp Gear: business days only", body: "Its shipping page counts Monday to Friday, so an order today lands Thursday, not Saturday.", links: ["https://example.com/basecamp-shipping"], by: "Claude" },
            { title: "Depends on the carrier the store picks", body: "Some carriers deliver Saturdays in cities; the store page doesn't say which one it uses.", links: ["https://example.org/carriers"], by: "ChatGPT" },
          ],
        },
        {
          want: "Can I pick up the guidebook today?",
          status: "in_progress",
          updates: [{ title: "The downtown store shows two in stock", body: "Pickup is ready about two hours after ordering online; still checking their weekday closing time.", links: ["https://example.com/store-pickup"], by: "Gemini" }],
        },
        { want: "Is a gym day pass a thoughtful gift or a cop-out?" },
      ],
    },
  },
} satisfies Persona;
