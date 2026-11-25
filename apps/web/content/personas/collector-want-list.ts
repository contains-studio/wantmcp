import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "collector-want-list",
  order: 29,
  group: "hobbies",
  title: "A want list for hard-to-find collectibles",
  description:
    "Write down the exact pieces you're hunting and the condition you'll accept. Ask your AI agent to look again whenever you like; every sighting stays on the list.",
  h1: "Your want list, with every sighting kept",
  intro: "Note each piece with the edition and condition you need. Ask your agent to search again whenever you like, and each find lands next to the last.",
  label: "Collector want list",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Still missing",
      description: "Kept private, so sellers don't see what I'd pay.",
      look: "default",
      items: [
        {
          want: "The Delmar Quintet, Harbor Lights, 1978 first pressing",
          details: "Record and sleeve both VG+ or better.",
          products: [
            { title: "Harbor Lights, 1978 first press, VG+/VG+", store: "Groove Cellar Records", price: "85.00", earlier: ["120.00", "95.00"], by: "Claude", note: "Same listing, relisted twice at a lower price." },
            { title: "Harbor Lights, 1978 pressing, sleeve VG, record NM", store: "Dusty Bin Vinyl", price: "64.00", by: "Gemini", note: "Sleeve has a split seam, per the seller's photos." },
          ],
        },
        {
          want: "Star Rangers #3, graded 6.0 or higher",
          bought: 0,
          products: [
            { title: "Star Rangers #3, graded 6.5", store: "Panel & Page Comics", price: "210.00", by: "ChatGPT" },
            { title: "Star Rangers #3, ungraded, about 5.5", store: "Attic Finds Collectibles", price: "140.00", by: "Claude" },
          ],
        },
        {
          want: "One blue-glaze teacup to complete a 1950s set",
          details: "Rim is 3.25 inches across; saucer not needed.",
          products: [
            { title: "Mid-century blue-glaze cup and saucer", store: "Bluebell Antiques", price: "38.00", was: "45.00", by: "Grok" },
            { title: "Blue-glaze cup only, small chip on the base", store: "Attic Finds Collectibles", price: "18.00", by: "Codex" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "The hunt",
      look: "today",
      items: [
        {
          want: "Ask the agent to search the record shops again on Sunday",
          status: "in_progress",
          updates: [{ title: "Sunday search: one new listing", body: "A copy at Groove Cellar dropped to $85. No new copies anywhere else since last week.", links: ["https://example.com/harbor-lights"], by: "Claude" }],
        },
        { want: "Bring a printout of the want list to the antique fair", dueInDays: 11 },
        { want: "Decide whether the comic needs a certified grade" },
        { want: "Measure the teacups I already have", status: "done", doneNote: "Rim 3.25 inches, height 2.5 inches." },
      ],
    },
    research: {
      format: "research",
      title: "Before I buy",
      look: "doc",
      items: [
        {
          want: "How can I tell a 1978 first pressing from the 1985 reissue?",
          accepted: 0,
          updates: [
            { title: "Check the matrix number in the runout groove", body: "First pressings end in A1, and the reissue has a barcode on the back sleeve. Both points come from a collectors' discography.", links: ["https://example.org/discography"], by: "Claude" },
            { title: "The label color differs", body: "Says the reissue uses a later label, but one linked listing shows the early label on a reissue.", links: ["https://example.com/label-photos"], by: "ChatGPT" },
          ],
        },
        {
          want: "What have graded copies of Star Rangers #3 sold for this year?",
          status: "in_progress",
          updates: [{ title: "Four sales between $180 and $260", body: "From two auction archives; all graded 6.0 to 7.0.", links: ["https://example.org/auction-results"], by: "Gemini" }],
        },
        { want: "Is the chipped cup worth buying as a placeholder?" },
      ],
    },
  },
} satisfies Persona;
