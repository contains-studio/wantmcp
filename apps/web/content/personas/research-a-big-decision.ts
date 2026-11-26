import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "research-a-big-decision",
  order: 49,
  group: "research",
  opens: "research",
  title: "Research a big decision and keep the sources",
  description:
    "Write the question once: lease or buy, fiber or cable, patch or replace. Your AI agent answers with sources, and the answer you accept stays on the list.",
  h1: "Keep the answer to a big decision",
  intro: "Put each decision on a private list as a question. Ask your agents for answers with sources, compare them, and accept the one you'll act on.",
  label: "Researching a big decision",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "If we switch to fiber",
      description: "What the switch would cost us up front.",
      look: "sheet",
      items: [
        {
          want: "A mesh Wi-Fi system for a two-floor house",
          details: "Needs one Ethernet port on each unit for the desk and the TV.",
          products: [
            { title: "Waypoint Mesh AX3000, 3-pack", store: "Harbor Electronics", price: "219.99", was: "279.99", earlier: ["279.99", "249.99"], by: "Claude", note: "Each unit has two Ethernet ports." },
            { title: "Lumen Home Wi-Fi 6E, 2-pack", store: "Signal & Sons", price: "189.00", by: "Gemini", note: "Two units only; may not reach the basement." },
          ],
        },
        {
          want: "A 25-foot Cat 6 cable for the office",
          bought: 0,
          products: [
            { title: "Flat Cat 6 patch cable, 25 ft, white", store: "Wirebox Supply", price: "11.49", by: "ChatGPT" },
            { title: "Braided Cat 6 cable, 25 ft", store: "Harbor Electronics", price: "15.99", was: "19.99", by: "Claude" },
          ],
        },
        {
          want: "A small battery backup for the router and modem",
          products: [
            { title: "PowerNest 600VA compact UPS", store: "Signal & Sons", price: "74.99", was: "89.99", by: "Gemini", coupon: "NEST10" },
            { title: "Brightcell 425VA backup, 6 outlets", store: "Wirebox Supply", price: "59.00", by: "ChatGPT" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before we decide",
      look: "today",
      items: [
        {
          want: "Pull the last 12 internet bills into one total",
          details: "Include the equipment rental line.",
          status: "in_progress",
          updates: [{ title: "Nine of twelve bills added up", body: "The modem rental adds $15 a month that isn't in the advertised price. Three statements are still missing from the downloads folder.", by: "Claude" }],
        },
        { want: "Find the cable contract's end date and early-cancellation fee", dueInDays: 4, updates: [{ title: "Contract ends March 14", body: "The account page lists a $10 fee for each month left, so canceling in January would cost about $20.", links: ["https://example.com/account/contract"], by: "ChatGPT" }] },
        { want: "Get two roofers to look at the leak over the porch", status: "done", doneNote: "Both came out. Quotes are in the research list." },
        { want: "Decide by the end of the month and tell the insurance company if the roof changes" },
      ],
    },
    research: {
      format: "research",
      title: "Decisions we're weighing",
      look: "doc",
      items: [
        {
          want: "Lease or buy the next car, if we drive about 9,000 miles a year?",
          details: "We usually keep a car seven or eight years.",
          accepted: 0,
          updates: [
            { title: "Buy: keeping it eight years beats two leases", body: "Using the illustrative quotes on file, two three-year leases cost about $4,000 more than a loan paid off in year five, and the car keeps resale value after that.", links: ["https://example.org/lease-vs-buy", "https://example.com/loan-quote"], by: "Claude" },
            { title: "Lease only if you want a new car every three years", body: "A lease wins on monthly cost and repairs, but at 9,000 miles a year you'd pay for mileage you don't use.", links: ["https://example.org/lease-terms"], by: "Gemini" },
          ],
        },
        {
          want: "Patch the porch roof now or replace the whole roof this year?",
          status: "in_progress",
          updates: [{ title: "Patch now, plan the full roof in two to three years", body: "Both roofers said the rest of the shingles are sound. The patch quote is $650; a full replacement is $14,000 to $16,500. Waiting on whether the patch voids anything on the policy.", links: ["https://example.com/quotes/roof"], by: "ChatGPT" }],
        },
        { want: "Is fiber worth $20 a month more than our cable plan?", details: "Two people working from home, lots of video calls." },
      ],
    },
  },
} satisfies Persona;
