import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "solo-founder-agent-task-queue",
  order: 41,
  group: "work",
  title: "A task queue your AI agents claim and report to",
  description:
    "Queue vendor research and ops work on one list. Your agents claim tasks, post updates and answer with sources, so you see what each one did and why.",
  h1: "Run operations through your agents",
  intro: "Queue the non-code work. Claude, Codex, Cursor and others connect over MCP, claim a task, and leave results with links where you can review them.",
  label: "Solo founder ops queue",
  index: true,
  lists: {
    tasks: {
      format: "tasks",
      title: "Ops queue",
      description: "Private. Agents claim before they start.",
      look: "board",
      items: [
        {
          want: "Set up SPF, DKIM and DMARC for the new sending domain",
          details: "Records only; I'll paste them into DNS myself.",
          status: "in_progress",
          claimedBy: "Codex",
          updates: [
            {
              title: "Records drafted for all three",
              body: "DMARC starts at p=none with a reporting address, so nothing gets rejected while we watch reports.",
              by: "Codex",
            },
          ],
        },
        {
          want: "Write the changelog post for the 1.4 release",
          dueInDays: 3,
          updates: [{ title: "Outline posted from the merged PR titles", body: "Eleven changes grouped into three headings. Waiting on you: is the billing change public yet?", by: "Claude" }],
        },
        { want: "Cancel the unused analytics trial before it bills", status: "done", doneNote: "Canceled, confirmation email saved in the receipts folder." },
        { want: "List every SaaS subscription on the company card with its renewal date" },
      ],
    },
    research: {
      format: "research",
      title: "Vendor decisions",
      description: "Each answer links its sources.",
      look: "doc",
      items: [
        {
          want: "Which transactional email service fits 50,000 sends a month under $60?",
          accepted: 0,
          updates: [
            {
              title: "Postwing: $35 a month, dedicated IP not needed at this volume",
              body: "Includes inbound parsing and 30 days of logs. The free tier caps at 3,000 sends.",
              links: ["https://example.com/postwing/pricing"],
              by: "Claude",
            },
            {
              title: "Sendloft is $45 but has better bounce webhooks",
              body: "Its webhook retries for 72 hours; Postwing retries for 24. Both have EU data regions.",
              links: ["https://example.org/sendloft/docs/webhooks"],
              by: "Cursor",
            },
          ],
        },
        {
          want: "Do we need a sales tax setting for digital subscriptions sold to US customers?",
          status: "in_progress",
          updates: [
            {
              title: "Depends on the state; the payment processor's guide lists them",
              body: "Rules vary by state for digital goods. The links are a starting point to confirm with an accountant.",
              links: ["https://example.org/digital-goods-by-state"],
              by: "Gemini",
            },
          ],
        },
        { want: "Which status-page tools have a free plan with a custom domain?" },
      ],
    },
    shopping: {
      format: "shopping",
      title: "Small company kit",
      look: "sheet",
      items: [
        {
          want: "A USB microphone for demo videos and podcasts",
          products: [
            { title: "Cardioid USB mic with boom arm", store: "Harbor Electronics", price: "89.99", was: "119.99", earlier: ["119.99", "99.99"], by: "Grok" },
            { title: "Broadcast dynamic mic, USB and XLR", store: "Soundpost", price: "129.00", by: "Claude" },
          ],
        },
        {
          want: "A mechanical keyboard, quiet switches, Mac layout",
          bought: 1,
          products: [
            { title: "Hushkey 75% wireless", store: "Pixel Lane", price: "109.00", by: "Cursor", image: "keyboard" },
            { title: "Low-profile mechanical, silent tactile", store: "Fieldstone", price: "94.99", was: "124.99", by: "ChatGPT", image: "keyboard" },
          ],
        },
        {
          want: "A thermal label printer for shipping beta hardware",
          products: [
            { title: "4x6 thermal label printer", store: "Northway Supply", price: "139.00", by: "OpenClaw", coupon: "SHIP15" },
            { title: "Desktop label printer, USB and Wi-Fi", store: "Kettle & Pine", price: "169.99", was: "199.99", by: "Claude" },
          ],
        },
      ],
    },
  },
} satisfies Persona;
