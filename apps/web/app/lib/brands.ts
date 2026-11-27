import type { CSSProperties } from "react";
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
  /**
   * SPEC 24.2: a chat agent (the default) reads a prompt; an app or tool takes a plain key, so its done state leads
   * with the key and says where to paste it.
   */
  kind?: "chat" | "app";
  /** For an app: where its person pastes the key, as the sentence's end ("msgblast › Wants › Connect list"). */
  pasteInto?: string;
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

/**
 * msgblast's Wants arrive in its 0.12.0 release (owner, 27 Nov 2026). Set this to true the day 0.12.0 can be downloaded
 * with Wants in it: /connect drops the note above msgblast's steps, and the home page's row links to msgblast. Its
 * "Not yet checked" chip on /connect is separate: it stays until someone has run the steps in the released build.
 */
export const MSGBLAST_WANTS_RELEASED = false;

/** The line first in msgblast's steps until then; null once released. */
export const msgblastNote = (released: boolean) => (released ? null : "Wants arrives in msgblast 0.12.0. The download today (0.11.1) doesn't have it yet.");

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
  // Left out of the home page's row until its Wants release is out (MSGBLAST_WANTS_RELEASED).
  { id: "msgblast", name: "msgblast", kind: "app", pasteInto: "msgblast › Wants › Connect list", logo: { light: "/brands/msgblast.png", width: 206, height: 206, nameBeside: true, optical: 1.4 } },
];

/** Clients people can use today: every logo row shows only these. msgblast joins when its Wants release is out. */
export const liveBrands = (msgblastReleased: boolean) => BRANDS.filter((b) => !b.comingSoon && (b.id !== "msgblast" || msgblastReleased));
export const LIVE_BRANDS = liveBrands(MSGBLAST_WANTS_RELEASED);

/**
 * Square marks for agents we know by name, used in place of a letter tile wherever an agent is named (ActorTag). The
 * name is always written beside the mark, so ChatGPT and Codex (both OpenAI's mark) stay apart.
 */
// The blossom's art fills only the middle half of its file (measured: 355 of 716 units), where the other marks fill
// theirs: drawn at twice the size so it sits at the same optical size beside them.
const OPENAI = { light: "/brands/openai-blossom-on-light.svg", dark: "/brands/openai-blossom-on-dark.svg", scale: 1.9 };
export interface AgentMarkArt {
  light: string;
  dark?: string;
  /** How much to enlarge art that leaves empty margin inside its file, so every mark reads at one size. */
  scale?: number;
}
export const AGENT_MARKS: Record<string, AgentMarkArt> = {
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
  msgblast: { light: "/brands/msgblast.png" },
};

export function agentMark(name: string): AgentMarkArt | null {
  return AGENT_MARKS[name.trim().toLowerCase()] ?? null;
}

/** The style for a mark's img: its optical scale, if it has one. */
export function markStyle(mark: AgentMarkArt): CSSProperties | undefined {
  return mark.scale ? { transform: `scale(${mark.scale})` } : undefined;
}

/**
 * How a client named by its person takes its key (SPEC 24.2): a known chat agent gets the prompt first; a known app,
 * or any name typed under "Other", gets the plain key first. `pasteInto` is where it goes, when we know.
 */
export function clientKind(name: string): { kind: "chat" | "app"; pasteInto?: string } {
  const n = name.trim().toLowerCase();
  const b = BRANDS.find((x) => x.name.toLowerCase() === n);
  if (b) return { kind: b.kind ?? "chat", pasteInto: b.pasteInto };
  // Claude Code and Hermes Agent are the same chat agents by their longer names.
  if (n in AGENT_MARKS) return { kind: "chat" };
  return { kind: "app" };
}
