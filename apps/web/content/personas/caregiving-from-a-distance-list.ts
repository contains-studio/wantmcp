import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "caregiving-from-a-distance-list",
  order: 21,
  group: "home",
  opens: "tasks",
  title: "Arranging care for a relative from a distance",
  description:
    "A private family list for helping a relative from out of town: home fixes, rides, purchases and updates. Your AI agent does the looking up, with sources.",
  h1: "Arrange help for a relative from afar",
  intro: "Keep the jobs, buys and questions in one private list the family shares. Your agent looks things up; everyone sees what is done and what is next.",
  label: "Caring from a distance",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Help at home",
      description: "Private. Shared with the family.",
      look: "sheet",
      items: [
        {
          want: "Two grab bars for the shower, 24 inches",
          details: "The shower walls are fiberglass.",
          products: [
            { title: "Stainless grab bar, 24 in, textured", store: "Keystone Hardware", price: "34.99", was: "42.99", by: "Claude" },
            { title: "Grab bar with wall anchors for hollow walls, 24 in", store: "Ridgeway Home Supply", price: "48.00", by: "Gemini", note: "Maker lists fiberglass and tile installs." },
          ],
        },
        {
          want: "A shower chair with a back",
          bought: 0,
          products: [
            { title: "Adjustable shower chair with backrest", store: "Comfort Living Supply", price: "54.99", earlier: ["64.99", "59.99"], by: "ChatGPT" },
            { title: "Folding shower seat, wall-mounted", store: "Keystone Hardware", price: "89.00", by: "Claude" },
          ],
        },
        {
          want: "Motion night lights for the hall and bathroom",
          products: [
            { title: "Plug-in motion night light, 4-pack", store: "Harbor Electronics", price: "21.99", was: "27.99", by: "Codex" },
            { title: "Battery motion light strip, 2-pack", store: "Ridgeway Home Supply", price: "18.50", by: "Grok" },
          ],
        },
        {
          want: "Non-slip bath mat and a new hall runner",
          products: [
            { title: "Rubber-backed bath mat, 20 x 32 in", store: "Linen Lane", price: "22.00", by: "Muse" },
            { title: "Low-profile hall runner, 2 x 8 ft", store: "Woven Path", price: "45.00", by: "Claude", coupon: "HOME10" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Things to arrange",
      look: "today",
      items: [
        {
          want: "Find a handyman to install the grab bars",
          status: "in_progress",
          updates: [{ title: "Three handymen near their ZIP code", body: "Two list grab-bar installs on their sites. Waiting on you: which day someone can be there.", by: "Claude" }],
        },
        { want: "Arrange a ride to the eye appointment on the 14th", dueInDays: 9 },
        { want: "Send this week's update to the family", status: "done", doneNote: "Sent Sunday: bath mat delivered, handyman being booked." },
        { want: "Swap the loose hall rug for the new runner" },
      ],
    },
    research: {
      format: "research",
      title: "Questions to answer",
      look: "doc",
      items: [
        {
          want: "What ride services take older riders to appointments in their county?",
          accepted: 0,
          updates: [
            { title: "The county's senior ride program", body: "Book two days ahead by phone; rides stay within the county, suggested donation per trip.", links: ["https://example.org/county-senior-rides"], by: "Claude" },
            { title: "A volunteer driver network", body: "Free rides for medical appointments; book a week ahead online or by phone.", links: ["https://example.com/volunteer-drivers"], by: "ChatGPT" },
          ],
        },
        {
          want: "Who in their area does home safety checks?",
          status: "in_progress",
          updates: [{ title: "The local aging services office lists two", body: "Both visit the home and suggest changes; one has no fee. Ask them about eligibility directly.", links: ["https://example.org/aging-services"], by: "Gemini" }],
        },
        { want: "Do grab bars mount safely on fiberglass shower walls?" },
      ],
    },
  },
} satisfies Persona;
