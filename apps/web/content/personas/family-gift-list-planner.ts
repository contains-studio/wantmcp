import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "family-gift-list-planner",
  order: 5,
  group: "gifts",
  title: "A private gift list for everyone you buy for",
  description:
    "One row per person, with sizes, hints and a budget. Your agent adds ideas with prices, you mark what's bought, and a private list keeps the surprises.",
  h1: "Every gift, one private list",
  intro: "Write who you're buying for, what they're into and what you'll spend. Make the list private first, then ask your agent for ideas and tick each one off as you buy.",
  label: "Buying for the whole family",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Holiday gifts",
      description: "Private, so nobody on it can peek.",
      look: "sheet--christmas",
      items: [
        {
          want: "Mom: something for the garden, about $60",
          details: "She has every hand tool. Mentioned wanting to grow herbs inside over winter.",
          products: [
            { title: "Countertop herb garden with grow light", store: "Greenhouse & Co.", price: "59.99", was: "79.99", by: "Claude" },
            { title: "Ceramic herb planter set of three", store: "Maple Street Home", price: "44.00", by: "ChatGPT", note: "Pairs with a seed kit for $12 more." },
          ],
        },
        {
          want: "Maya, 9: art supplies she can't already have",
          details: "Loves drawing animals. Has markers and colored pencils.",
          products: [
            { title: "Watercolor travel set with water brushes", store: "Paper Lantern Art Supply", price: "26.50", by: "Gemini" },
            { title: "Learn-to-draw animals kit with sketchbook", store: "Bramble Toys", price: "22.99", was: "29.99", by: "Claude" },
          ],
        },
        {
          want: "Grandpa: warm slippers, size 10",
          bought: 0,
          products: [
            { title: "Shearling-lined moccasin slippers, men's 10", store: "Hearthside Goods", price: "54.00", was: "68.00", by: "ChatGPT" },
            { title: "Memory foam slippers with rubber sole, men's 10", store: "Northway Supply", price: "34.95", by: "Claude" },
          ],
        },
        {
          want: "Uncle Ray: anything for his new smoker, under $50",
          products: [
            { title: "Wireless meat thermometer, two probes", store: "Ember & Oak", price: "42.99", earlier: ["49.99"], by: "Grok" },
            { title: "Wood chip sampler, six flavors", store: "Ember & Oak", price: "29.00", by: "Claude" },
            { title: "Heat-resistant grill gloves", store: "Corner Hardware", price: "18.49", by: "Codex" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Gift jobs",
      look: "today",
      items: [
        {
          want: "Get three ideas each for the four cousins",
          status: "in_progress",
          updates: [{ title: "Ideas posted for two of four", body: "Added picks for Leo and Sana within $30 each. Waiting on ages for the twins.", by: "Claude" }],
        },
        { want: "Order anything that ships from out of state", dueInDays: 9 },
        { want: "Make the gift list private", status: "done", doneNote: "Switched to private before adding a single name." },
        { want: "Buy wrapping paper, tape and gift tags" },
      ],
    },
    research: {
      format: "research",
      title: "Gift questions",
      look: "doc",
      items: [
        {
          want: "Is a watercolor set right for a 9-year-old?",
          accepted: 0,
          updates: [
            { title: "Yes, the travel sets with water brushes are", body: "They're less messy than tubes and the kits are labeled for ages 8 and up.", links: ["https://example.com/kids-watercolor"], by: "Gemini" },
            { title: "A drawing kit may land better", body: "If she mostly draws with pencils, a guided sketch kit builds on what she already enjoys.", links: ["https://example.org/drawing-kits"], by: "ChatGPT" },
          ],
        },
        {
          want: "Which wireless thermometers work without a phone app?",
          status: "in_progress",
          updates: [{ title: "The two-probe one has a base display", body: "The base shows both temperatures, so the app is optional. Still checking the other two.", links: ["https://example.com/thermometer-manual"], by: "Grok" }],
        },
        { want: "What's a good gift for someone who says they want nothing?" },
      ],
    },
  },
} satisfies Persona;
