import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "shared-shopping-list-for-couples",
  order: 15,
  group: "home",
  title: "A shared shopping list for couples deciding together",
  description:
    "Two people, one budget, one list. Your AI agents add options with store, price and link, and both of you see the same choices before anything is bought.",
  h1: "Decide household buys together",
  intro: "Keep the sofa, the dishwasher and the rug on one private list you both open. Your agents add options; you two pick, and stop resending links.",
  label: "Couples buying together",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Living room and kitchen",
      description: "Private: just the two of us.",
      look: "sheet",
      items: [
        {
          want: "Sofa, under 84 inches wide, washable cover, under $1,200",
          details: "Not gray. Has to fit through a 32-inch door.",
          products: [
            { title: "Haven 3-seat sofa, removable cover, oat", store: "Elm & Mason", price: "1049.00", was: "1299.00", by: "Claude", note: "Arms come off, so it fits a 30-inch door." },
            { title: "Marlow modular sofa, 3 pieces, olive", store: "Northgate Furniture", price: "1149.00", earlier: ["1249.00", "1199.00"], by: "ChatGPT" },
          ],
        },
        {
          want: "A quiet dishwasher, 24 inches, stainless",
          details: "Under 45 dB. Third rack would be nice.",
          products: [
            { title: "Silverline 44 dB dishwasher with third rack", store: "Bayside Appliance", price: "749.00", was: "899.00", by: "Codex" },
            { title: "QuietClean 42 dB, stainless tub", store: "Harbor Electronics", price: "829.99", by: "Claude", note: "Delivery and haul-away are $49 extra." },
          ],
        },
        {
          want: "8 x 10 rug that hides cat hair",
          bought: 0,
          products: [
            { title: "Low-pile flatweave rug, 8 x 10, rust", store: "Woven Path", price: "289.00", was: "349.00", by: "Gemini" },
            { title: "Washable printed rug, 8 x 10", store: "Elm & Mason", price: "319.00", by: "ChatGPT", coupon: "RUG20" },
          ],
        },
        {
          want: "Two bar stools, 26-inch seat height",
          products: [
            { title: "Oak counter stool, set of 2", store: "Northgate Furniture", price: "238.00", by: "Claude", image: "chair-a" },
            { title: "Upholstered swivel counter stool, set of 2", store: "Woven Path", price: "199.00", was: "260.00", by: "Grok", image: "chair-b" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before we order",
      look: "today",
      items: [
        {
          want: "Measure the hallway, the door and the sofa wall",
          status: "in_progress",
          updates: [{ title: "Door is 31.5 inches", body: "Only the Haven fits without removing the door, since its arms come off.", by: "Claude" }],
        },
        { want: "Decide on the sofa together", dueInDays: 4, details: "Sale at Elm & Mason ends Sunday." },
        { want: "Agree the budget for the room", status: "done", doneNote: "$2,500 for the sofa, rug and stools. The dishwasher comes from savings." },
        { want: "Book a weekend to sell the old couch" },
      ],
    },
    research: {
      format: "research",
      title: "What we want to know first",
      look: "doc",
      items: [
        {
          want: "Which sofa covers survive a hot wash?",
          accepted: 0,
          updates: [
            { title: "Cotton-blend covers, cold or warm wash", body: "Both makers say to wash covers cold and air-dry; neither allows a hot cycle.", links: ["https://example.com/haven-care", "https://example.org/marlow-care"], by: "Claude" },
            { title: "Performance fabric needs spot-cleaning only", body: "The Marlow's olive fabric is spot-clean only; its cover is not removable on the arms.", links: ["https://example.org/marlow-care"], by: "ChatGPT" },
          ],
        },
        {
          want: "Is the dishwasher's extended warranty worth $129?",
          status: "in_progress",
          updates: [{ title: "Probably not with the card we use", body: "The maker gives one year; the card adds a second year on purchases paid in full.", links: ["https://example.com/warranty-terms"], by: "Gemini" }],
        },
        { want: "What is the return policy on large furniture if it doesn't fit?" },
      ],
    },
  },
} satisfies Persona;
