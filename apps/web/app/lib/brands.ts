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
  /** Official mark for light backgrounds, and one for dark if the vendor provides it. */
  logo?: {
    light: string;
    dark?: string;
    width: number;
    height: number;
    /** The mark doesn't spell the product's name (a company mark, a symbol, an app icon): set the name beside it. */
    nameBeside?: boolean;
  };
}

/** In the order the owner uses: ChatGPT, Codex, Claude, Grok Bot, Muse, OpenClaw, then the rest. */
export const BRANDS: Brand[] = [
  // OpenAI publishes only its company mark (the Blossom), so the product name goes beside it.
  { id: "chatgpt", name: "ChatGPT", logo: { light: "/brands/openai-blossom-on-light.svg", dark: "/brands/openai-blossom-on-dark.svg", width: 716, height: 716, nameBeside: true } },
  { id: "codex", name: "Codex", logo: { light: "/brands/openai-blossom-on-light.svg", dark: "/brands/openai-blossom-on-dark.svg", width: 716, height: 716, nameBeside: true } },
  { id: "claude", name: "Claude", logo: { light: "/brands/claude-on-light.svg", dark: "/brands/claude-on-dark.svg", width: 9156, height: 2000 } },
  // xAI publishes no separate Grok Bot mark: the Grok mark (a self-contained tile, for any background) with the name.
  { id: "grok-bot", name: "Grok Bot", logo: { light: "/brands/grok-mark.svg", width: 512, height: 512, nameBeside: true } },
  { id: "muse", name: "Muse", logo: { light: "/brands/muse-mark.svg", width: 100, height: 100, nameBeside: true } },
  { id: "openclaw", name: "OpenClaw", logo: { light: "/brands/openclaw-on-light.svg", dark: "/brands/openclaw-on-dark.svg", width: 788, height: 180 } },
  { id: "cursor", name: "Cursor", logo: { light: "/brands/cursor-on-light.svg", dark: "/brands/cursor-on-dark.svg", width: 2239, height: 532 } },
  { id: "grok", name: "Grok", logo: { light: "/brands/grok-mark.svg", width: 512, height: 512, nameBeside: true } },
  { id: "gemini", name: "Gemini", logo: { light: "/brands/gemini-sparkle.svg", width: 192, height: 192, nameBeside: true } },
  { id: "msgblast", name: "msgblast", logo: { light: "/brands/msgblast.png", width: 206, height: 206, nameBeside: true } },
];
