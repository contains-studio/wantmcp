/**
 * The "Works with" row on the home page. Each mark links to that client's setup on /connect.
 *
 * Third-party marks live in public/brands/ (see public/brands/NOTICE.md, which records where each
 * file came from): they are trademarks of their owners, shown unmodified to say the client works
 * with The Want MCP, and are not covered by this repository's licence. Some vendors ask for
 * permission before their marks are used; the owner of this site has chosen to show them. To
 * show a client as its name instead, delete its `logo` line: nothing else changes.
 */
export interface Brand {
  id: string; // matches the section id on /connect
  name: string;
  /** Not released yet: "Coming soon" on /connect with no steps, and left out of every logo row. */
  comingSoon?: boolean;
  /** Official mark for light backgrounds, and one for dark if the vendor provides it. */
  logo?: {
    light: string;
    dark?: string;
    width: number;
    height: number;
    /** The mark doesn't spell the product's name (a company mark, a symbol, an app icon): set the name beside it. */
    nameBeside?: boolean;
    /** Rendered height in rem, tuned so every mark reads at one optical size (wordmarks smaller, symbols larger). */
    optical?: number;
    /** The art is an app icon on its own square (often white): draw it with rounded corners and a hairline edge. */
    tile?: boolean;
  };
}

/** In the order the owner chose: ChatGPT, Claude, Grok Bot, Muse, OpenClaw, the rest (Hermes, Hark and Instinct added 25 Nov 2026), and Codex last. */
export const BRANDS: Brand[] = [
  // OpenAI publishes only its company mark (the Blossom), so the product name goes beside it (Codex too).
  { id: "chatgpt", name: "ChatGPT", logo: { light: "/brands/openai-blossom-on-light.svg", dark: "/brands/openai-blossom-on-dark.svg", width: 716, height: 716, nameBeside: true, optical: 1.6 } },
  { id: "claude", name: "Claude", logo: { light: "/brands/claude-on-light.svg", dark: "/brands/claude-on-dark.svg", width: 9156, height: 2000, optical: 1.2 } },
  // Grok Bot's own mark from xAI's product page (x.ai/bot): a solid disc, so it is drawn a little smaller than the open marks.
  { id: "grok-bot", name: "Grok Bot", logo: { light: "/brands/grok-bot-on-light.svg", dark: "/brands/grok-bot-on-dark.svg", width: 100, height: 100, nameBeside: true, optical: 1.25 } },
  { id: "muse", name: "Muse", logo: { light: "/brands/muse-mark.svg", width: 100, height: 100, nameBeside: true, optical: 1.25 } },
  { id: "openclaw", name: "OpenClaw", logo: { light: "/brands/openclaw-on-light.svg", dark: "/brands/openclaw-on-dark.svg", width: 788, height: 180, optical: 1.4 } },
  { id: "cursor", name: "Cursor", logo: { light: "/brands/cursor-on-light.svg", dark: "/brands/cursor-on-dark.svg", width: 2239, height: 532, optical: 1.15 } },
  { id: "grok", name: "Grok", logo: { light: "/brands/grok-mark.svg", width: 512, height: 512, nameBeside: true, optical: 1.4 } },
  { id: "gemini", name: "Gemini", logo: { light: "/brands/gemini-sparkle.svg", width: 192, height: 192, nameBeside: true, optical: 1.3 } },
  // Added at the owner's request, 25 Nov 2026. Hermes Agent documents remote MCP servers; Hark and Instinct publish
  // no "add a server" setting, so their connect steps are the paste-a-prompt route and say they are untested.
  { id: "hermes", name: "Hermes", logo: { light: "/brands/hermes-agent-on-light.webp", dark: "/brands/hermes-agent-on-dark.webp", width: 160, height: 160, nameBeside: true, optical: 1.5, tile: true } },
  { id: "hark", name: "Hark", logo: { light: "/brands/hark-on-light.svg", dark: "/brands/hark-on-dark.svg", width: 811, height: 718, nameBeside: true, optical: 1.2 } },
  { id: "instinct", name: "Instinct", logo: { light: "/brands/instinct-icon.svg", width: 100, height: 100, nameBeside: true, optical: 1.5, tile: true } },
  // Codex goes last (owner, 25 Nov 2026): two OpenAI products side by side read as a repeat.
  { id: "codex", name: "Codex", logo: { light: "/brands/openai-blossom-on-light.svg", dark: "/brands/openai-blossom-on-dark.svg", width: 716, height: 716, nameBeside: true, optical: 1.6 } },
  // Not shipped yet (its pull requests are drafts).
  { id: "msgblast", name: "msgblast", comingSoon: true, logo: { light: "/brands/msgblast.png", width: 206, height: 206, nameBeside: true, optical: 1.4 } },
];

/** Clients people can use today: every logo row shows only these. */
export const LIVE_BRANDS = BRANDS.filter((b) => !b.comingSoon);

/**
 * Square marks for agents we know by name, used in place of a letter tile wherever an agent is named (ActorTag). The
 * name is always written beside the mark, so ChatGPT and Codex (both OpenAI's mark) stay apart.
 */
const OPENAI = { light: "/brands/openai-blossom-on-light.svg", dark: "/brands/openai-blossom-on-dark.svg" };
export const AGENT_MARKS: Record<string, { light: string; dark?: string }> = {
  chatgpt: OPENAI,
  codex: OPENAI,
  claude: { light: "/brands/claude-spark.svg" },
  "claude code": { light: "/brands/claude-spark.svg" },
  "grok bot": { light: "/brands/grok-bot-on-light.svg", dark: "/brands/grok-bot-on-dark.svg" },
  grok: { light: "/brands/grok-mark.svg" },
  muse: { light: "/brands/muse-mark.svg" },
  gemini: { light: "/brands/gemini-sparkle.svg" },
  hermes: { light: "/brands/hermes-agent-on-light.webp", dark: "/brands/hermes-agent-on-dark.webp" },
  "hermes agent": { light: "/brands/hermes-agent-on-light.webp", dark: "/brands/hermes-agent-on-dark.webp" },
  hark: { light: "/brands/hark-on-light.svg", dark: "/brands/hark-on-dark.svg" },
  instinct: { light: "/brands/instinct-icon.svg" },
};

export function agentMark(name: string): { light: string; dark?: string } | null {
  return AGENT_MARKS[name.trim().toLowerCase()] ?? null;
}
