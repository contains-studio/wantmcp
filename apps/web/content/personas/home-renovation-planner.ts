import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "home-renovation-planner",
  order: 26,
  group: "moving",
  title: "Plan a home renovation room by room, with specs and prices",
  description:
    "Keep each room's fixtures, measurements and prices on one list. Ask your AI agent to re-price anything before you order, and track the questions still open.",
  h1: "Every room's specs, prices and open questions",
  intro: "Write each fixture with the sizes that matter. Ask your agent to price it now and again before you order, and the price history stays on the list.",
  label: "Home renovation planning",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Renovation: fixtures by room",
      look: "sections",
      items: [
        {
          want: "Bathroom: wall-hung vanity, 24 inches wide, one faucet hole",
          details: "30 inches of wall between the door frame and the tub.",
          products: [
            { title: "24 in. floating vanity, white oak", store: "Stonegate Bath Supply", price: "489.00", earlier: ["529.00", "509.00"], by: "Claude" },
            { title: "24 in. wall-mount vanity, ceramic top", store: "Tilewright", price: "412.50", was: "465.00", by: "Grok", note: "Faucet sold separately." },
          ],
        },
        {
          want: "Bathroom: matte black single-handle faucet",
          bought: 0,
          products: [
            { title: "Single-hole bathroom faucet, matte black", store: "Stonegate Bath Supply", price: "134.00", by: "Codex" },
            { title: "Same finish, with pop-up drain", store: "Fixture Barn", price: "149.99", by: "Claude" },
          ],
        },
        {
          want: "Kitchen: under-cabinet lights for 11 feet of counter",
          products: [
            { title: "Plug-in LED light bars, 24 in., 3-pack", store: "Brightwire Lighting", price: "89.99", was: "119.99", by: "ChatGPT" },
            { title: "Hardwired LED tape kit, 12 ft", store: "Fixture Barn", price: "74.00", by: "Gemini", note: "Needs an electrician to wire it to the wall switch." },
          ],
        },
        {
          want: "Hallway: vinyl plank flooring, about 120 square feet",
          details: "Order 10% extra for cuts.",
          products: [
            { title: "Waterproof vinyl plank, oak look, 23.6 sq ft per box", store: "Floorhaus Direct", price: "52.00", by: "Claude", note: "Price per box; 6 boxes cover 141 sq ft." },
            { title: "Rigid-core vinyl plank, 20 sq ft per box", store: "Tilewright", price: "46.75", coupon: "SPRING10", by: "Codex" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Renovation schedule",
      look: "tracker",
      items: [
        {
          want: "Collect lead times for everything in the bathroom",
          status: "in_progress",
          updates: [{ title: "Vanity 3 weeks, faucet in stock, tile 5 to 6 weeks", body: "To keep the tile setter's start date, the tile has to be ordered by the 14th.", links: ["https://example.com/lead-times"], by: "Claude" }],
        },
        { want: "Order bathroom tile so it arrives before demolition", dueInDays: 12 },
        { want: "Choose the grout color with the tile setter" },
        { want: "Measure the hallway again once the carpet is up", status: "done", doneNote: "118 sq ft, and the subfloor is level." },
      ],
    },
    research: {
      format: "research",
      title: "Questions before we order",
      look: "doc",
      items: [
        {
          want: "Can the bathroom wall hold a wall-hung vanity without extra blocking?",
          accepted: 0,
          updates: [
            { title: "Not safely: add blocking between the studs", body: "The vanity's install guide calls for 2x6 blocking behind the drywall. With studs 16 inches apart, two of the bracket holes miss them.", links: ["https://example.com/vanity-install-guide"], by: "Gemini" },
            { title: "Heavy-duty anchors may be enough", body: "Based on a forum thread, not the manufacturer's guide.", links: ["https://example.org/forum-thread"], by: "ChatGPT" },
          ],
        },
        {
          want: "Does vinyl plank on a concrete slab need a vapor barrier?",
          status: "in_progress",
          updates: [{ title: "Yes, a 6-mil barrier, or the warranty doesn't apply", body: "Both flooring makers' warranties require it on concrete; one sells a combined underlayment.", links: ["https://example.com/flooring-warranty"], by: "Claude" }],
        },
        { want: "Do we need a permit to move the bathroom light switch?" },
      ],
    },
  },
} satisfies Persona;
