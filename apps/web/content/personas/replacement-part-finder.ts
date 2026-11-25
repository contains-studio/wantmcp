import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "replacement-part-finder",
  order: 31,
  group: "hobbies",
  title: "Find the right replacement part before you order",
  description:
    "Write down what needs fixing and the model number. Your AI agent finds the part number with sources and who still sells it, so you can check before you order.",
  h1: "Find the exact part, with sources to check",
  intro: "Ask once which part fits and keep the sourced answer next to the stores that still sell it. Make the list public and the next person with the same fault can find it.",
  label: "Replacement part finder",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Parts to order",
      look: "sheet",
      items: [
        {
          want: "Turntable drive belt, flat, 5 mm by 543 mm",
          bought: 0,
          products: [
            { title: "Flat rubber drive belt, 5 x 543 mm", store: "Spinwell Audio Parts", price: "12.95", by: "Claude" },
            { title: "Turntable belt kit, three sizes", store: "Fixit Parts Supply", price: "18.50", by: "Codex" },
          ],
        },
        {
          want: "Dryer thermal fuse TF-196-B, or a listed substitute",
          products: [
            { title: "Thermal fuse TF-196-B", store: "Appliance Part Hub", price: "9.49", earlier: ["13.99", "11.25"], by: "Gemini" },
            { title: "Thermal fuse, 196°F, substitute for TF-196-B", store: "Fixit Parts Supply", price: "7.80", by: "Grok", note: "Same rating, but the connector is different; check the photo." },
          ],
        },
        {
          want: "Brush roll for the VX-20 upright vacuum",
          products: [
            { title: "VX-20 replacement brush roll", store: "Appliance Part Hub", price: "21.99", was: "27.99", by: "ChatGPT" },
            { title: "Brush roll with end caps, fits VX-20 and VX-22", store: "Benchtop Repair Co.", price: "18.00", coupon: "FIXIT5", by: "Claude" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Repair bench",
      look: "today",
      items: [
        {
          want: "Test the dryer's heating element before ordering the fuse",
          status: "in_progress",
          updates: [{ title: "Test steps from the service manual", body: "Unplug, remove the back panel, and check the element with a multimeter. Around 10 ohms means it's fine and the fuse is the likely fault.", links: ["https://example.com/dryer-manual"], by: "Claude" }],
        },
        { want: "Take the toaster to the repair café", dueInDays: 5 },
        { want: "Post the accepted belt answer in the turntable forum" },
        { want: "Find the service manual for the TT-220", status: "done", doneNote: "Scanned copy found; the parts list is on page 14." },
      ],
    },
    research: {
      format: "research",
      title: "Which part fits?",
      look: "doc",
      items: [
        {
          want: "Which drive belt fits the TT-220 turntable?",
          details: "Model number from the plate under the platter.",
          accepted: 0,
          updates: [
            { title: "Flat belt, 5 mm wide, 543 mm inside length", body: "Matches the service manual's parts list and two repair threads. Measure the old belt too, as it may have stretched.", links: ["https://example.org/tt-220-manual", "https://example.org/repair-thread"], by: "Claude" },
            { title: "A square belt from the TT-200 series", body: "The source is a seller's listing; the manual lists a flat belt.", links: ["https://example.com/seller-listing"], by: "ChatGPT" },
          ],
        },
        {
          want: "Which thermal fuse does the DR-450 dryer use?",
          status: "in_progress",
          updates: [{ title: "TF-196-B, rated 196°F", body: "From the wiring diagram inside the back panel and the maker's parts lookup.", links: ["https://example.com/parts-lookup"], by: "Gemini" }],
        },
        { want: "Can the bike's 9-speed shifter work with an 8-speed cassette?" },
      ],
    },
  },
} satisfies Persona;
