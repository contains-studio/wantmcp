import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "rental-property-supplies-and-repairs",
  order: 27,
  group: "moving",
  title: "Restock and repair lists for rental units",
  description:
    "One private list per rental for supplies and repairs. Your AI agent prices replacements and posts updates, and cleaners you invite add what broke.",
  h1: "Keep every rental stocked and in repair",
  intro: "Make one private list per unit. Your agent prices replacements and posts updates on repairs, and a cleaner you invite can add what broke during a turnover.",
  label: "Rental restocking and repairs",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Unit 2: restock",
      description: "Private: one list per unit, no addresses.",
      look: "sheet",
      items: [
        {
          want: "Electric kettles, the same model for all four units, under $30",
          products: [
            { title: "1.7 L stainless kettle, auto shut-off", store: "Brightside Home Goods", price: "24.99", was: "32.99", by: "Claude", note: "Same model as Units 1 and 3." },
            { title: "1.7 L glass kettle", store: "Hostwell Supply", price: "27.50", by: "ChatGPT" },
          ],
        },
        {
          want: "White bath towel sets, hotel weight, six sets",
          products: [
            { title: "600 GSM cotton bath towel set", store: "Hostwell Supply", price: "21.00", earlier: ["26.00", "23.50"], by: "Gemini" },
            { title: "Bulk white bath towels, 12-pack", store: "Linen Depot Direct", price: "119.00", coupon: "HOST15", by: "Claude" },
          ],
        },
        {
          want: "Smoke alarm with a 10-year sealed battery",
          bought: 0,
          products: [
            { title: "10-year sealed smoke alarm", store: "Safehouse Hardware", price: "22.97", by: "Codex" },
            { title: "Combination smoke and CO alarm", store: "Safehouse Hardware", price: "39.99", was: "44.99", by: "Claude" },
          ],
        },
        {
          want: "Waterproof queen mattress protectors, two",
          products: [
            { title: "Waterproof queen protector, quiet backing", store: "Linen Depot Direct", price: "29.99", by: "Grok" },
            { title: "Cotton terry queen protector", store: "Brightside Home Goods", price: "34.50", was: "42.00", by: "ChatGPT" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Unit 2: repairs",
      look: "tracker",
      items: [
        {
          want: "Replace the shower door seal",
          status: "in_progress",
          updates: [{ title: "Seal for 3/8-inch glass found for $18", body: "Waiting on you: approve the order and pick a day for the handyman.", links: ["https://example.com/shower-seal"], by: "Claude" }],
        },
        { want: "Test the smoke alarms before the next booking", dueInDays: 3 },
        { want: "Replace the cracked outlet cover in the kitchen", details: "Added by the cleaner after Sunday's checkout." },
        { want: "Deep-clean the oven", status: "done", doneNote: "Done during Tuesday's turnover." },
      ],
    },
    research: {
      format: "research",
      title: "Rules and suppliers",
      look: "doc",
      items: [
        {
          want: "How often does the city require rental smoke alarms to be replaced?",
          accepted: 0,
          updates: [
            { title: "Every 10 years, under the city fire code", body: "The code section and the fire department's landlord page both say 10 years from the date on the alarm.", links: ["https://example.org/fire-code", "https://example.org/landlord-page"], by: "Claude" },
            { title: "Every 5 years", body: "From a general home-safety article, not the city's code.", links: ["https://example.com/safety-article"], by: "ChatGPT" },
          ],
        },
        {
          want: "Which linen suppliers offer net-30 terms to small hosts?",
          status: "in_progress",
          updates: [{ title: "Two so far, both need a business account", body: "Hostwell Supply offers net-30 after three orders; Linen Depot Direct after a credit check.", links: ["https://example.com/net-30"], by: "Gemini" }],
        },
        { want: "Is a keypad lock worth it for self check-in?" },
      ],
    },
  },
} satisfies Persona;
