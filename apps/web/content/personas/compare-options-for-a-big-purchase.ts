import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "compare-options-for-a-big-purchase",
  order: 3,
  group: "deals",
  title: "Compare options before a big purchase",
  description:
    "Put one expensive decision on a single page: the shortlist, today's prices, the catch with each option and the questions still open, ready to share.",
  h1: "One big purchase, side by side",
  intro: "Write the sizes, budget and must-haves once. Your agent posts the shortlist with prices and reasons, and the page stays put for whoever is deciding with you.",
  label: "Comparing a big purchase",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "New washer and dryer",
      description: "Laundry closet is 30 inches deep with a 33-inch door.",
      look: "sheet",
      items: [
        {
          want: "Front-load washer, 27 inches wide, quiet on spin",
          details: "Under $1,000. Must fit a 30-inch-deep closet with the door closed.",
          products: [
            { title: "Front-load washer, 4.5 cu ft, 27 x 29.7 in", store: "Brightwater Appliance", price: "849.00", was: "1049.00", earlier: ["1049.00", "929.00"], by: "Claude", note: "29.7 inches deep without the door; leaves room for hoses." },
            { title: "Compact-depth front loader, 4.3 cu ft", store: "Hollis Home Supply", price: "899.99", by: "ChatGPT", note: "Quietest spin rating of the three on the maker's spec sheet." },
            { title: "Steam front-load washer, 4.5 cu ft", store: "Brightwater Appliance", price: "979.00", was: "1199.00", by: "Claude", note: "31 inches deep: too deep for the closet." },
          ],
        },
        {
          want: "Matching electric dryer that stacks",
          products: [
            { title: "Electric dryer, 7.4 cu ft, stackable", store: "Brightwater Appliance", price: "799.00", was: "999.00", by: "Claude" },
            { title: "Heat-pump dryer, ventless, 4.0 cu ft", store: "Hollis Home Supply", price: "1149.00", by: "ChatGPT", note: "No vent needed, but loads take longer." },
          ],
        },
        {
          want: "Stacking kit for the pair we pick",
          products: [
            { title: "Universal stacking kit, 27-inch units", store: "Hollis Home Supply", price: "39.99", by: "Codex" },
            { title: "Maker-matched stacking kit with pull-out shelf", store: "Brightwater Appliance", price: "69.00", by: "Claude" },
          ],
        },
        {
          want: "Steel-braided water hoses",
          bought: 0,
          products: [
            { title: "Braided washer hoses, 5 ft, pair", store: "Corner Hardware", price: "21.49", by: "Codex" },
            { title: "Burst-proof hoses with auto shutoff, pair", store: "Hollis Home Supply", price: "34.99", by: "ChatGPT" },
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
          want: "Compare delivery, install and haul-away for each store",
          status: "in_progress",
          updates: [{ title: "Brightwater includes haul-away, Hollis charges $35", body: "Both deliver next week. Brightwater's install covers stacking; Hollis leaves the units in the box.", links: ["https://example.com/delivery-terms"], by: "ChatGPT" }],
        },
        { want: "Pick the pair together and order", dueInDays: 4 },
        { want: "Measure the closet, the door and the hallway turn", status: "done", doneNote: "Closet 30 in deep, door 33 in, hallway 36 in." },
        { want: "Check whether the old dryer vent needs cleaning first" },
      ],
    },
    research: {
      format: "research",
      title: "Questions before spending this much",
      look: "doc",
      items: [
        {
          want: "Heat-pump or vented dryer for a closet with no window?",
          accepted: 0,
          updates: [
            { title: "Vented, since the closet already has a vent", body: "The existing vent makes a standard dryer the simpler fit. A heat-pump model is worth it mainly where there's no vent at all.", links: ["https://example.org/dryer-types"], by: "Claude" },
            { title: "Heat-pump, if lower running cost matters more", body: "It uses less electricity per load but takes longer and holds less.", links: ["https://example.com/heat-pump-dryers"], by: "Gemini" },
          ],
        },
        {
          want: "Does the stacked pair need a 240-volt outlet?",
          status: "in_progress",
          updates: [{ title: "The vented dryer does; the heat-pump one doesn't", body: "The manuals list 240V for the 7.4 cu ft dryer and a standard 120V outlet for the heat-pump model.", links: ["https://example.com/install-guide"], by: "Claude" }],
        },
        { want: "Is the five-year extended warranty worth adding?" },
      ],
    },
  },
} satisfies Persona;
