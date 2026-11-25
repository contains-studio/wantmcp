/**
 * The "Works with" row on the home page. Each mark links to that client's setup on /connect.
 *
 * Third-party marks live in public/brands/ (see public/brands/NOTICE.md): they are trademarks of
 * their owners, shown unmodified to say the client works with The Want MCP, and are not covered
 * by this repository's licence. A client without a usable official mark is shown as its name:
 * OpenAI (ChatGPT, Codex), Anthropic (Claude) and Google (Gemini) ask for permission before their
 * marks are used, xAI's files could not be fetched, and OpenClaw publishes no licence for its logo.
 * Add `logo` here once a mark is cleared; nothing else changes.
 */
export interface Brand {
  id: string; // matches the section id on /connect
  name: string;
  /** Official mark for light backgrounds, and one for dark if the vendor provides it. */
  logo?: { light: string; dark?: string; width: number; height: number };
}

export const BRANDS: Brand[] = [
  { id: "chatgpt", name: "ChatGPT" },
  { id: "claude", name: "Claude" },
  { id: "codex", name: "Codex" },
  // Official horizontal lockup from cursor.com/brand, unmodified (dark mark for light backgrounds and the reverse).
  { id: "cursor", name: "Cursor", logo: { light: "/brands/cursor-on-light.svg", dark: "/brands/cursor-on-dark.svg", width: 2239, height: 532 } },
  { id: "grok", name: "Grok" },
  { id: "gemini", name: "Gemini" },
  { id: "openclaw", name: "OpenClaw" },
  { id: "msgblast", name: "msgblast", logo: { light: "/brands/msgblast.png", width: 206, height: 206 } },
];
