import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "community-recommendation-list",
  order: 61,
  group: "publishing",
  title: "One recommendation list for your community",
  description:
    "Keep your group's go-to picks on one public list. You and the co-moderators you invite keep it current; members read one link instead of asking again.",
  h1: "Your community's picks, kept in one list",
  intro: "Post one link for the question everyone asks. You and the moderators you invite keep it current with your agents' help; members read it on the web.",
  label: "Community recommendation lists",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "New member starter kit: home espresso",
      description: "The group's current picks, re-priced before sale season.",
      look: "sheet",
      items: [
        {
          want: "A first burr grinder under $150",
          details: "Has to grind fine enough for espresso, not just drip.",
          products: [
            { title: "Conical burr grinder, 40 settings", store: "Crema Supply Co.", price: "129.00", was: "149.00", by: "Claude", image: "grinder" },
            { title: "Flat burr hand grinder", store: "Steamline Coffee", price: "89.00", by: "Grok", image: "grinder", note: "Hand crank. The group's pick for people who also make pour-over." },
          ],
        },
        {
          want: "An entry espresso machine with a steam wand",
          products: [
            { title: "Single-boiler espresso machine, 58 mm", store: "Crema Supply Co.", price: "399.00", earlier: ["449.00", "429.00"], by: "ChatGPT", image: "espresso" },
            { title: "Compact thermoblock espresso machine", store: "Steamline Coffee", price: "279.99", was: "329.99", by: "Codex", image: "espresso" },
          ],
        },
        {
          want: "A scale with a 0.1 g readout and a timer",
          products: [
            { title: "Drip scale with built-in timer", store: "Steamline Coffee", price: "34.00", by: "Gemini" },
            { title: "Slim espresso scale, fits under the cup", store: "Crema Supply Co.", price: "49.00", by: "Claude" },
          ],
        },
        {
          want: "A 12 oz milk pitcher for latte art",
          products: [
            { title: "Stainless steel pitcher, 12 oz", store: "Bean & Burr", price: "16.50", by: "Muse" },
            { title: "Pitcher with measuring lines, 12 oz", store: "Steamline Coffee", price: "19.00", was: "24.00", by: "ChatGPT", coupon: "FOAM5" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Moderator upkeep",
      look: "board",
      items: [
        {
          want: "Re-price the starter kit before the holiday sale thread",
          status: "in_progress",
          updates: [
            {
              title: "Grinders and scales re-checked",
              body: "The conical grinder is $20 lower than last month. Machines are next.",
              by: "Claude",
            },
          ],
        },
        { want: "Retire any pick that's been discontinued", details: "Replace it, or leave the slot empty with a note.", dueInDays: 3 },
        { want: "Pin the list link in the welcome post and the FAQ", status: "done", doneNote: "Pinned in both. The welcome post now just says \"start here\"." },
        {
          want: "Invite the two co-moderators to the list",
          details: "Invited members can add picks and tick things off on the web, with or without an agent.",
        },
      ],
    },
    research: {
      format: "research",
      title: "Questions new members keep asking",
      look: "doc",
      items: [
        {
          want: "Is a blade grinder good enough for espresso?",
          accepted: 0,
          updates: [
            { title: "No: it can't grind evenly enough", body: "Espresso needs a fine, even grind; blade grinders leave a mix of dust and chunks, so shots run unevenly.", links: ["https://example.org/grind-size"], by: "Claude" },
            { title: "It works if you sift the grounds", body: "Possible, but slow, and most guides still recommend a burr grinder.", links: ["https://example.com/sifting"], by: "Gemini" },
          ],
        },
        {
          want: "Is a used machine a sensible first buy?",
          status: "in_progress",
          updates: [
            {
              title: "Often, if you can check three things",
              body: "Ask about descaling history, test the steam wand, and check the gasket. Still drafting what to look out for by model type.",
              links: ["https://example.org/used-machines"],
              by: "ChatGPT",
            },
          ],
        },
        { want: "What water hardness is safe for a home machine?" },
      ],
    },
  },
} satisfies Persona;
