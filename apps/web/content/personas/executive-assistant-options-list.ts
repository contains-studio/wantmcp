import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "executive-assistant-options-list",
  order: 42,
  group: "work",
  title: "Gather options for your executive in one private list",
  description:
    "For assistants handling gifts, travel and errands: your agent collects options with prices and sources on a private list you share with the person you support.",
  h1: "Options ready before they ask",
  intro: "Put each request on a private list. Your agent gathers options with prices and links, and the person you support can see them in one place.",
  label: "Executive assistant requests",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Gifts and orders for J.",
      description: "Private. Shopping lists start public, so this one was switched.",
      look: "sheet--christmas",
      items: [
        {
          want: "Holiday gifts for three partners at the law firm, under $80 each",
          details: "Nothing edible; two of them travel a lot.",
          products: [
            { title: "Leather passport wallet, monogram option", store: "Bramble & Co. Goods", price: "68.00", was: "85.00", by: "ChatGPT", note: "Monogram adds 5 business days." },
            { title: "Packable travel blanket and pillow set", store: "Wayfarer Supply", price: "74.50", by: "Claude" },
            { title: "Insulated travel tumbler, engraved", store: "Copperline Kitchen", price: "42.00", earlier: ["48.00"], by: "Gemini" },
          ],
        },
        {
          want: "A conference speakerphone for the home office",
          bought: 0,
          products: [
            { title: "Huddle USB speakerphone, 360° mics", store: "Harbor Electronics", price: "129.00", was: "159.00", by: "Claude" },
            { title: "Bluetooth speakerphone with dongle", store: "Pixel Lane", price: "149.99", by: "Grok" },
          ],
        },
        {
          want: "Universal travel adapter with two USB-C ports",
          products: [
            { title: "Globetrek adapter, 65W USB-C", store: "Wayfarer Supply", price: "39.99", by: "ChatGPT" },
            { title: "Compact world adapter, 4 USB", store: "Fieldstone", price: "29.95", was: "34.95", by: "Claude", coupon: "TRAVEL5" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Open requests",
      look: "today",
      items: [
        {
          want: "Shortlist hotels within walking distance of the conference center, March 4 to 6",
          details: "King room, quiet floor, under $320 a night. I'll book.",
          status: "in_progress",
          updates: [
            {
              title: "Four options posted with rates and cancellation terms",
              body: "Two allow free cancellation until 48 hours before. The closest one is a 6-minute walk.",
              links: ["https://example.com/hotels/conference-district"],
              by: "Claude",
            },
          ],
        },
        {
          want: "Draft the agenda for Thursday's board prep call",
          dueInDays: 1,
          updates: [{ title: "Draft from last quarter's agenda and this week's notes", body: "Five items, 50 minutes. Budget review moved to the top as asked.", by: "ChatGPT" }],
        },
        { want: "Send thank-you cards after the client dinner", status: "done", doneNote: "Mailed Monday, copies in the shared folder." },
        { want: "Find a car service for the airport run on the 3rd, 6 a.m. pickup" },
      ],
    },
    research: {
      format: "research",
      title: "Questions from J.",
      look: "doc",
      items: [
        {
          want: "Which restaurants near the office have a private room for 12 on a weeknight?",
          accepted: 0,
          updates: [
            {
              title: "Larkspur Grill: room seats 14, $900 minimum",
              body: "Two blocks away. Fixed menu required for groups over 10.",
              links: ["https://example.com/larkspur/private-dining"],
              by: "Gemini",
            },
            {
              title: "Hearth & Vine: room seats 12, no minimum Monday to Wednesday",
              body: "Ten minutes' walk. À la carte allowed; AV screen available for a fee.",
              links: ["https://example.org/hearth-vine/events"],
              by: "Claude",
            },
          ],
        },
        {
          want: "What does a 10-year passport renewal take if the trip is in seven weeks?",
          status: "in_progress",
          updates: [
            {
              title: "The State Department page lists current processing times",
              body: "Expedited service is an option for an extra fee. Times change, so check the page the week you apply.",
              links: ["https://example.org/passport-processing"],
              by: "ChatGPT",
            },
          ],
        },
        { want: "Which airline lounges are open in Terminal B before 6 a.m.?" },
      ],
    },
  },
} satisfies Persona;
