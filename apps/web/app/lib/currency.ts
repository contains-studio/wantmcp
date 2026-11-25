/**
 * Which currency a form or placeholder suggests. The list's own prices win (so a GBP list never
 * defaults a new price to USD and mixes currencies), then the item's, then the person's chosen
 * currency, then US dollars.
 */
type Priced = { current_price?: { currency: string } | null };
type WithEntries = { entries: Priced[] };

/** The currency of the first priced entry, or undefined. */
export function firstCurrency(entries: Priced[]): string | undefined {
  return entries.find((e) => e.current_price)?.current_price?.currency;
}

/** The currency a list already uses: its first priced entry anywhere. */
export function listCurrency(items: WithEntries[]): string | undefined {
  return firstCurrency(items.flatMap((i) => i.entries));
}

/** The hint for one item's forms: the item's own prices, else the list's. */
export function itemCurrency(item: WithEntries, list: string | undefined): string | undefined {
  return firstCurrency(item.entries) ?? list;
}

/** The first hint that is set, else the person's currency, else USD. */
export function defaultCurrency(hints: Array<string | null | undefined>, personCurrency?: string | null): string {
  return hints.find((h) => !!h) || personCurrency || "USD";
}

/** Fills "{200}" in a placeholder with that amount in the currency. */
export function moneyPlaceholder(text: string, currency: string): string {
  const sym: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", CAD: "C$", AUD: "A$", NZD: "NZ$", INR: "₹", JPY: "¥" };
  return text.replace(/\{(\d+)\}/g, (_, n) => (sym[currency] ? `${sym[currency]}${n}` : `${n} ${currency}`));
}
