import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "private-list-your-assistant",
  order: 66,
  group: "anywhere",
  title: "A private list your own choice of AI assistant can use",
  description:
    "Task and research lists start private, and you can make a shopping list private too. Connect the assistant you prefer, and delete your account when you're done.",
  h1: "A private list for the assistant you choose",
  intro: "Task and research lists start private, and a shopping list can be made private. Connect the assistant you prefer; you can delete your account whenever you like.",
  label: "Private lists, your assistant",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Home office upgrades",
      description: "Made private before the first want went on.",
      look: "sheet",
      items: [
        {
          want: "A 27-inch monitor that doesn't need an app to change settings",
          products: [
            { title: "27-inch 1440p IPS monitor", store: "Quietdesk", price: "229.00", was: "279.00", by: "Claude", image: "monitor", note: "Brightness and inputs set from buttons on the monitor itself." },
            { title: "27-inch 4K monitor, USB-C", store: "Ashgrove Tech", price: "319.99", earlier: ["379.99", "339.99"], by: "Gemini", image: "monitor-b" },
          ],
        },
        {
          want: "A wired keyboard that works without installing software",
          bought: 0,
          products: [
            { title: "Full-size wired keyboard, plug and play", store: "Ashgrove Tech", price: "39.99", by: "Codex", image: "keyboard", note: "Product page says no driver or companion app is needed." },
            { title: "Tenkeyless mechanical keyboard, wired", store: "Quietdesk", price: "64.00", by: "Grok", image: "keyboard" },
          ],
        },
        {
          want: "A webcam cover and a privacy screen for a 14-inch laptop",
          products: [
            { title: "Sliding webcam covers, 3-pack", store: "Northlight Goods", price: "7.99", by: "ChatGPT" },
            { title: "Magnetic privacy filter, 14-inch", store: "Quietdesk", price: "32.00", was: "42.00", by: "Claude", coupon: "DESK8" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Personal admin, this month",
      look: "today",
      items: [
        {
          want: "Move the photo backup to a new storage plan",
          status: "in_progress",
          updates: [
            {
              title: "Three plans compared",
              body: "Two let you download everything as a single archive. The cheapest one doesn't, so it's out.",
              by: "OpenClaw",
            },
          ],
        },
        { want: "Renew the passport", details: "Photo is done; form and fee next.", dueInDays: 14 },
        { want: "Unsubscribe from store newsletters", status: "done", doneNote: "Seventeen gone." },
        { want: "Review which phone apps can see my location" },
      ],
    },
    research: {
      format: "research",
      title: "Before I sign up for anything new",
      look: "doc",
      items: [
        {
          want: "Which note apps let me export everything as plain text files?",
          accepted: 0,
          updates: [
            { title: "Inkwell Notes and Ledgerleaf both do", body: "Each has an export-all option that writes one text file per note.", links: ["https://example.com/inkwell/export", "https://example.org/ledgerleaf/export"], by: "Claude" },
            { title: "Most of them, as PDF", body: "PDF export is common, but it isn't plain text and is harder to move elsewhere.", links: ["https://example.com/notes-roundup"], by: "Muse" },
          ],
        },
        {
          want: "What does a home router's guest network actually keep apart?",
          status: "in_progress",
          updates: [
            {
              title: "Guest devices can't see devices on the main network",
              body: "They usually share the same internet connection and speed. Still checking whether that holds on older routers.",
              links: ["https://example.org/guest-network"],
              by: "Cursor",
            },
          ],
        },
        { want: "Is there a free way to use a different email address for each account?" },
      ],
    },
  },
} satisfies Persona;
