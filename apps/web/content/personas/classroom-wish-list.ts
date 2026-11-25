import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "classroom-wish-list",
  order: 47,
  group: "work",
  title: "A classroom wish list priced across stores",
  description:
    "Post what the classroom needs on a public list families and donors can read. Your AI agent finds a good price at several stores, so each dollar goes further.",
  h1: "A classroom wish list, priced for donors",
  intro: "List the supplies the room needs. Your agent adds the best pack prices it finds, and anyone with the link can see what's needed and where to buy it.",
  label: "Classroom wish list",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Room 12 supply wish list",
      description: "Public so families can read it. Marked bought when items arrive.",
      look: "sheet",
      items: [
        {
          want: "Glue sticks, 60 count",
          details: "Washable, purple-to-clear. They run out by October every year.",
          products: [
            { title: "Washable glue sticks, 60-pack", store: "Schoolhouse Supply", price: "18.99", was: "24.99", earlier: ["24.99", "21.49"], by: "ChatGPT" },
            { title: "Disappearing purple glue sticks, 48-pack", store: "Paper Trail Supply", price: "13.40", by: "Claude", note: "Per stick, slightly cheaper than the 60-pack." },
          ],
        },
        {
          want: "Class set of wired headphones for the reading center, 24",
          products: [
            { title: "Kids' wired headphones, 24-pack with bins", store: "Learnwell Classroom", price: "119.00", by: "Gemini" },
            { title: "Durable classroom headphones, set of 24", store: "Schoolhouse Supply", price: "98.50", was: "126.00", by: "ChatGPT", coupon: "TEACH10" },
          ],
        },
        {
          want: "Dry-erase lapboards with markers, 30",
          bought: 0,
          products: [
            { title: "Lapboard class pack, 30 boards, markers and erasers", store: "Learnwell Classroom", price: "64.99", by: "Claude" },
            { title: "Double-sided dry-erase boards, 30", store: "Paper Trail Supply", price: "71.00", by: "Grok" },
          ],
        },
        {
          want: "Tissues, 12 boxes",
          products: [
            { title: "Facial tissue, 12 boxes", store: "Northway Supply", price: "17.49", by: "Gemini" },
            { title: "2-ply tissues, 12-pack", store: "Maple Street Home", price: "15.99", was: "18.99", by: "ChatGPT" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Getting the list out",
      look: "today",
      items: [
        {
          want: "Write a short note for the family newsletter with the list link",
          status: "in_progress",
          updates: [{ title: "Three-sentence draft ready", body: "Thanks families, links the list, and says items already bought are marked. No student names.", by: "Claude" }],
        },
        {
          want: "Mark off what arrived this week",
          dueInDays: 3,
          details: "Check the box by the office before Friday's update.",
        },
        { want: "Check the school's policy on asking families for supplies", status: "done", doneNote: "Allowed if optional and sent through the newsletter." },
        { want: "Ask the agent to re-check prices before winter break" },
      ],
    },
    research: {
      format: "research",
      title: "Supply questions",
      look: "doc",
      items: [
        {
          want: "Wired or wireless headphones for a reading center?",
          accepted: 0,
          updates: [
            {
              title: "Wired: nothing to charge, cheaper to replace",
              body: "Teacher forums and classroom supply guides favor wired sets with a volume limit for young readers.",
              links: ["https://example.org/classroom-headphones"],
              by: "Claude",
            },
            {
              title: "Wireless cuts tangles but adds a charging routine",
              body: "Works for older students with a charging cart. Costs roughly twice as much per set.",
              by: "Gemini",
            },
          ],
        },
        {
          want: "Which classroom supply stores offer a teacher discount?",
          status: "in_progress",
          updates: [{ title: "Two of the stores on the list do", body: "Both need a school ID or email at signup. The discount pages are linked.", links: ["https://example.com/teacher-discount"], by: "ChatGPT" }],
        },
        { want: "What's the cheapest way to get a class set of chapter books for spring?" },
      ],
    },
  },
} satisfies Persona;
