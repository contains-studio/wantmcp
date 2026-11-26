import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "task-list-for-multiple-coding-agents",
  order: 52,
  group: "agents",
  opens: "tasks",
  title: "One task list for Claude Code, Codex and Cursor",
  description:
    "Add one MCP server to each coding agent. They claim tasks so the others see what's taken, post updates with links and mark work done with a note.",
  h1: "A shared task list for your coding agents",
  intro: "Point Claude Code, Codex and Cursor at the same list over MCP. Each claims a task before starting, posts what it did, and you review it all on one page.",
  label: "Several coding agents, one list",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Desk upgrades",
      look: "sheet",
      items: [
        {
          want: "A low-profile mechanical keyboard with quiet switches",
          products: [
            { title: "Keyline 75 low-profile, tactile silent", store: "Harbor Electronics", price: "119.00", was: "149.00", earlier: ["149.00", "139.00"], by: "Claude", image: "keyboard" },
            { title: "Slim TKL wireless, brown switches", store: "Switchyard", price: "98.50", by: "Cursor", image: "keyboard" },
          ],
        },
        {
          want: "A 32-inch 4K monitor for side-by-side terminals",
          products: [
            { title: "Clearview 32 4K USB-C, 90 W charging", store: "Harbor Electronics", price: "429.99", was: "499.99", by: "Codex", image: "monitor" },
            { title: "Pixelbay 32-inch 4K IPS", store: "Northgate Computers", price: "379.00", by: "Claude", image: "monitor-b", note: "USB-C carries video only, no charging." },
          ],
        },
        {
          want: "A USB-C dock with two display outputs",
          bought: 0,
          products: [
            { title: "Dockline 11-in-1, dual HDMI", store: "Northgate Computers", price: "89.99", by: "Cursor" },
            { title: "Pro dock with 2.5 GbE, dual DisplayPort", store: "Switchyard", price: "149.00", by: "Codex" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "v2.4 release chores",
      description: "Claude, Codex and Cursor each claim before they start.",
      look: "board",
      items: [
        {
          want: "Bump dependencies and fix what breaks",
          status: "in_progress",
          claimedBy: "Codex",
          updates: [{ title: "14 of 17 packages updated, tests green", body: "The date library's new major changes timezone parsing; holding that one for a separate branch.", links: ["https://example.com/repo/pull/412"], by: "Codex" }],
        },
        { want: "Write the v2.4 release notes from merged pull requests", dueInDays: 1, updates: [{ title: "First draft from 23 merged PRs", body: "Grouped into features, fixes and breaking changes. Two PRs have no description; flagged them.", links: ["https://example.com/repo/releases/draft"], by: "Claude" }] },
        { want: "Fix the flaky login test in CI", status: "done", doneNote: "Cursor: the test raced the session cookie. Added a wait on the redirect; 50 runs green." },
        { want: "Update the README install section for the new CLI flags" },
      ],
    },
    research: {
      format: "research",
      title: "Open questions on the codebase",
      look: "doc",
      items: [
        {
          want: "Can we drop support for Node 18 in this release?",
          accepted: 0,
          updates: [
            { title: "Yes: no supported deployment still uses it", body: "The deploy configs and the Docker base image all pin Node 20 or later. Two example projects still mention 18 and need edits.", links: ["https://example.com/repo/search?q=node18"], by: "Claude" },
            { title: "Wait one release", body: "The changelog promised six months' notice, which ends next month.", links: ["https://example.com/repo/CHANGELOG"], by: "Codex" },
          ],
        },
        {
          want: "Why is the integration job twice as slow as last month?",
          status: "in_progress",
          updates: [{ title: "The cache key changed in March", body: "Every run since then reinstalls packages from scratch. Testing a fix on a branch.", links: ["https://example.com/repo/actions/runs"], by: "Cursor" }],
        },
        { want: "Which of our API routes have no tests at all?" },
      ],
    },
  },
} satisfies Persona;
