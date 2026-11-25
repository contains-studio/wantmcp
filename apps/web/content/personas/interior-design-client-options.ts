import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "interior-design-client-options",
  order: 28,
  group: "moving",
  title: "Priced furniture options to share with a design client",
  description:
    "Put a few priced options for each piece on one list per room. Your AI agent adds stores, prices and links, and your client can read the public list anytime.",
  h1: "Show clients a few priced options per piece",
  intro: "List each piece the room needs. Your agent adds options with current prices, and you share the public link for your client to look over before you meet.",
  label: "Client furniture options",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Dining room: options for review",
      description: "Room is 12 by 14 feet; warm oak and linen.",
      look: "sheet",
      items: [
        {
          want: "Dining chairs, set of six, oak or ash",
          products: [
            { title: "Spindle-back oak side chair", store: "Alder & Rowe", price: "189.00", was: "225.00", by: "Claude", image: "chair-a", note: "Price per chair; six come to $1,134." },
            { title: "Upholstered ash side chair, linen", store: "Fernhill Studio", price: "165.00", by: "ChatGPT", image: "chair-b" },
            { title: "Woven-seat oak chair", store: "Mill Street Modern", price: "210.00", earlier: ["240.00", "225.00"], by: "Gemini" },
          ],
        },
        {
          want: "Dining table, 84 to 96 inches, seats eight",
          bought: 0,
          products: [
            { title: "Trestle table, 90 in., white oak", store: "Alder & Rowe", price: "1849.00", by: "Claude" },
            { title: "Extension table, 72 to 96 in.", store: "Mill Street Modern", price: "1595.00", was: "1795.00", by: "Grok" },
          ],
        },
        {
          want: "Pendant over the table, 30 to 36 inches across",
          products: [
            { title: "Linen drum pendant, 34 in.", store: "Glowhouse Lighting", price: "420.00", by: "Codex" },
            { title: "Woven rattan pendant, 30 in.", store: "Fernhill Studio", price: "289.00", coupon: "STUDIO10", by: "Claude" },
          ],
        },
        {
          want: "Rug, 9 by 12 feet, low pile",
          products: [
            { title: "Flatweave wool rug, 9 x 12, oatmeal", store: "Loomhouse Rugs", price: "699.00", was: "849.00", by: "ChatGPT" },
            { title: "Low-pile washable rug, 9 x 12", store: "Parkside Home", price: "429.00", by: "Gemini", note: "Machine-washable in panels; good under a dining table." },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Dining room install",
      look: "today",
      items: [
        {
          want: "Confirm delivery windows for the table and chairs",
          status: "in_progress",
          updates: [{ title: "Table ships in 3 weeks, chairs in stock", body: "Alder & Rowe offers white-glove delivery for $149. Waiting on you to pick a date with the client.", links: ["https://example.com/delivery"], by: "Claude" }],
        },
        { want: "Send the client the options link before Friday's meeting", dueInDays: 2 },
        { want: "Order fabric swatches for the upholstered chair" },
        { want: "Measure the wall for the sideboard", status: "done", doneNote: "78 inches clear between the window trim and the doorway." },
      ],
    },
    research: {
      format: "research",
      title: "Questions for this room",
      look: "doc",
      items: [
        {
          want: "Does a 90-inch table leave enough clearance in a 12 by 14 room?",
          accepted: 0,
          updates: [
            { title: "Yes: about 52 inches on the sides and 39 at the ends", body: "Common guidance is at least 36 inches from the table edge to the wall so chairs can pull out. Both measurements clear it.", links: ["https://example.org/clearance-guide"], by: "Claude" },
            { title: "Go with the 72-inch extension table", body: "Assumes a 10 by 12 room; the measurements on this list say 12 by 14.", by: "ChatGPT" },
          ],
        },
        {
          want: "Which of these chairs come in a performance fabric?",
          status: "in_progress",
          updates: [{ title: "Fernhill's upholstered chair does, in four colors", body: "Adds $20 per chair and about two weeks to delivery.", links: ["https://example.com/fabric-options"], by: "Gemini" }],
        },
        { want: "What lead times do these stores quote for a custom finish?" },
      ],
    },
  },
} satisfies Persona;
