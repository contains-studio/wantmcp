import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "community-event-volunteer-plan",
  order: 35,
  group: "events",
  title: "Organize a community event with volunteers",
  description:
    "Keep the jobs, the supplies and the permit questions for a neighborhood event on one list. Helpers you invite tick off their part; agents do the digging.",
  h1: "Run the block party from one list",
  intro: "Put every job, supply and open question on the list. Volunteers you invite take their part, and next year's team starts from it.",
  label: "Community event organizing",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Fall block party: supplies",
      description: "Bought from the neighborhood fund unless someone donates it.",
      look: "sheet--halloween",
      items: [
        {
          want: "Three 10 x 10 pop-up canopies",
          details: "For the bake sale, crafts and check-in. Must come with weights or stakes.",
          products: [
            { title: "Pop-up canopy 10 x 10, with sandbags", store: "Northway Supply", price: "79.99", was: "109.99", earlier: ["109.99", "94.99"], by: "Claude", note: "Three come to about $240 before tax." },
            { title: "Commercial canopy 10 x 10, steel frame", store: "Fairground Rentals", price: "45.00", by: "Gemini", note: "Rental per day, delivery and pickup included for orders of three or more." },
          ],
        },
        {
          want: "Pumpkins for the carving table, about 40 small ones",
          products: [
            { title: "Pie pumpkins, bin of 40", store: "Hillside Farm Stand", price: "60.00", by: "ChatGPT" },
            { title: "Mini carving pumpkins, each", store: "Greenleaf Grocers", price: "2.49", by: "Grok", coupon: "COMMUNITY5" },
          ],
        },
        {
          want: "Compostable plates, cups and napkins for 200",
          products: [
            { title: "Compostable party set, serves 100", store: "Kettle & Pine", price: "42.00", by: "Claude", note: "Two sets needed." },
            { title: "Plant-fiber plates and cups, 200 count", store: "Copperline Kitchen", price: "74.50", was: "89.00", by: "Codex" },
          ],
        },
        {
          want: "A battery speaker loud enough for the street",
          bought: 1,
          products: [
            { title: "Portable PA speaker, 12 in, wireless mic", store: "Harbor Electronics", price: "189.00", by: "Gemini" },
            { title: "Bluetooth party speaker, 10-hour battery", store: "Second Spin Audio", price: "98.00", was: "140.00", by: "Claude", note: "Refurbished, 90-day warranty." },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Fall block party: who's doing what",
      description: "Invited volunteers can tick off their own jobs on the web.",
      look: "today--halloween",
      items: [
        {
          want: "Apply for the street closure permit",
          dueInDays: 5,
          details: "Oak Street between 3rd and 5th, Saturday 2 to 7 pm.",
          updates: [{ title: "Form filled in, needs a signature", body: "The city's online form is complete except the organizer's signature and the $50 fee, which only you can pay.", links: ["https://example.org/city/street-closure"], by: "Claude" }],
        },
        {
          want: "Find two neighbors with folding tables to lend",
          status: "in_progress",
          claimedBy: "ChatGPT",
          updates: [{ title: "Drafted a note for the neighborhood email list", body: "Short and friendly, with a reply-by date. Ready for you to post.", by: "ChatGPT" }],
        },
        { want: "Write the volunteer schedule: setup, three shifts, cleanup" },
        { want: "Reserve the community center's restrooms", status: "done", doneNote: "Confirmed with the center; doors open at 1:30." },
      ],
    },
    research: {
      format: "research",
      title: "Fall block party: questions",
      look: "doc",
      items: [
        {
          want: "Does a bake sale at a street event need a food permit here?",
          accepted: 0,
          updates: [
            { title: "No permit for home-baked goods that don't need refrigeration", body: "The county health department exempts nonprofit bake sales selling shelf-stable items. Labels with the baker's name are recommended.", links: ["https://example.org/county-health/temporary-events"], by: "Gemini" },
            { title: "Anything with cream filling counts as perishable", body: "The same page lists cheesecake and cream pies as needing cold holding, which would need a temporary food permit.", links: ["https://example.org/county-health/perishables"], by: "Claude" },
          ],
        },
        {
          want: "Do we need event insurance for a closed street?",
          status: "in_progress",
          updates: [{ title: "The city asks for it above 150 expected guests", body: "The permit guide asks for a one-day liability certificate for larger events. Two local agencies sell single-day policies.", links: ["https://example.org/city/permit-guide"], by: "Grok" }],
        },
        { want: "What time does the city require amplified music to end?" },
      ],
    },
  },
} satisfies Persona;
