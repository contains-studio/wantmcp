import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "wish-list-to-share",
  order: 7,
  group: "gifts",
  title: "A wish list with the exact size and model",
  description:
    "Write what you'd love, with size, color and fit. Your agent finds the exact versions with store and price, and anyone with the link can read the list.",
  h1: "Your wish list, down to the size",
  intro: "Note the details that matter to you. Your agent adds exact products from any store, and when someone asks what you want, you send one link they can read.",
  label: "Keeping a wish list",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Things I'd love this year",
      description: "Sizes and colors are in the details.",
      look: "sheet--birthday",
      items: [
        {
          want: "Hiking boots, women's 9 wide, not leather",
          details: "Waterproof, mid height. Anything but bright orange.",
          products: [
            { title: "Synthetic mid hiking boot, women's 9 wide, slate", store: "Trailhead Outfitters", price: "139.95", was: "164.95", by: "Claude", image: "shoe" },
            { title: "Vegan waterproof hiker, women's 9W, moss", store: "Ridge & River", price: "149.00", by: "Gemini" },
          ],
        },
        {
          want: "Burr grinder for pour-over",
          details: "Quiet enough for early mornings, under $200.",
          products: [
            { title: "Conical burr grinder, 40 settings", store: "Roast & Steam", price: "169.00", earlier: ["189.00", "179.00"], by: "ChatGPT", image: "grinder" },
            { title: "Hand grinder with steel burrs", store: "Copperline Kitchen", price: "119.00", by: "Claude", note: "Silent, but takes about a minute per cup." },
          ],
        },
        {
          want: "Merino vest, medium, dark green or navy",
          products: [
            { title: "Merino insulated vest, M, forest green", store: "Northway Supply", price: "98.00", was: "130.00", by: "Gemini", image: "vest" },
            { title: "Lightweight wool vest, M, navy", store: "Fieldstone", price: "84.50", by: "ChatGPT", image: "vest" },
          ],
        },
        {
          want: "Noise-canceling earbuds",
          details: "Bought these myself, so cross them off.",
          bought: 0,
          products: [
            { title: "Wireless ANC earbuds, charcoal", store: "Harbor Electronics", price: "129.00", was: "179.00", by: "Claude" },
            { title: "Sport earbuds with ear hooks", store: "Fieldstone", price: "99.99", by: "Grok" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Getting the list ready",
      look: "today",
      items: [
        {
          want: "Find exact versions for everything still vague",
          status: "in_progress",
          updates: [{ title: "Boots and vest narrowed to two each", body: "Both boots come in a true wide fit. Still looking for a navy vest under $100.", by: "Gemini" }],
        },
        { want: "Send the link to the family group chat", dueInDays: 5 },
        { want: "Mark the earbuds bought", status: "done", doneNote: "Bought them on sale myself." },
        { want: "Add the book series I keep mentioning" },
      ],
    },
    research: {
      format: "research",
      title: "Getting it right",
      look: "doc",
      items: [
        {
          want: "Do these boots run small in the wide fit?",
          accepted: 0,
          updates: [
            { title: "Trailhead's run true to size", body: "The fit guide says to order your usual size in the wide version.", links: ["https://example.com/boot-fit"], by: "Claude" },
            { title: "Ridge & River's suggest a half size up", body: "Their size chart recommends going up half a size for thick socks.", links: ["https://example.org/size-chart"], by: "Gemini" },
          ],
        },
        {
          want: "Which grinder setting range suits pour-over?",
          status: "in_progress",
          updates: [{ title: "Medium-fine, around the middle of the dial", body: "The conical grinder's manual puts pour-over at settings 14 to 22 of 40.", links: ["https://example.com/grinder-manual"], by: "ChatGPT" }],
        },
        { want: "Is a merino vest warm enough on its own in the fall?" },
      ],
    },
  },
} satisfies Persona;
