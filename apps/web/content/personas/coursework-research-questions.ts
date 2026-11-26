import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "coursework-research-questions",
  order: 23,
  group: "school",
  opens: "research",
  title: "Keep coursework questions, answers and sources together",
  description:
    "Write down the questions a course raises. Ask your AI agent for answers with sources, then check each source yourself and keep what holds up in one place.",
  h1: "Your questions, the answers, and sources you can check",
  intro: "Keep each question next to every answer an agent gave and the links behind it. You read the sources, and you write the work.",
  label: "Coursework questions and sources",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Fall semester supplies",
      look: "sheet",
      items: [
        {
          want: "Intro to Microeconomics, 9th edition",
          details: "The syllabus says the 8th edition is fine too.",
          products: [
            { title: "Intro to Microeconomics, 9th ed., used, good", store: "Quad Book Exchange", price: "48.00", by: "Claude" },
            { title: "Same edition, semester rental", store: "Campus Text Rentals", price: "32.50", was: "39.00", by: "ChatGPT", note: "Return by Dec 18 or the rental extends." },
          ],
        },
        {
          want: "A graphing calculator the stats course allows",
          products: [
            { title: "TX-84 graphing calculator, used", store: "Brightway Electronics", price: "64.99", earlier: ["79.99", "69.99"], by: "Gemini" },
            { title: "TX-84 graphing calculator, new", store: "Northgate Office", price: "109.00", was: "129.00", by: "Claude" },
          ],
        },
        {
          want: "Noise-canceling earbuds for the library",
          bought: 0,
          products: [
            { title: "Hush ANC wireless earbuds", store: "Cedar Sound", price: "59.00", by: "Grok" },
            { title: "QuietPod earbuds with case", store: "Brightway Electronics", price: "74.99", by: "Codex" },
          ],
        },
        {
          want: "Dot-grid notebooks, pack of three",
          products: [
            { title: "A5 dot-grid notebooks, 3-pack", store: "Paper Lane", price: "14.50", coupon: "STUDENT", by: "ChatGPT" },
            { title: "Spiral dot-grid notebooks, 3-pack", store: "Northgate Office", price: "11.99", by: "Codex" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Term checklist",
      look: "today",
      items: [
        { want: "Read the AI policy in each syllabus", status: "done", doneNote: "Econ allows AI for finding sources, not for writing. History doesn't allow it for the paper." },
        {
          want: "Find library hours for finals week",
          status: "in_progress",
          updates: [{ title: "Main library open until 2 a.m. from Dec 8", body: "The science library keeps normal hours; group rooms can be reserved a week ahead.", links: ["https://example.org/library-hours"], by: "Claude" }],
        },
        { want: "Book a writing center session for the history draft", dueInDays: 6, updates: [{ title: "Open slots Tuesday and Thursday afternoons", body: "Sessions are 45 minutes; bring a printed draft.", links: ["https://example.org/writing-center"], by: "Gemini" }] },
        { want: "Request the out-of-print reading through interlibrary loan" },
      ],
    },
    research: {
      format: "research",
      title: "Econ 101: rent control questions",
      description: "Answers are leads. I read every source before I use it.",
      look: "doc",
      items: [
        {
          want: "What do studies find about rent control and the supply of rentals?",
          details: "Peer-reviewed or primary sources only.",
          accepted: 0,
          updates: [
            { title: "Several studies find fewer rentals over time", body: "Points to a city-level study and a literature review. Both are linked; the review is the easier place to start.", links: ["https://example.org/rent-study", "https://example.org/rent-review"], by: "Claude" },
            { title: "It depends on how the policy is written", body: "Cites a policy brief, not a peer-reviewed paper. Check whether the course accepts briefs.", links: ["https://example.com/policy-brief"], by: "ChatGPT" },
          ],
        },
        {
          want: "Where can I read the original text of the city's rent ordinance?",
          status: "in_progress",
          updates: [{ title: "The city clerk's archive has a scanned copy", body: "The 1979 ordinance and two later amendments are posted as PDFs.", links: ["https://example.org/clerk-archive"], by: "Gemini" }],
        },
        { want: "Which readings on the syllabus disagree with each other, and on what?" },
      ],
    },
  },
} satisfies Persona;
