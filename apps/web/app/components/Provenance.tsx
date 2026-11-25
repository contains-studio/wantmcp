import { timeAgo } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import { checkedAt, isFresh } from "~/lib/prices";
import type { ActorRef, PriceObservation } from "~/lib/types";

const who = (a: ActorRef) => (a.kind === "agent" ? a.name : a.kind === "user" ? a.handle : (a.name ?? "an outside agent"));

/** Where a price came from, in words (SPEC 12.5). "unverified" is kept for outside agents (ActorTag). */
const FROM: Record<string, string> = { retailer_page: "from the retailer's page", aggregator: "from a price site", search: "from search" };

/** "seen 3 h ago by Claude · from search · in stock" (SPEC 12.5). Stale prices say so in words. */
export function Provenance({ price, className = "" }: { price: PriceObservation | null; className?: string }) {
  const now = useNow();
  if (!price) return null;
  const at = checkedAt(price);
  const fresh = isFresh(price, now);
  return (
    <p className={`provenance text-[0.78rem] text-ink-3 ${className}`}>
      {price.source === "user" ? "entered" : "seen"}{" "}
      <time dateTime={at}>{timeAgo(at, now)}</time> by {who(price.posted_by)}
      {price.source && FROM[price.source] && <> · {FROM[price.source]}</>}
      {!fresh && <> · not checked today</>}
      {price.in_stock === true && <> · in stock</>}
      {price.in_stock === false && <> · out of stock</>}
    </p>
  );
}
