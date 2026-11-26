import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "wedding-planning-checklist",
  order: 33,
  group: "events",
  opens: "tasks",
  title: "A wedding planning checklist you both share",
  description:
    "Keep vendor options, deadlines and open questions in one place. Your agents research and post what they find; the two of you decide together.",
  h1: "Plan the wedding together, in one place",
  intro: "Write down each decision still ahead. Your agents gather options and sourced answers, and you both see the same list.",
  label: "Wedding planning",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Wedding: things to buy",
      description: "For the day itself, not the registry.",
      look: "sheet",
      items: [
        {
          want: "String lights for the barn, about 200 feet, warm white",
          details: "Outdoor rated. The venue has outlets on two walls only.",
          products: [
            { title: "Commercial string lights, 100 ft, set of 2", store: "Glowhouse Lighting", price: "139.98", was: "179.98", by: "Claude", note: "Each strand can link to three more from one outlet." },
            { title: "Café lights, 48 ft, warm white, set of 4", store: "Maple Street Home", price: "119.00", by: "ChatGPT" },
          ],
        },
        {
          want: "Linen napkins for 110 guests, sage green",
          products: [
            { title: "Linen-blend napkins, sage, pack of 12", store: "Copperline Kitchen", price: "29.50", earlier: ["34.00", "32.00"], by: "Gemini", note: "Ten packs gives 120, so a few spares for spills." },
            { title: "Cotton dinner napkins, eucalyptus, pack of 24", store: "Fieldstone", price: "54.00", was: "66.00", by: "Claude" },
          ],
        },
        {
          want: "A guest book alternative: a framed print people sign",
          products: [
            { title: "Custom signing print, 16 x 20, white frame", store: "Paper & Pine Studio", price: "78.00", by: "Muse" },
            { title: "Wood signing board with our names, 18 in", store: "Kettle & Pine", price: "64.00", by: "ChatGPT", coupon: "WED15" },
          ],
        },
        {
          want: "Comfortable flats to change into after the ceremony",
          bought: 1,
          products: [
            { title: "Satin ballet flat, ivory", store: "Halverson Shoes", price: "68.00", by: "Claude", image: "shoe" },
            { title: "Pointed-toe flat, cushioned insole, champagne", store: "Trailhead Outfitters", price: "54.99", was: "74.99", by: "Gemini", image: "shoe" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Wedding: vendors and deadlines",
      look: "sections",
      items: [
        {
          want: "Shortlist three caterers who can do a vegetarian menu for 110",
          details: "Within 30 miles of the venue, available the second Saturday in September.",
          status: "in_progress",
          updates: [{ title: "Three caterers with the date open", body: "All three post vegetarian menus. One includes rentals in the per-person price; the other two quote rentals separately.", links: ["https://example.com/caterers/shortlist"], by: "Claude" }],
        },
        {
          want: "Ask the venue for the final headcount deadline and the rain plan",
          dueInDays: 6,
          updates: [{ title: "Drafted the email to the venue", body: "Ready for you to send. It also asks whether the tent fee is refundable if the forecast clears.", by: "ChatGPT" }],
        },
        { want: "Compare three photographers' packages side by side" },
        { want: "Book the tasting with our top caterer", status: "done", doneNote: "Booked for a Saturday afternoon in March; both families can come." },
      ],
    },
    research: {
      format: "research",
      title: "Wedding: questions to answer",
      look: "doc",
      items: [
        {
          want: "How far ahead do we need the marriage license in our county?",
          accepted: 0,
          updates: [
            { title: "Apply within 60 days of the date; no waiting period", body: "The county clerk's page says the license is valid for 60 days and can be used right away. Both people apply in person with photo ID.", links: ["https://example.org/county-clerk/marriage-license"], by: "Gemini" },
            { title: "Book a clerk appointment about a month ahead", body: "The clerk's office runs on appointments, and summer slots fill about three weeks out according to its booking page.", links: ["https://example.org/county-clerk/appointments"], by: "Claude" },
          ],
        },
        {
          want: "Does the venue's insurance cover outside vendors, or do they need their own?",
          status: "in_progress",
          updates: [{ title: "Vendors need their own liability policy", body: "The venue's vendor guide asks each outside vendor for a certificate of insurance two weeks before the event.", links: ["https://example.com/venue/vendor-guide"], by: "Grok" }],
        },
        { want: "What's a typical tipping range for the band and the catering staff?" },
      ],
    },
  },
} satisfies Persona;
