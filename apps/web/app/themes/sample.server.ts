/**
 * The sample lists every theme is shown with: the home page, the gallery (/themes) and the
 * settings preview. Static data in US terms; stores, products and prices are invented, and the
 * list says it is a sample (app/lib/samples.ts).
 */
import { buildSample, type SampleListSpec } from "~/lib/samples";
import type { ListFormat } from "~/lib/types";

export const SAMPLE_SPECS: Record<ListFormat, SampleListSpec> = {
  shopping: {
    format: "shopping",
    title: "Holiday shopping",
    items: [
      {
        want: "A 65-inch TV for the living room, under $900",
        details: "Mostly movies and football. Wall-mounted, so the stand doesn't matter.",
        products: [
          { title: "Brightline 65\" QLED 4K", store: "Harbor Electronics", price: "649.99", was: "799.99", earlier: ["799.99"], by: "Muse", image: "monitor", coupon: "HOLIDAY25", note: "Coupon takes another $25 off at checkout." },
          { title: "Norden 65\" OLED Series 4", store: "Fieldstone", price: "879.00", was: "1199.00", by: "ChatGPT", image: "monitor-b" },
          { title: "Vantage 65\" Mini-LED", store: "Kettle & Pine", price: "899.99", was: "999.99", by: "Claude" },
        ],
      },
      {
        want: "A stand mixer that can handle bread dough",
        products: [
          { title: "Tilt-head stand mixer, 5.5 qt", store: "Copperline Kitchen", price: "279.00", was: "349.00", by: "Claude", image: "espresso" },
          { title: "Bowl-lift mixer, 6 qt, 575 W", store: "Maple Street Home", price: "329.95", by: "Codex" },
        ],
      },
      {
        want: "Snow tires for the sedan before the first storm",
        details: "215/55R17, set of four, installed.",
        bought: 0,
        products: [
          { title: "Winter tire 215/55R17, set of 4, installed", store: "Northway Tire", price: "612.00", was: "680.00", by: "ChatGPT" },
          { title: "Studless winter tire, set of 4", store: "Route 9 Auto", price: "588.00", by: "Claude" },
        ],
      },
    ],
  },
  tasks: {
    format: "tasks",
    title: "Moving on the 15th",
    description: "Everything to sort before the truck comes.",
    items: [
      {
        want: "Transfer the internet service to the new apartment",
        details: "Account is in my name. Ask about the installation fee.",
        status: "in_progress",
        dueInDays: 3,
        updates: [{ title: "Booked: free transfer, install on the 16th", body: "Held the 16th, the day after we move. They need a yes by Friday.", links: ["https://example.com/moving"], by: "Claude" }],
      },
      {
        want: "Get three quotes from moving companies",
        details: "One-bedroom, third floor, elevator.",
        dueInDays: 1,
        updates: [{ title: "Two quotes in, one to come", body: "$1,180 and $1,345 so far, both with packing materials.", by: "ChatGPT" }],
      },
      { want: "Reserve a parking spot for the moving truck" },
      { want: "Set up mail forwarding", status: "done", doneNote: "Twelve months, done online." },
    ],
  },
  research: {
    format: "research",
    title: "Before we replace the furnace",
    description: "Questions to answer before getting quotes.",
    items: [
      {
        want: "What would a heat pump cost to run in a year?",
        details: "Three bedrooms, about 900 therms of gas a year.",
        accepted: 0,
        updates: [
          { title: "About $1,300 to $1,700 a year", body: "At a seasonal efficiency of 3 to 3.5, 900 therms of heat is roughly 7,500 to 8,800 kWh of electricity. At 18¢ a kWh that's $1,350 to $1,580, plus the fixed charges you already pay.", links: ["https://example.org/running-costs"], by: "Claude" },
          { title: "Roughly what you pay for gas now", body: "A rule of thumb: divide your therms by 3.4 and multiply by your price per kWh.", by: "ChatGPT" },
        ],
      },
      {
        want: "Which rebates and tax credits apply?",
        status: "in_progress",
        updates: [{ title: "A utility rebate and a state program fit", body: "Both are claimed through the installer. Check the income limits before applying.", links: ["https://example.com/rebates"], by: "Codex" }],
      },
      { want: "How loud is the outdoor unit at night?" },
    ],
  },
};

export function sampleList(now = Date.now(), format: ListFormat = "shopping") {
  return buildSample(SAMPLE_SPECS[format], { now });
}
