import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "restaurant-equipment-sourcing",
  order: 44,
  group: "work",
  title: "Source café and restaurant equipment with AI help",
  description:
    "When a dishwasher dies mid-shift, list what you need. Your AI agent compares new and reconditioned units with prices, warranty and delivery while you work.",
  h1: "Shortlist the equipment while you run the floor",
  intro: "Write the spec once: size, power, budget. Your agent posts options with warranty and delivery details, so you make one call instead of ten.",
  label: "Café and restaurant equipment",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Kitchen replacements",
      description: "Private: switched so competitors can't read it.",
      look: "sheet",
      items: [
        {
          want: "Undercounter commercial dishwasher, high-temp, 120V or 208V",
          details: "Must fit a 24-inch opening, 34 inches tall. Under $4,000 with delivery.",
          products: [
            { title: "High-temp undercounter dishwasher, 24 racks/hr", store: "Galley Supply Co.", price: "3649.00", was: "4199.00", earlier: ["4199.00", "3899.00"], by: "Claude", note: "Free curbside delivery; install quoted separately." },
            { title: "Reconditioned undercounter unit, 1-year parts warranty", store: "Second Shift Restaurant Equipment", price: "1850.00", by: "ChatGPT", note: "Booster heater replaced. Pickup or $150 delivery." },
            { title: "Low-temp chemical-sanitizing undercounter", store: "Line Cook Wholesale", price: "2995.00", by: "Gemini" },
          ],
        },
        {
          want: "Espresso grinder with a 64 mm or larger burr set",
          products: [
            { title: "On-demand espresso grinder, 64 mm flat burrs", store: "Crema Trade Supply", price: "1149.00", was: "1299.00", by: "Grok", image: "grinder" },
            { title: "Commercial doser grinder, 65 mm", store: "Galley Supply Co.", price: "989.00", by: "Claude", image: "grinder", coupon: "SPRING5" },
          ],
        },
        {
          want: "Two-door reach-in refrigerator, stainless",
          bought: 0,
          products: [
            { title: "49 cu ft reach-in, two solid doors", store: "Line Cook Wholesale", price: "3280.00", was: "3640.00", by: "ChatGPT" },
            { title: "Two-door reach-in, glass doors", store: "Galley Supply Co.", price: "3495.00", by: "Codex" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before it arrives",
      look: "today",
      items: [
        {
          want: "Line up an installer for the dishwasher, plumbing and electrical",
          status: "in_progress",
          updates: [{ title: "Three local installers found, two answer quote requests online", body: "Contact pages and service areas are linked. You'll need to call the third.", links: ["https://example.com/installers"], by: "Claude" }],
        },
        {
          want: "Measure the delivery path from the back door to the dish pit",
          dueInDays: 2,
          details: "The unit crate is 27 inches wide.",
        },
        { want: "Ask the landlord about the 208V circuit", status: "done", doneNote: "Panel has a spare breaker; electrician confirmed." },
        { want: "Book the health inspection follow-up once the new unit is in" },
      ],
    },
    research: {
      format: "research",
      title: "Before buying",
      look: "doc",
      items: [
        {
          want: "High-temp or low-temp dishwasher for a 40-seat café?",
          accepted: 0,
          updates: [
            {
              title: "High-temp: no sanitizer chemicals and faster drying",
              body: "Needs a booster heater and usually a hood check. Higher power cost, lower chemical cost.",
              links: ["https://example.org/dishwasher-guide"],
              by: "Claude",
            },
            {
              title: "Low-temp: cheaper to buy and run on 120V",
              body: "Ongoing sanitizer cost and slower drying; some glassware spots.",
              by: "ChatGPT",
            },
          ],
        },
        {
          want: "What should a reconditioned equipment warranty cover?",
          status: "in_progress",
          updates: [
            {
              title: "Parts and labor for at least 90 days is common",
              body: "Ask what was replaced and whether the warranty is the dealer's or a third party's. Read the dealer terms before paying.",
              links: ["https://example.com/reconditioned-warranty"],
              by: "Gemini",
            },
          ],
        },
        { want: "Does the local utility offer a rebate on efficient commercial dishwashers?" },
      ],
    },
  },
} satisfies Persona;
