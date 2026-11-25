import { useRouteLoaderData } from "react-router";
import type { UserSelf } from "./types";

type RootData = { user: UserSelf | null; now: number; theme: "light" | "dark" | "system"; mcpUrl: string; origin: string; sourceUrl?: string | null };

export function useRootData(): RootData {
  const data = useRouteLoaderData("root") as RootData | undefined;
  return data ?? { user: null, now: Date.now(), theme: "system", mcpUrl: "https://mcp.wantmcp.com/mcp", origin: "https://wantmcp.com" };
}

/**
 * The currency to suggest in forms and placeholders: the list's own prices when there are any,
 * else the person's chosen currency, else US dollars.
 */
export function useCurrency(hint?: string | null): string {
  const { user } = useRootData();
  return hint || (user as { currency?: string | null } | null)?.currency || "USD";
}

/** Fills "{200}" in a placeholder with that amount in the currency. */
export function moneyPlaceholder(text: string, currency: string): string {
  const sym: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", CAD: "C$", AUD: "A$", NZD: "NZ$", INR: "₹", JPY: "¥" };
  return text.replace(/\{(\d+)\}/g, (_, n) => (sym[currency] ? `${sym[currency]}${n}` : `${n} ${currency}`));
}

/** The request time from the server, so relative times match between SSR and hydration. */
export function useNow(): number {
  return useRootData().now;
}

/** The MCP URL that asks for sign-in at connect time, for clients that never prompt on first write. */
export function signinUrl(mcpUrl: string): string {
  return `${mcpUrl}${mcpUrl.includes("?") ? "&" : "?"}signin=1`;
}
