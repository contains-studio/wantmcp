import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "kwanzaa-gift-list",
  order: 12,
  group: "gifts",
  title: "Kwanzaa gift list: books and makers to support",
  description:
    "Keep Kwanzaa gifts in one list: books, heritage pieces and the makers you want to buy from. Your AI agent adds shops, prices and links, with sources for claims.",
  h1: "Choose Kwanzaa gifts with intent",
  intro: "Write down the books and handmade pieces you are looking for. Ask your agent to find them at the shops and makers you want to support, and to show where each claim comes from.",
  label: "Kwanzaa zawadi",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Zawadi this year",
      description: "Books first, then a few handmade pieces.",
      look: "sheet--kwanzaa",
      items: [
        {
          want: "A picture book about working together (Ujima) for a six-year-old",
          details: "From an independent bookstore if we can. Under $25.",
          products: [
            { title: "We Build It Together, hardcover", store: "Open Door Books", price: "18.99", by: "Claude", note: "Independent store; its About page describes it as family-owned since 1994." },
            { title: "Hands Across the Block, paperback", store: "Riverbend Bookshop", price: "9.99", was: "12.99", by: "Gemini" },
          ],
        },
        {
          want: "A chapter book on the seven principles for a ten-year-old",
          products: [
            { title: "Seven Days, Seven Lights, middle-grade novel", store: "Riverbend Bookshop", price: "16.00", earlier: ["17.99", "16.99"], by: "ChatGPT" },
            { title: "Kwanzaa stories collection, illustrated", store: "Open Door Books", price: "22.50", by: "Claude" },
          ],
        },
        {
          want: "A handmade wooden kinara",
          bought: 1,
          products: [
            { title: "Hand-carved walnut kinara", store: "Baobab Woodworks", price: "68.00", by: "Grok", note: "Made to order; the maker lists a December 18 cutoff." },
            { title: "Turned maple kinara, natural finish", store: "Southside Makers Market", price: "54.00", by: "Claude" },
          ],
        },
        {
          want: "A woven mkeka for the table",
          products: [
            { title: "Hand-woven raffia mkeka, 24 x 16 in", store: "Threadline Collective", price: "35.00", was: "42.00", by: "Muse" },
            { title: "Kente-pattern cotton table mat", store: "Southside Makers Market", price: "28.00", by: "Gemini", coupon: "MARKET5" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Getting ready",
      look: "today--kwanzaa",
      items: [
        {
          want: "Order the made-to-order pieces before the makers' cutoffs",
          status: "in_progress",
          updates: [{ title: "Kinara ordered, mkeka next", body: "Baobab Woodworks confirmed the order. Threadline's cutoff is the 20th.", by: "Claude" }],
        },
        { want: "Pick up the book order from Open Door Books", dueInDays: 4 },
        { want: "Make the gift cards with each child's principle", status: "done", doneNote: "Seven cards done, one for each day." },
        { want: "Add this year's makers to the list we share with the family" },
      ],
    },
    research: {
      format: "research",
      title: "Sources and makers",
      look: "doc--kwanzaa",
      items: [
        {
          want: "Which bookstores in our city are independently owned, and how do they say so?",
          accepted: 0,
          updates: [
            { title: "Three stores, each with a public statement", body: "Open Door, Riverbend and Lighthouse describe their ownership on their own sites; the agent linked each page rather than vouching for it.", links: ["https://example.com/open-door/about", "https://example.org/riverbend/story"], by: "Claude" },
            { title: "Two confirmed in the local business directory", body: "The city's small-business directory lists Open Door and Riverbend as locally owned.", links: ["https://example.org/business-directory"], by: "Gemini" },
          ],
        },
        {
          want: "When is the holiday makers market, and do the sellers ship?",
          status: "in_progress",
          updates: [{ title: "December 19 and 20, community center", body: "About half the sellers list a website; the rest sell at the market only.", links: ["https://example.com/makers-market"], by: "ChatGPT" }],
        },
        { want: "Which picture books explain the principles well for under-eights?" },
      ],
    },
  },
} satisfies Persona;
