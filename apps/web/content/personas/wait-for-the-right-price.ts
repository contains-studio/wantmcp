import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "wait-for-the-right-price",
  order: 2,
  group: "deals",
  title: "Wait for your price, with every check on record",
  description:
    "Write down the exact model and the price you'll pay. Each time your agent re-checks, the new price joins the history, so you can see when it's time to buy.",
  h1: "Buy when it reaches your price",
  intro: "Name the model and your number. Ask your agent to re-check, or set up a schedule in your assistant, and every price it posts lands in the item's history.",
  label: "Waiting for a target price",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Buy at my number",
      description: "Exact models, target prices in the details.",
      look: "tracker--cyber-monday",
      items: [
        {
          want: "35mm f/1.4 lens for my mirrorless camera, new or mint used",
          details: "Target: $380 or less. Used only from a seller with a return window.",
          products: [
            { title: "35mm f/1.4 prime lens, new", store: "Lakeside Camera", price: "449.00", was: "529.00", earlier: ["529.00", "499.00", "479.00"], by: "Claude", checkedHoursAgo: 6 },
            { title: "35mm f/1.4 prime lens, mint used", store: "Shutter Exchange", price: "389.00", earlier: ["419.00"], by: "Gemini", note: "Rated mint by the seller, 90-day warranty, lens caps included." },
          ],
        },
        {
          want: "Dual-boiler espresso machine",
          details: "Target: $1,100. Must have a PID and a water line option is a bonus.",
          products: [
            { title: "Twin-boiler espresso machine with PID", store: "Copperline Kitchen", price: "1199.00", was: "1399.00", earlier: ["1399.00", "1349.00"], by: "ChatGPT", image: "espresso" },
            { title: "Dual-boiler machine, plumb-in ready", store: "Roast & Steam", price: "1249.00", by: "Claude", coupon: "CYBER10", note: "The code takes 10% off at checkout, which would bring it to $1,124.10." },
          ],
        },
        {
          want: "Commuter e-bike with a rear rack",
          details: "Target: $1,500. Medium frame, hydraulic brakes.",
          products: [
            { title: "City commuter e-bike, medium, 500Wh battery", store: "Spoke & Current", price: "1599.00", was: "1899.00", earlier: ["1899.00", "1749.00"], by: "Grok" },
            { title: "Step-through e-bike with rack, medium", store: "Northway Supply", price: "1649.00", by: "ChatGPT" },
          ],
        },
        {
          want: "Flat-burr coffee grinder",
          details: "Target: $300. Bought it when it hit the number.",
          bought: 0,
          products: [
            { title: "64mm flat-burr grinder, single dose", store: "Roast & Steam", price: "289.00", was: "349.00", earlier: ["349.00", "329.00"], by: "Claude", image: "grinder" },
            { title: "Flat-burr grinder with timer", store: "Copperline Kitchen", price: "319.00", by: "Gemini" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Price check routine",
      look: "today",
      items: [
        {
          want: "Set up a weekly scheduled run in my assistant to re-check this list",
          details: "Same products each time, so the history builds up instead of new entries.",
          status: "in_progress",
          updates: [{ title: "Schedule runs Sundays at 8 a.m.", body: "First run posted new prices on all four items. The lens dropped again; the e-bike didn't move.", by: "Claude" }],
        },
        { want: "Ask for Cyber Monday prices on everything still open", dueInDays: 6 },
        { want: "Write a target price under each item", status: "done", doneNote: "Targets set from last year's lowest prices I could find." },
        { want: "Decide if a used lens without the original box is fine" },
      ],
    },
    research: {
      format: "research",
      title: "Is the number realistic?",
      look: "doc",
      items: [
        {
          want: "Has this espresso machine ever sold for under $1,100?",
          accepted: 0,
          updates: [
            { title: "Yes, once, during last year's spring sale", body: "Archived store pages show $1,079 for about a week in April. Most of the year it sat at $1,349 or above.", links: ["https://example.com/espresso-price-archive"], by: "Claude" },
            { title: "Not new, but open-box units have", body: "Open-box listings went for $999 to $1,050 a few times this year, with a shorter warranty.", links: ["https://example.org/open-box"], by: "ChatGPT" },
          ],
        },
        {
          want: "When do e-bike shops usually cut prices?",
          status: "in_progress",
          updates: [{ title: "Late fall and when new model years arrive", body: "Two shops on this list marked down last year's models in November and again in February.", links: ["https://example.com/model-year"], by: "Gemini" }],
        },
        { want: "Is a mint used lens as sharp as a new one?" },
      ],
    },
  },
} satisfies Persona;
