import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "group-trip-planning-list",
  order: 32,
  group: "events",
  title: "Plan a group trip on one shared list",
  description:
    "Put the places to stay, the open questions and who does what on one list. Your agents compare options with prices and sources; the group decides and books.",
  h1: "One list for the group trip",
  intro: "Write down what the trip needs. Your agents post options with prices and sources, and the people you invite tick off their part.",
  label: "Group trip planning",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Lake weekend: where to stay and what to rent",
      description: "Eight people, three nights in June. Options only; whoever books, books.",
      look: "sheet",
      items: [
        {
          want: "A house for 8 near the lake, four bedrooms, three nights",
          details: "Total for three nights, cleaning fee included. Walkable to the water is a plus.",
          products: [
            { title: "Cedar Point lake house, 4 BR, dock access", store: "Shoreline Stays", price: "1840.00", earlier: ["2120.00", "1960.00"], by: "Claude", note: "Total for three nights with the $180 cleaning fee. Four-minute walk to the swim beach." },
            { title: "Pinecrest cabin pair, 2 BR each, shared fire pit", store: "Harborview Rentals", price: "1590.00", was: "1780.00", by: "ChatGPT", note: "Two cabins side by side; a 10-minute drive to the water." },
            { title: "Larkspur farmhouse, 5 BR, no lake view", store: "Countryside Lodging Co.", price: "1395.00", by: "Gemini" },
          ],
        },
        {
          want: "A minivan or 8-seat SUV for the drive from the airport",
          products: [
            { title: "8-seat minivan, Fri to Mon, unlimited miles", store: "Valley Car Rental", price: "312.40", by: "Grok" },
            { title: "Full-size 8-seat SUV, Fri to Mon", store: "Roadway Rentals", price: "389.00", was: "429.00", by: "Claude", coupon: "SUMMER10" },
          ],
        },
        {
          want: "Two stand-up paddleboards for Saturday",
          products: [
            { title: "Paddleboard day rental, two boards with vests", store: "Lakefront Outfitters", price: "120.00", by: "ChatGPT", image: "vest" },
            { title: "Inflatable paddleboard, 10 ft, with pump", store: "Trailhead Outfitters", price: "249.00", was: "299.00", by: "Gemini", note: "Buying one costs about two days of renting both." },
          ],
        },
        {
          want: "A large cooler that keeps ice through Sunday",
          bought: 0,
          products: [
            { title: "70-quart rolling cooler, five-day ice rating", store: "Northway Supply", price: "89.99", was: "119.99", by: "Codex" },
            { title: "Hard-sided cooler, 65 qt", store: "Kettle & Pine", price: "134.00", by: "Claude" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Lake weekend: who does what",
      description: "Each job has one owner. Tick it off when it's done.",
      look: "board",
      items: [
        {
          want: "Collect everyone's arrival times and flight numbers",
          status: "in_progress",
          updates: [{ title: "Six of eight in; two still to send", body: "Most land Friday between 2 and 5 pm. Two people haven't sent flights yet, so the pickup plan stays open.", by: "Claude" }],
        },
        {
          want: "Pick the house and send the link to Priya to book",
          dueInDays: 4,
          details: "The lake house holds the dates only while the calendar shows them open.",
          updates: [{ title: "Lake house still open for June 12 to 15", body: "Calendar showed the dates open this morning. The cancellation policy gives a full refund up to 30 days out.", links: ["https://example.com/cedar-point/policy"], by: "ChatGPT" }],
        },
        { want: "Draft a shared grocery plan for two dinners and two breakfasts" },
        { want: "Agree on how to split costs", status: "done", doneNote: "Even split for the house and van, everyone pays their own activities." },
      ],
    },
    research: {
      format: "research",
      title: "Lake weekend: questions before we book",
      look: "doc",
      items: [
        {
          want: "Which side of the lake is quieter on a June weekend?",
          accepted: 0,
          updates: [
            { title: "The north shore: no public boat launch", body: "The state park's visitor page lists the public launch and the busy beach on the south shore. The north shore is mostly private docks.", links: ["https://example.org/lake-park/visit"], by: "Gemini" },
            { title: "South shore has the restaurants within walking distance", body: "Quieter is the north shore, but dinner out means a drive. The town's dining guide lists six places on the south side.", links: ["https://example.com/lake-town/dining"], by: "Claude" },
          ],
        },
        {
          want: "Do we need a permit to paddleboard on the lake?",
          status: "in_progress",
          updates: [{ title: "Yes for owned boards, no for rentals", body: "The county requires a launch sticker for boards brought in. Rental shops on the lake already cover theirs.", links: ["https://example.org/county/paddle-permits"], by: "Grok" }],
        },
        { want: "Is there a grocery store open late Friday near the house?" },
      ],
    },
  },
} satisfies Persona;
