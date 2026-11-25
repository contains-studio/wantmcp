import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "christmas-hosting-checklist",
  order: 10,
  group: "gifts",
  title: "A Christmas hosting checklist for the whole day",
  description:
    "Food, tables, chairs and helpers on shared lists. Your agent posts options and updates, and the people you invite tick off their jobs on the web.",
  h1: "Host Christmas without the loose ends",
  intro: "Write down every job and every big buy. Your agent posts options and updates, and anyone you invite can see what's left and tick off what they've done.",
  label: "Hosting Christmas",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Christmas Day buys",
      description: "Fourteen at the table this year.",
      look: "sheet--christmas",
      items: [
        {
          want: "Folding table that seats six, to extend the dining table",
          products: [
            { title: "6-foot folding table, light gray", store: "Corner Hardware", price: "59.98", was: "74.98", by: "Claude" },
            { title: "Fold-in-half table, 6 ft", store: "Hollis Home Supply", price: "64.00", by: "ChatGPT", note: "Folds to 3 ft, fits in the hall closet." },
          ],
        },
        {
          want: "Four extra chairs that match the dining set",
          products: [
            { title: "Padded folding chair, oak finish, set of 4", store: "Maple Street Home", price: "179.00", was: "219.00", earlier: ["219.00", "199.00"], by: "Claude", image: "chair-a" },
            { title: "Stacking wood chair, natural, set of 4", store: "Hearthside Goods", price: "196.00", by: "Gemini", image: "chair-b" },
          ],
        },
        {
          want: "Roasting pan big enough for a 20-pound turkey",
          bought: 0,
          products: [
            { title: "Stainless roasting pan with rack, 16 x 13 in", store: "Copperline Kitchen", price: "69.95", was: "89.95", by: "ChatGPT" },
            { title: "Enamel roaster with lid, extra large", store: "Copperline Kitchen", price: "84.00", by: "Claude" },
          ],
        },
        {
          want: "Long red tablecloth, 60 x 144 inches",
          products: [
            { title: "Linen-look tablecloth, cranberry, 60 x 144", store: "Hearthside Goods", price: "32.00", by: "Gemini" },
            { title: "Wrinkle-free tablecloth, deep red, 60 x 144", store: "Maple Street Home", price: "24.99", coupon: "HOME15", by: "Grok" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Christmas Day plan",
      look: "today--christmas",
      items: [
        {
          want: "Find a nut-free dessert Aunt Rosa can bring",
          status: "in_progress",
          updates: [{ title: "Three recipes posted", body: "Gingerbread cake, cranberry crumble and a chocolate pots de crème, all made without nuts.", links: ["https://example.com/nut-free-desserts"], by: "Claude" }],
        },
        { want: "Book the grocery delivery slot for Dec 23", dueInDays: 7, details: "Greenleaf Market opens Christmas week slots on Dec 1." },
        { want: "Order the turkey from the butcher", dueInDays: 12 },
        { want: "Borrow six folding chairs from the Nguyens", status: "done", doneNote: "Picking them up the 22nd." },
        { want: "Clear the coat closet for guests" },
      ],
    },
    research: {
      format: "research",
      title: "Cooking questions",
      look: "doc--christmas",
      items: [
        {
          want: "How many days does a 20-pound turkey need to thaw in the fridge?",
          accepted: 0,
          updates: [
            { title: "About five days", body: "Food-safety guidance is roughly one day per four to five pounds, so start by Dec 20.", links: ["https://example.org/thawing-guide"], by: "Claude" },
            { title: "Or a few hours in cold water", body: "Thirty minutes per pound in cold water changed every half hour, if the fridge is full.", links: ["https://example.com/cold-water-thaw"], by: "Gemini" },
          ],
        },
        {
          want: "Which sides can be made the day before?",
          status: "in_progress",
          updates: [{ title: "Mashed potatoes, stuffing and the cranberry sauce", body: "All three reheat well; the green beans are better made the day of.", links: ["https://example.com/make-ahead"], by: "ChatGPT" }],
        },
        { want: "How much ham do we need for fourteen alongside the turkey?" },
      ],
    },
  },
} satisfies Persona;
