import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "delivered-cost-from-mainland",
  order: 65,
  group: "anywhere",
  title: "Compare delivered cost when ordering from the mainland",
  description:
    "Ordering from mainland stores? Ask your agent for each price, shipping to your ZIP code, delivery time and warranty terms, then compare the cost at your door.",
  h1: "Compare what each option costs at your door",
  intro: "When the nearest store doesn't carry it, the sticker price is only the start. Your agent can note shipping, delivery time and warranty terms beside each price.",
  label: "Delivered cost from the mainland",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Ordering from the mainland",
      description: "Price first, then what it takes to get here.",
      look: "sheet",
      items: [
        {
          want: "A burr coffee grinder, under $200 delivered",
          products: [
            { title: "Conical burr grinder, 40 settings", store: "Summit Roast Supply", price: "149.00", by: "Claude", image: "grinder", note: "Ships to your ZIP code for $28, 10 to 14 days: about $177 delivered." },
            { title: "Flat burr grinder, stepless", store: "Bayline Kitchen", price: "169.00", was: "199.00", by: "ChatGPT", image: "grinder", note: "Free shipping covers the lower 48 only; shipping here is quoted at checkout." },
          ],
        },
        {
          want: "A 5-quart stand mixer",
          products: [
            { title: "5 qt tilt-head stand mixer", store: "Bayline Kitchen", price: "229.99", earlier: ["279.99", "249.99"], by: "Gemini", note: "Ships here for $45, three to four weeks." },
            { title: "5 qt bowl-lift stand mixer", store: "Westgate Home", price: "259.00", by: "Codex", note: "Flat $19 shipping to every US address: about $278 delivered." },
          ],
        },
        {
          want: "A replacement 48V e-bike battery",
          details: "Must match the old one's connector; photo of the label is in the notes.",
          bought: 1,
          products: [
            { title: "48V 13Ah frame battery", store: "Voltway Cycles", price: "389.00", by: "Grok", note: "Store says it can't ship lithium batteries to this ZIP code." },
            { title: "48V 14Ah frame battery", store: "Trailcraft Bikes", price: "419.00", was: "469.00", by: "Claude", note: "Ships by ground to this ZIP code with a $62 battery handling fee." },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Getting it here",
      look: "tracker",
      items: [
        {
          want: "Compare the forwarder's rate with the store's shipping for the mixer",
          status: "in_progress",
          updates: [
            {
              title: "Forwarder's published rate found",
              body: "About $38 for a box up to 25 lb, plus 5 to 8 days on top of mainland delivery. Westgate's flat $19 still wins.",
              links: ["https://example.com/forwarder/rates"],
              by: "ChatGPT",
            },
          ],
        },
        { want: "Order the grinder before the sale price ends", dueInDays: 3 },
        { want: "Ask the shop in town whether it can service the mixer", status: "done", doneNote: "They can, but parts are ordered from the mainland too." },
        { want: "Keep receipts, serial numbers and shipping labels in one folder" },
      ],
    },
    research: {
      format: "research",
      title: "Warranty and shipping questions",
      look: "doc",
      items: [
        {
          want: "Is the mixer's warranty honored if I live outside the lower 48?",
          accepted: 0,
          updates: [
            { title: "Yes, but you pay shipping to the repair center", body: "The maker's warranty page covers all US addresses and says the owner pays freight both ways.", links: ["https://example.com/warranty/mixer"], by: "Claude" },
            { title: "Only through the store you bought it from", body: "From a store FAQ; the maker's own page says otherwise.", links: ["https://example.org/faq/warranty"], by: "Gemini" },
          ],
        },
        {
          want: "Will mainland stores charge local sales tax on orders shipped here?",
          status: "in_progress",
          updates: [
            {
              title: "Some collect it at checkout, some don't",
              body: "Two of the stores on this list add it at checkout. The rules where you live decide the rest; worth asking the local tax office.",
              links: ["https://example.org/tax/remote-sales"],
              by: "ChatGPT",
            },
          ],
        },
        { want: "Which carriers will deliver a lithium battery to this ZIP code?" },
      ],
    },
  },
} satisfies Persona;
