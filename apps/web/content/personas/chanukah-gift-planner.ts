import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "chanukah-gift-planner",
  order: 11,
  group: "gifts",
  title: "A Chanukah gift planner for all eight nights",
  description:
    "Plan Chanukah gifts, food and gatherings night by night. Your AI agent adds options with store, price and link, and you see what is ready for each evening.",
  h1: "Plan Chanukah night by night",
  intro: "Give each night its own wants and dates. Ask your agent for options, and the list shows what is chosen, bought and still open before each evening.",
  label: "Chanukah, night by night",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Chanukah gifts and supplies",
      description: "One line per night, plus the candles and the party.",
      look: "sheet--chanukah",
      items: [
        {
          want: "Night 2: a two-player card game for the cousins, under $30",
          details: "Ages 9 and 11. Quick rounds, nothing that needs an app.",
          products: [
            { title: "Pocket Duel strategy card game", store: "Lantern Games", price: "18.99", was: "24.99", by: "Claude" },
            { title: "Starfall two-player tile game", store: "Bramble Toy Co.", price: "26.50", by: "Gemini", note: "Ships in 2 to 4 business days." },
          ],
        },
        {
          want: "Night 5: a beginner watercolor set for Noa",
          products: [
            { title: "24-color travel watercolor set with water brushes", store: "Inkwell Art Supply", price: "32.00", earlier: ["38.00", "35.00"], by: "ChatGPT" },
            { title: "Student watercolor kit with pad", store: "Paper Moon Studio", price: "27.95", by: "Claude", coupon: "FIRSTORDER10" },
            { title: "Watercolor block, 9 x 12 in, 20 sheets", store: "Inkwell Art Supply", price: "14.50", by: "ChatGPT", note: "Add-on if the set has no paper." },
          ],
        },
        {
          want: "Candles for the whole holiday, two boxes",
          bought: 0,
          products: [
            { title: "Chanukah candles, box of 44, assorted colors", store: "Cedar & Olive Judaica", price: "7.99", by: "Grok" },
            { title: "Hand-dipped beeswax candles, box of 45", store: "Hilltop Candle Works", price: "22.00", by: "Claude" },
          ],
        },
        {
          want: "Dreidels and gelt for Saturday's gathering, about 15 kids",
          products: [
            { title: "Wooden dreidels, set of 15", store: "Bramble Toy Co.", price: "16.99", was: "21.99", by: "Muse" },
            { title: "Milk chocolate gelt, 24 mesh bags", store: "Sweet Hollow Candy", price: "19.80", by: "Claude", note: "Store says orders after the 10th may arrive late." },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before each night",
      look: "today--chanukah",
      items: [
        {
          want: "Order every gift that has to ship before the first night",
          status: "in_progress",
          updates: [{ title: "Four of six ordered", body: "The tile game and the watercolor paper are still open; both show delivery in under four days.", by: "Claude" }],
        },
        { want: "Shop for the latke dinner: potatoes, onions, oil, applesauce", dueInDays: 3, details: "Dinner for 14 on Saturday." },
        { want: "Polish the menorah and find the drip tray", status: "done", doneNote: "Done. The tray was in the box with the serving platters." },
        { want: "Wrap gifts and label each with its night" },
      ],
    },
    research: {
      format: "research",
      title: "Questions for the week",
      look: "doc",
      items: [
        {
          want: "Which night-2 game arrives soonest with standard shipping?",
          accepted: 0,
          updates: [
            { title: "Pocket Duel, two days sooner", body: "Lantern Games ships from a warehouse in the same state and quotes 2 business days; Bramble quotes 2 to 4.", links: ["https://example.com/lantern-shipping"], by: "Claude" },
            { title: "Either, if ordered by Monday", body: "Both stores show delivery before Thursday for orders placed by Monday at noon.", links: ["https://example.org/delivery-estimates"], by: "Gemini" },
          ],
        },
        {
          want: "How many pounds of potatoes for latkes for 14 people?",
          status: "in_progress",
          updates: [{ title: "About 7 to 8 pounds", body: "Most recipes plan on half a pound per person, with extra if latkes are the main dish.", links: ["https://example.com/latke-quantities"], by: "ChatGPT" }],
        },
        { want: "Is there a family candle-lighting nearby on the last night?" },
      ],
    },
  },
} satisfies Persona;
