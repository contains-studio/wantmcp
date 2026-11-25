import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "research-now-pick-up-later",
  order: 38,
  group: "delegating",
  title: "Hand off errands and pick them up when it suits you",
  description:
    "Write down the errands and questions. Your AI agent does the legwork and leaves the results, and any question for you, on the list until you're ready.",
  h1: "Let your agent do the legwork",
  intro: "Write down what needs doing. Your agent does the research and leaves it on the list, with any question for you, until you're ready to pick it up.",
  label: "Hand off legwork for later",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Things to order when I'm ready",
      description: "Options gathered ahead of time, so ordering takes a minute.",
      look: "sheet",
      items: [
        {
          want: "A cordless stick vacuum, light enough to carry upstairs",
          details: "Under 6 pounds. Wall mount included.",
          products: [
            { title: "Lightweight stick vacuum, 5.2 lb, wall dock", store: "Harbor Electronics", price: "179.00", was: "229.00", earlier: ["229.00", "199.00"], by: "Claude" },
            { title: "Cordless vacuum with removable battery, 5.8 lb", store: "Maple Street Home", price: "149.99", by: "Gemini", note: "Spare battery sold separately for $49." },
          ],
        },
        {
          want: "A big refill of laundry detergent pods, unscented",
          bought: 0,
          products: [
            { title: "Free-and-clear pods, 96 count", store: "Greenleaf Grocers", price: "21.99", was: "26.99", by: "ChatGPT", coupon: "SAVE4" },
            { title: "Unscented pods, 112 count", store: "Northway Supply", price: "27.49", by: "Codex" },
          ],
        },
        {
          want: "A supportive desk chair for the spare room",
          products: [
            { title: "Mesh task chair, adjustable lumbar", store: "Fieldstone", price: "229.00", by: "Claude", image: "chair-a", note: "Free returns for 60 days, picked up from the door." },
            { title: "Upholstered office chair, high back", store: "Kettle & Pine", price: "259.00", was: "319.00", by: "Gemini", image: "chair-b" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Errands, handed off",
      look: "today",
      items: [
        {
          want: "Find three house cleaners who bring their own supplies",
          details: "Every other week, within 10 miles. Prices and earliest start date.",
          status: "in_progress",
          updates: [{ title: "Three found; one question for you", body: "All three bring supplies and can start in December. Waiting on you: is a Tuesday or a Friday better?", links: ["https://example.com/cleaners-compared"], by: "Claude" }],
        },
        {
          want: "Draft the letter disputing the duplicate charge on the water bill",
          dueInDays: 9,
          updates: [{ title: "Draft ready to read", body: "One page, with the two charges and dates listed. It needs your account number at the top before it goes out.", by: "ChatGPT" }],
        },
        { want: "Compare the two renewal offers for car insurance" },
        { want: "Find out when the library's holds expire", status: "done", doneNote: "Seven days after the hold arrives; two can be renewed online." },
      ],
    },
    research: {
      format: "research",
      title: "Questions I'll come back to",
      look: "doc",
      items: [
        {
          want: "Can I renew my driver's license online this time?",
          accepted: 0,
          updates: [
            { title: "Yes, if the last renewal was in person", body: "The state DMV allows every other renewal online, with a photo on file. The page lists the documents to have ready.", links: ["https://example.org/dmv/renew-online"], by: "Gemini" },
            { title: "Online renewals take about two weeks to arrive", body: "The DMV's processing page says to allow 10 to 14 days for the card by mail; the old one stays valid until then.", links: ["https://example.org/dmv/processing-times"], by: "Claude" },
          ],
        },
        {
          want: "Which grocery stores nearby deliver on weekday mornings?",
          status: "in_progress",
          updates: [{ title: "Two so far, both with 8 to 10 am slots", body: "Greenleaf Grocers delivers weekdays from 8 am with no fee over $35. Still checking the co-op.", links: ["https://example.com/greenleaf/delivery"], by: "Grok" }],
        },
        { want: "Is it cheaper to switch the internet plan or keep the current one?" },
      ],
    },
  },
} satisfies Persona;
