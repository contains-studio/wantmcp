import type { ActorRef, Decimal, PriceObservation, Timestamp } from "./types";

const SYMBOLS: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", JPY: "¥", AUD: "A$", CAD: "C$", NZD: "NZ$", INR: "₹" };

/** "£429" or "£429.50"; whole amounts drop the pence. */
export function formatMoney(amount: Decimal | number | null | undefined, currency: string | null | undefined): string {
  if (amount == null || amount === "") return "";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  const cur = (currency || "").toUpperCase();
  const whole = Math.round(n * 100) % 100 === 0;
  const num = n.toLocaleString("en-GB", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  const sym = SYMBOLS[cur];
  return sym ? `${sym}${num}` : `${num} ${cur}`.trim();
}

/** Whole-percent discount from original to current, or null when there isn't one. */
export function discountPercent(p: Pick<PriceObservation, "price" | "original_price"> | null | undefined): number | null {
  if (!p?.original_price) return null;
  const now = Number(p.price);
  const was = Number(p.original_price);
  if (!(was > 0) || !(now < was)) return null;
  const pct = Math.round(((was - now) / was) * 100);
  return pct >= 1 ? pct : null;
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["week", 7 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/**
 * "25 min ago". Rendered on the server with the request time, so the server and client
 * agree on first paint; `now` is passed in from loader data.
 */
export function timeAgo(ts: Timestamp, now: number): string {
  const diff = Math.round((Date.parse(ts) - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 60) return diff <= 0 ? "just now" : "in a moment";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
  for (const [unit, secs] of UNITS) {
    if (abs >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(Math.round(diff / 60), "minute");
}

/** "27 Nov 2026, 08:00 UTC", for title attributes and tables. */
export function formatDateTime(ts: Timestamp): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) +
    " UTC"
  );
}

export function formatDate(ts: Timestamp): string {
  return new Date(ts).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export type DealState = { label: string; tone: "soon" | "live" | "ending" | "over" } | null;

export function dealState(starts: Timestamp | null, ends: Timestamp | null, now: number): DealState {
  if (!starts && !ends) return null;
  const s = starts ? Date.parse(starts) : null;
  const e = ends ? Date.parse(ends) : null;
  if (s && s > now) return { label: `Deal starts ${formatDate(starts!)}`, tone: "soon" };
  if (e && e < now) return { label: `Deal ended ${formatDate(ends!)}`, tone: "over" };
  if (e) {
    const hours = (e - now) / 3_600_000;
    if (hours < 48) {
      const h = Math.max(1, Math.round(hours));
      return { label: `Deal ends in ${h} hour${h === 1 ? "" : "s"}`, tone: "ending" };
    }
    return { label: `Deal until ${formatDate(ends!)}`, tone: "live" };
  }
  return { label: "Deal on now", tone: "live" };
}

export function actorName(a: ActorRef): string {
  if (a.kind === "user") return a.handle;
  if (a.kind === "agent") return a.name;
  return a.name ? `${a.name} (outside agent)` : "an outside agent";
}

/** A stable hue index (0..7) for an agent name, so each agent keeps its colour everywhere. */
export function agentHue(name: string): number {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 8;
}

export function plural(n: number, one: string, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}

/** Truncate for meta descriptions. */
export function clip(s: string, max = 155): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}
