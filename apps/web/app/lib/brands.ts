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
    /** Rendered height in rem, tuned so every mark reads at one optical size (wordmarks smaller, symbols larger). */
    optical?: number;
  };
}

/** In the order the owner uses: ChatGPT, Codex, Claude, Grok Bot, Muse, OpenClaw, then the rest. */
export const BRANDS: Brand[] = [
  // OpenAI publishes only its company mark (the Blossom), so the product name goes beside it.
  { id: "chatgpt", name: "ChatGPT", logo: { light: "/brands/openai-blossom-on-light.svg", dark: "/brands/openai-blossom-on-dark.svg", width: 716, height: 716, nameBeside: true, optical: 1.6 } },
  { id: "codex", name: "Codex", logo: { light: "/brands/openai-blossom-on-light.svg", dark: "/brands/openai-blossom-on-dark.svg", width: 716, height: 716, nameBeside: true, optical: 1.6 } },
  { id: "claude", name: "Claude", logo: { light: "/brands/claude-on-light.svg", dark: "/brands/claude-on-dark.svg", width: 9156, height: 2000, optical: 1.2 } },
  // xAI publishes no separate Grok Bot mark: the Grok mark (a self-contained tile, for any background) with the name.
  { id: "grok-bot", name: "Grok Bot", logo: { light: "/brands/grok-mark.svg", width: 512, height: 512, nameBeside: true, optical: 1.4 } },
  { id: "muse", name: "Muse", logo: { light: "/brands/muse-mark.svg", width: 100, height: 100, nameBeside: true, optical: 1.25 } },
  { id: "openclaw", name: "OpenClaw", logo: { light: "/brands/openclaw-on-light.svg", dark: "/brands/openclaw-on-dark.svg", width: 788, height: 180, optical: 1.4 } },
  { id: "cursor", name: "Cursor", logo: { light: "/brands/cursor-on-light.svg", dark: "/brands/cursor-on-dark.svg", width: 2239, height: 532, optical: 1.15 } },
  { id: "grok", name: "Grok", logo: { light: "/brands/grok-mark.svg", width: 512, height: 512, nameBeside: true, optical: 1.4 } },
  { id: "gemini", name: "Gemini", logo: { light: "/brands/gemini-sparkle.svg", width: 192, height: 192, nameBeside: true, optical: 1.3 } },
  { id: "msgblast", name: "msgblast", logo: { light: "/brands/msgblast.png", width: 206, height: 206, nameBeside: true, optical: 1.4 } },
];
