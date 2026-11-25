import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "check-fit-before-ordering",
  order: 37,
  group: "delegating",
  title: "Check measurements and delivery before you order",
  description:
    "Put your must-have measurements on the list: seat height, weight, doorway width, delivery to the room. Your agent checks each option against them, with sources.",
  h1: "Check the fit before you order",
  intro: "Write the measurements that matter on the item. Your agent checks each option against them and says where every number came from.",
  label: "Checking fit and delivery",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Living room: measured before ordering",
      description: "Every number comes from the store's spec sheet unless the note says otherwise.",
      look: "sheet",
      items: [
        {
          want: "An armchair with a seat height of 19 to 20 inches and firm arms",
          details: "Arms at least 8 inches above the seat. Must fit through a 30-inch doorway.",
          products: [
            { title: "High-seat armchair, oak frame", store: "Maple Street Home", price: "549.00", was: "649.00", by: "Claude", image: "chair-a", note: "Seat height 19.5 in, arms 9 in above the seat, 29 in deep. Spec sheet." },
            { title: "Wingback chair, upholstered", store: "Hearth & Table", price: "489.00", earlier: ["529.00", "509.00"], by: "Gemini", image: "chair-b", note: "Seat height 18 in on the spec sheet: below the range. The store says taller legs are sold separately." },
          ],
        },
        {
          want: "A sofa that fits through a 30-inch door and a tight hallway turn",
          details: "Detachable legs or arms. Delivered into the living room, not left at the door.",
          products: [
            { title: "Three-seat sofa, arms come off, 32 in deep", store: "Fieldstone", price: "1199.00", by: "ChatGPT", note: "Packed depth 29 in with arms off. Room-of-choice delivery is $79 extra." },
            { title: "Modular sofa, three boxed pieces", store: "Kettle & Pine", price: "1349.00", was: "1599.00", by: "Claude", note: "Largest box 28 x 38 x 34 in. Free delivery to any room; carriers assemble on request." },
          ],
        },
        {
          want: "A side table under 10 pounds with a 24-inch top height",
          bought: 0,
          products: [
            { title: "Round side table, 24 in high, 7 lb", store: "Northway Supply", price: "89.00", by: "Codex", note: "Weight from the shipping details; height from the spec sheet." },
            { title: "Two-tier side table, 25 in high", store: "Copperline Kitchen", price: "74.99", was: "94.99", by: "Gemini", note: "Weight not listed anywhere; marked unconfirmed." },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Before anything is ordered",
      look: "today",
      items: [
        {
          want: "Ask each store whether the delivery crew carries items to the room and takes the packaging",
          status: "in_progress",
          updates: [{ title: "Two of three stores answered", body: "Kettle & Pine includes it at no charge. Fieldstone charges $79 and removes packaging. Maple Street Home hasn't replied to the email.", by: "Claude" }],
        },
        {
          want: "Confirm the sofa's packed dimensions with the store, not just the listing",
          dueInDays: 2,
          updates: [{ title: "Sent the question through the store's chat form", body: "Asked for the packed box size with arms off, and whether the legs ship in a separate box.", by: "ChatGPT" }],
        },
        { want: "Write down the doorway and hallway measurements in one place" },
        { want: "Measure the front door, hallway and living room doorway", status: "done", doneNote: "Front door 32 in, hallway 36 in, living room door 30 in." },
      ],
    },
    research: {
      format: "research",
      title: "Will it fit?",
      look: "doc",
      items: [
        {
          want: "Will a 29-inch-deep box turn from a 36-inch hallway into a 30-inch doorway?",
          accepted: 0,
          updates: [
            { title: "Probably yes, if it stays under 80 inches long", body: "A furniture fit chart for right-angle turns lists up to 80 inches of length for a 29-inch depth through these widths. Measuring the turn diagonal will confirm it.", links: ["https://example.org/doorway-fit-chart"], by: "Claude" },
            { title: "Tilting it on end adds clearance", body: "Delivery crews often stand long boxes on end to make the turn, which the same guide covers for ceilings over 8 feet.", links: ["https://example.org/doorway-fit-chart#tilting"], by: "Gemini" },
          ],
        },
        {
          want: "What does the armchair weigh, and can it be moved without lifting?",
          status: "in_progress",
          updates: [{ title: "42 pounds; no casters listed", body: "Shipping weight is 51 pounds with the box. The listing doesn't mention glides or casters; checking the assembly guide.", links: ["https://example.com/high-seat-chair/specs"], by: "Grok" }],
        },
        { want: "Which stores offer free returns picked up from inside the home?" },
      ],
    },
  },
} satisfies Persona;
