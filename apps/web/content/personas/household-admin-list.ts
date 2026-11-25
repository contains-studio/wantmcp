import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "household-admin-list",
  order: 17,
  group: "home",
  title: "A household admin list your AI agent works through",
  description:
    "Renewals, quotes, forms and repairs on one private list. Your AI agent finds options and drafts messages, and leaves a clear question when it needs you.",
  h1: "Get the household admin off your mind",
  intro: "List the renewals, bookings and forms the home needs. Your agent does the looking up and drafting, and marks anything it is waiting on you for.",
  label: "Household admin",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "House upkeep buys",
      description: "Small things the house needs this season.",
      look: "sheet",
      items: [
        {
          want: "Replacement smoke alarms, 10-year sealed battery, three",
          products: [
            { title: "10-year sealed smoke alarm, 3-pack", store: "Keystone Hardware", price: "54.99", was: "69.99", by: "Claude" },
            { title: "Smoke and CO combo alarm, sealed battery", store: "Ridgeway Home Supply", price: "39.00", by: "Gemini", note: "Price is per alarm." },
          ],
        },
        {
          want: "Furnace filters, 16 x 25 x 1, MERV 11",
          bought: 0,
          products: [
            { title: "MERV 11 pleated filter, 6-pack", store: "Ridgeway Home Supply", price: "48.00", earlier: ["56.00", "52.00"], by: "Codex" },
            { title: "MERV 11 filter, 4-pack", store: "Keystone Hardware", price: "36.97", by: "ChatGPT" },
          ],
        },
        {
          want: "A cross-cut shredder for old statements",
          products: [
            { title: "12-sheet cross-cut shredder", store: "Office Row", price: "64.99", was: "89.99", by: "Claude" },
            { title: "8-sheet micro-cut shredder", store: "Harbor Electronics", price: "79.00", by: "Grok", coupon: "DESK10" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Household admin",
      look: "today",
      items: [
        {
          want: "Renew car insurance before the 14th",
          status: "in_progress",
          details: "Current premium is about $1,400 a year.",
          updates: [{ title: "Two quotes in, third needs the VIN", body: "Both quotes are lower for the same coverage. Waiting on you: the VIN from the registration card.", by: "Claude" }],
        },
        { want: "Renew both passports by mail", dueInDays: 21, details: "Expire in May; we fly in June." },
        { want: "Book the furnace service", status: "done", doneNote: "Booked for Tuesday morning, $129 flat fee." },
        { want: "Dispute the duplicate charge on the water bill" },
      ],
    },
    research: {
      format: "research",
      title: "Worth finding out",
      look: "doc",
      items: [
        {
          want: "Is it cheaper to bundle home and auto insurance?",
          accepted: 0,
          updates: [
            { title: "Yes, by about $180 a year at two insurers", body: "Both quotes include a multi-policy discount; the third insurer does not offer one.", links: ["https://example.com/bundle-quote"], by: "Claude" },
            { title: "Only if the home policy stays the same", body: "The bundled home policy has a higher deductible. Compare before switching.", links: ["https://example.org/policy-compare"], by: "ChatGPT" },
          ],
        },
        {
          want: "What do we need to renew a passport by mail?",
          status: "in_progress",
          updates: [{ title: "Form, old passport, photo and fee", body: "The State Department page lists who can renew by mail and the current fee.", links: ["https://example.org/passport-renewal"], by: "Gemini" }],
        },
        { want: "Does our homeowners policy cover a sump pump failure?" },
      ],
    },
  },
} satisfies Persona;
