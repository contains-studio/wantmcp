import { useRouteLoaderData } from "react-router";
import type { UserSelf } from "./types";
import { defaultCurrency } from "./currency";

type RootData = { user: UserSelf | null; now: number; theme: "light" | "dark" | "system"; mcpUrl: string; origin: string; sourceUrl?: string | null };

export function useRootData(): RootData {
  const data = useRouteLoaderData("root") as RootData | undefined;
  return data ?? { user: null, now: Date.now(), theme: "system", mcpUrl: "https://mcp.wantmcp.com/mcp", origin: "https://wantmcp.com" };
}

/**
 * The currency to suggest in forms and placeholders (app/lib/currency.ts): the hint (an existing
 * price, the item's or the list's prices), else the person's chosen currency, else US dollars.
 */
export function useCurrency(hint?: string | null): string {
  const { user } = useRootData();
  return defaultCurrency([hint], (user as { currency?: string | null } | null)?.currency);
}

export { moneyPlaceholder } from "./currency";

/** The request time from the server, so relative times match between SSR and hydration. */
export function useNow(): number {
  return useRootData().now;
}

/** The MCP URL that asks for sign-in at connect time, for clients that never prompt on first write. */
export function signinUrl(mcpUrl: string): string {
  return `${mcpUrl}${mcpUrl.includes("?") ? "&" : "?"}signin=1`;
}
