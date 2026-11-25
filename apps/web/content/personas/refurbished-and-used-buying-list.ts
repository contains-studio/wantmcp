import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "refurbished-and-used-buying-list",
  order: 4,
  group: "deals",
  title: "Find a refurbished or used one that works",
  description:
    "List what you need and the condition you'll accept. Your agent compares refurbished, used and new, with the grade, warranty and return window for each.",
  h1: "Refurbished and used, with the catch spelled out",
  intro: "Say what it has to do and how long you need it to last. Your agent lays out refurbished, used and new options with the warranty and return terms next to each price.",
  label: "Buying refurbished or used",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Refurbished first",
      description: "Kept private. Warranty and returns noted on every option.",
      look: "sheet",
      items: [
        {
          want: "Laptop for schoolwork and video calls, 16 GB RAM",
          details: "At least a one-year warranty. A scuffed lid is fine; a weak battery isn't.",
          products: [
            { title: "14-inch business laptop, 16 GB, 512 GB SSD, refurbished grade A", store: "Renewed Tech Depot", price: "289.00", was: "349.00", earlier: ["319.00"], by: "Claude", note: "One-year warranty, 30-day returns, battery replaced before sale." },
            { title: "13-inch ultrabook, 16 GB, grade B", store: "Second Spin Electronics", price: "239.00", by: "ChatGPT", note: "Grade B means visible scratches. 90-day warranty only." },
            { title: "15-inch laptop, 16 GB, new", store: "Harbor Electronics", price: "479.99", was: "549.99", by: "Claude" },
          ],
        },
        {
          want: "Unlocked phone with good battery health",
          details: "Battery at 85% or better, works on any carrier.",
          products: [
            { title: "6.1-inch phone, 128 GB, unlocked, refurbished", store: "Renewed Tech Depot", price: "219.00", by: "Gemini", note: "Battery health listed at 89%. Charger not included." },
            { title: "6.1-inch phone, 128 GB, unlocked, used, good", store: "Trade-Up Mobile", price: "174.00", by: "Grok", note: "Battery 82%, below the line in the details. 14-day returns." },
          ],
        },
        {
          want: "Insulated winter coat, men's large",
          bought: 0,
          products: [
            { title: "Down parka, men's L, gently used", store: "Thread & Again Consignment", price: "48.00", by: "ChatGPT" },
            { title: "Insulated parka, men's L, last season's color", store: "Trailhead Outfitters", price: "79.00", was: "159.00", by: "Claude", coupon: "WARM20" },
          ],
        },
        {
          want: "Upright vacuum to replace the one that died",
          products: [
            { title: "Bagless upright vacuum, factory refurbished", store: "Renewed Home Goods", price: "64.99", by: "Codex", note: "Six-month warranty from the maker." },
            { title: "Bagless upright vacuum, open box", store: "Maple Street Home", price: "79.00", was: "119.00", by: "Claude" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before and after it arrives",
      look: "today",
      items: [
        {
          want: "Check each seller's returns and who pays return shipping",
          status: "in_progress",
          updates: [{ title: "Renewed Tech Depot pays return shipping", body: "Second Spin and Trade-Up charge a flat $9.99 label. All three refund to the original payment.", links: ["https://example.com/return-terms"], by: "Gemini" }],
        },
        { want: "Back up and wipe the old phone before trading it in", dueInDays: 3 },
        { want: "Confirm the laptop charger is included", status: "done", doneNote: "Seller confirmed a 65W charger in the box." },
        { want: "Test the battery and camera in the first week, inside the return window" },
      ],
    },
    research: {
      format: "research",
      title: "Is it a good refurb?",
      look: "doc",
      items: [
        {
          want: "What do grade A and grade B mean at these sellers?",
          accepted: 0,
          updates: [
            { title: "Grade is cosmetic; the warranty is the same at Renewed", body: "Renewed Tech Depot tests every unit the same way and grades only the casing. Second Spin's grade B also means a shorter warranty.", links: ["https://example.com/grading", "https://example.org/grading-b"], by: "Claude" },
            { title: "Grades aren't standard between stores", body: "Each seller writes its own scale, so compare the warranty and return window instead.", links: ["https://example.org/refurb-grades"], by: "ChatGPT" },
          ],
        },
        {
          want: "How can I tell a refurbished listing is legitimate?",
          status: "in_progress",
          updates: [{ title: "Look for a named warranty and a business address", body: "Both refurb stores on this list publish a warranty page and a returns address. The cheapest phone listing elsewhere had neither, so it's not on the list.", links: ["https://example.com/spot-a-fake"], by: "Claude" }],
        },
        { want: "Does a replaced battery affect the phone's water resistance?" },
      ],
    },
  },
} satisfies Persona;
