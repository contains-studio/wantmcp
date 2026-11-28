/**
 * Scheduled runs (SPEC 26.9): the instruction /connect gives for a run while the person is away, and the apps whose
 * own docs confirm scheduled runs that can use MCP tools (checked 26 Nov 2026). Shared by /connect and by an
 * "Ask my agent to check" routine's card, so the two always say the same.
 */
export const AWAY_PROMPT = "Every morning, call get_updates on my Want MCP lists, re-check the prices you posted, and answer what is new.";

export const SCHEDULERS: Array<[name: string, feature: string, href: string]> = [
  ["ChatGPT", "Scheduled tasks", "https://learn.chatgpt.com/docs/automations"],
  ["Claude", "Scheduled tasks", "https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork"],
  ["Claude Code", "Scheduled tasks", "https://code.claude.com/docs/en/routines"],
  ["Codex", "Scheduled tasks in the desktop app", "https://learn.chatgpt.com/docs/automations"],
  ["Cursor", "Automations", "https://cursor.com/docs/cloud-agent/automations"],
  ["Grok Bot", "Routines", "https://docs.x.ai/grok-bot/skills-routines-and-automations"],
];
