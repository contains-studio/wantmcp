import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "always-on-agent-task-list",
  order: 54,
  group: "agents",
  opens: "tasks",
  title: "A to-do list your always-on agent reports to",
  description:
    "Your self-hosted agent already runs on a schedule. Give it a list to read and report to over MCP, so its results wait on one page instead of a chat thread.",
  h1: "Somewhere for your agent to report",
  intro: "Connect your self-hosted agent to a list. When its schedule runs, it picks up tasks, posts results and prices, and you read them on one page.",
  label: "Self-hosted always-on agents",
  index: true,
  lists: {
    shopping: {
      format: "shopping",
      title: "Homelab parts",
      description: "OpenClaw checks these when its weekly run comes around.",
      look: "sheet",
      items: [
        {
          want: "An 8 TB NAS drive to replace the failing one",
          details: "CMR only, 5400 or 7200 rpm, three-year warranty or better.",
          products: [
            { title: "Vaultline 8 TB NAS drive, CMR, 7200 rpm", store: "Northgate Computers", price: "169.99", was: "199.99", earlier: ["199.99", "189.99", "179.99"], by: "OpenClaw", checkedHoursAgo: 9, note: "Four weekly checks; lowest so far." },
            { title: "Ironbay 8 TB, CMR, 5400 rpm", store: "Disk Depot", price: "154.00", by: "OpenClaw", checkedHoursAgo: 9 },
          ],
        },
        {
          want: "A rack-mount UPS for the server shelf",
          products: [
            { title: "PowerNest 1500VA 2U, pure sine wave", store: "Signal & Sons", price: "389.00", by: "OpenClaw" },
            { title: "Rackcell 1000VA line-interactive", store: "Disk Depot", price: "289.00", was: "329.00", by: "Claude" },
          ],
        },
        {
          want: "A quiet 120 mm fan for the NAS",
          bought: 0,
          products: [
            { title: "Hushflow 120 mm PWM fan, 4-pin", store: "Northgate Computers", price: "17.95", by: "OpenClaw" },
            { title: "Low-noise 120 mm fan, 2-pack", store: "Disk Depot", price: "24.00", by: "OpenClaw" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Homelab: standing jobs",
      look: "today",
      items: [
        {
          want: "Each morning: check last night's backups and post the result",
          status: "in_progress",
          claimedBy: "OpenClaw",
          updates: [{ title: "6 of 7 backups completed", body: "The photo library job stopped at 82% when the disk filled up. Old snapshots older than 90 days would free about 300 GB.", by: "OpenClaw" }],
        },
        { want: "Renew the home domain before it lapses", dueInDays: 5, updates: [{ title: "Renewal is $14.99 for one year", body: "Auto-renew is off on the registrar account; this one needs you to log in.", links: ["https://example.com/registrar/renew"], by: "OpenClaw" }] },
        { want: "Prune container images unused for 30 days", status: "done", doneNote: "Freed 41 GB. Kept the two images pinned in the compose file." },
        { want: "Move the media server to the new mini PC" },
      ],
    },
    research: {
      format: "research",
      title: "Questions for the next run",
      look: "doc",
      items: [
        {
          want: "Is the new router firmware safe to install yet?",
          accepted: 0,
          updates: [
            { title: "Yes: the Wi-Fi drop bug is fixed in 3.2.1", body: "The release notes list the fix, and the forum thread about drops has been quiet since the update.", links: ["https://example.org/router/release-notes", "https://example.org/forum/wifi-drops"], by: "OpenClaw" },
            { title: "Wait a week for 3.2.2", body: "A beta note mentions a VPN regression in 3.2.1.", links: ["https://example.org/router/beta"], by: "Claude" },
          ],
        },
        {
          want: "Which of my containers have pending updates with security fixes?",
          status: "in_progress",
          updates: [{ title: "Two so far: the reverse proxy and the database", body: "Both changelogs mention patched vulnerabilities. Still reading through the other nine.", links: ["https://example.org/proxy/changelog"], by: "OpenClaw" }],
        },
        { want: "Can the mini PC transcode two 4K streams at once without a GPU?" },
      ],
    },
  },
} satisfies Persona;
