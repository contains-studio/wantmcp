import { timeAgo } from "~/lib/format";
import { useNow, useRootData } from "~/lib/hooks";
import { checkedAt, isFresh } from "~/lib/prices";
import type { ActorRef, PriceObservation } from "~/lib/types";

const sameActor = (a: ActorRef, b: ActorRef) =>
  a.kind === b.kind && (a.kind === "agent" ? a.agent_id === (b as typeof a).agent_id : a.kind === "user" ? a.handle === (b as typeof a).handle : a.name === (b as typeof a).name);

/** Where a price came from, in words a person knows (SPEC 12.5; clean-eyes review F2: "from search" meant nothing). */
const FROM: Record<string, string> = {
  retailer_page: "checked on the store's page",
  aggregator: "from a price site, not the store's page",
  search: "from a search result, not the store's page",
};

const DOT = "\u00a0· ";

/** "seen 3 h ago by Claude · from search · in stock" (SPEC 12.5). Stale prices say so in words. */
export function Provenance({ price, author, className = "" }: { price: PriceObservation | null; author?: ActorRef; className?: string }) {
  const now = useNow();
  const me = useRootData().user?.handle ?? null;
  if (!price) return null;
  // Your own price says "you", never your handle; and when the price's poster wrote the entry, the entry's own line
  // already says who (the same fact once).
  const p = price.posted_by;
  const by = author && sameActor(p, author) ? null : p.kind === "user" ? (p.handle === me ? "you" : p.handle) : p.kind === "agent" ? p.name : (p.name ?? "an outside agent");
  const at = checkedAt(price);
  const fresh = isFresh(price, now);
  return (
    <p className={`provenance text-[0.78rem] text-ink-3 ${className}`}>
      {price.source === "user" ? "entered" : "seen"}{" "}
      <time dateTime={at}>{timeAgo(at, now)}</time>
      {by && <> by {by}</>}
      {/* Each dot is tied to the words before it (a no-break space), so a wrapped line never starts with one. */}
      {price.source && FROM[price.source] && <>{DOT}{FROM[price.source]}</>}
      {!fresh && <>{DOT}not checked today</>}
      {price.in_stock === true && <>{DOT}in stock</>}
      {price.in_stock === false && <>{DOT}out of stock</>}
    </p>
  );
}
