import { formatMoney } from "./format.ts";
import type { Entry, PriceObservation } from "./types";

/** "−$150.00 (−19%)" from the first price to the latest; null when it hasn't moved. */
export function priceChangeLabel(first: number, last: number, currency: string): string | null {
  const change = Math.round((last - first) * 100) / 100;
  if (change === 0 || !first) return null;
  const sign = change < 0 ? "−" : "+";
  return `${sign}${formatMoney(Math.abs(change), currency, { cents: true })} (${sign}${Math.round((Math.abs(change) / first) * 100)}%)`;
}

/** SPEC 12.5: a price not checked for 24 hours is stale: shown muted, never "Lowest". */
export const PRICE_FRESH_MS = 24 * 3600_000;

export const checkedAt = (p: PriceObservation) => p.checked_at ?? p.posted_at;
export const isFresh = (p: PriceObservation | null | undefined, now: number) => !!p && now - Date.parse(checkedAt(p)) <= PRICE_FRESH_MS;
export const isVerified = (p: PriceObservation) => p.verified ?? p.source === "retailer_page";

/**
 * The entry that gets the "Lowest" badge: the lowest current price checked within 24 hours,
 * among verified prices if there are any, in the currency most of them use. Needs at least two
 * priced entries to compare. The API's summary applies the same rule.
 */
export function lowestEntryId(entries: Entry[], now: number): string | null {
  if (entries.filter((e) => e.current_price).length < 2) return null;
  const fresh = entries.filter((e) => isFresh(e.current_price, now));
  const pool = fresh.some((e) => isVerified(e.current_price!)) ? fresh.filter((e) => isVerified(e.current_price!)) : fresh;
  if (!pool.length) return null;
  const counts = new Map<string, number>();
  for (const e of pool) counts.set(e.current_price!.currency, (counts.get(e.current_price!.currency) ?? 0) + 1);
  const currency = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  return pool
    .filter((e) => e.current_price!.currency === currency)
    .reduce((a, b) => (Number(b.current_price!.price) < Number(a.current_price!.price) ? b : a)).id;
}

/**
 * The "Lowest" chip's words. It follows the best-price rule above (verified prices preferred), so when a cheaper price
 * only seen in a search result or on a price site sits above it, plain "Lowest" would contradict the order: it then
 * says "Lowest verified" (owner review, 25 Nov 2026). The honesty rule stays; the label says which lowest it is.
 */
export function lowestLabel(entries: Entry[], lowestId: string | null, now: number): "Lowest" | "Lowest verified" {
  const lowest = entries.find((e) => e.id === lowestId)?.current_price;
  if (!lowest) return "Lowest";
  const cheaper = entries.some(
    (e) => e.id !== lowestId && e.current_price && isFresh(e.current_price, now) && e.current_price.currency === lowest.currency && Number(e.current_price.price) < Number(lowest.price),
  );
  return cheaper ? "Lowest verified" : "Lowest";
}

export const LOWEST_VERIFIED_NOTE = "The lowest price read on a retailer's own page in the last day; a cheaper one was only seen in a search result or on a price site";

export const SOURCE_LABEL: Record<string, string> = {
  retailer_page: "Retailer's page",
  aggregator: "Price site",
  search: "Search result",
  user: "Entered by hand",
  unknown: "Not recorded",
};
