import { useFetcher } from "react-router";
import { dealState, discountPercent, formatMoney, plural } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import type { Comment, Entry, PriceObservation } from "~/lib/types";
import { ActorTag } from "./ActorTag";
import { CommentForm, CommentList } from "./Comments";
import { CopyButton } from "./CopyButton";
import { ExtLink } from "./ExtLink";
import { PriceSparkline, PriceTable } from "./PriceHistory";
import { ProductImage } from "./ProductImage";
import { ReportLink } from "./Report";
import { Time } from "./Time";

export function PriceBlock({ price, size = "lg" }: { price: PriceObservation | null; size?: "lg" | "md" }) {
  if (!price) return <p className="text-sm text-ink-3">No price yet</p>;
  const pct = discountPercent(price);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`price ${size === "lg" ? "text-[2rem]" : "text-[1.45rem]"}`}>{formatMoney(price.price, price.currency)}</span>
      {pct !== null && (
        <>
          <span className="price-was text-[0.95rem]">
            <span className="sr-only">was </span>
            {formatMoney(price.original_price, price.currency)}
          </span>
          <span className="save">−{pct}%<span className="sr-only"> off</span></span>
        </>
      )}
    </div>
  );
}

export function DealBadge({ entry }: { entry: Pick<Entry, "deal_starts_at" | "deal_ends_at"> }) {
  const now = useNow();
  const d = dealState(entry.deal_starts_at, entry.deal_ends_at, now);
  if (!d) return null;
  const cls = d.tone === "ending" ? "chip chip-warn" : d.tone === "live" ? "chip chip-live" : "chip";
  return (
    <span className={cls}>
      {d.tone === "ending" && <span aria-hidden="true">⏱</span>}
      {d.label}
    </span>
  );
}

export interface EntryCardProps {
  entry: Entry;
  prices: PriceObservation[] | null;
  comments: Comment[];
  isLowest: boolean;
  boughtThis: boolean;
  itemPurchased: boolean;
  canWrite: boolean;
  canDeleteComment: (c: Comment) => boolean;
  eagerImage?: boolean;
}

/** One product found for an item. Price first, then deal details, then who found it. */
export function EntryCard({ entry, prices, comments, isLowest, boughtThis, itemPurchased, canWrite, canDeleteComment, eagerImage }: EntryCardProps) {
  const now = useNow();
  const cur = entry.current_price;
  const titleId = `${entry.id}-title`;
  return (
    <article
      id={entry.id}
      aria-labelledby={titleId}
      className={`card relative grid scroll-mt-24 grid-cols-[6.5rem_1fr] content-start gap-3 p-3 sm:grid-cols-1 sm:grid-rows-[auto_1fr] sm:gap-0 sm:p-0 ${
        boughtThis ? "outline-2 outline-deal" : ""
      } ${isLowest && !itemPurchased ? "ring-2 ring-want" : ""}`}
    >
      <div className="sm:p-3 sm:pb-0">
        <ProductImage src={entry.image_url} alt={entry.title} eager={eagerImage} />
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:p-4 sm:pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-ink-3">{entry.retailer || "Retailer not given"}</p>
          {boughtThis ? (
            <span className="stamp shrink-0">Bought</span>
          ) : isLowest ? (
            <span className="lowest shrink-0">Lowest</span>
          ) : null}
        </div>

        <h3 id={titleId} className="font-sans text-[0.98rem] font-semibold leading-snug tracking-normal">
          <ExtLink href={entry.product_url} className="link">
            {entry.title}
            <span className="sr-only"> (opens retailer site in a new tab)</span>
          </ExtLink>
        </h3>

        <PriceBlock price={cur} />

        {(entry.coupon_code || entry.deal_starts_at || entry.deal_ends_at) && (
          <div className="flex flex-wrap items-center gap-2">
            {entry.coupon_code && (
              <span className="coupon">
                <span className="sr-only">Coupon code </span>
                {entry.coupon_code}
                <CopyButton text={entry.coupon_code} label="Copy" className="rounded-[0.35rem] bg-want px-1.5 py-0.5 text-[0.7rem] font-bold text-want-ink" />
              </span>
            )}
            <DealBadge entry={entry} />
          </div>
        )}

        {entry.description && <p className="line-clamp-3 text-[0.86rem] text-ink-2">{entry.description}</p>}

        {prices && prices.length > 1 && <PriceSparkline prices={prices} now={now} />}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] text-ink-3">
          <ActorTag actor={entry.author} />
          <Time ts={entry.created_at} />
          {entry.promoted_by && (
            <span>
              · promoted by {entry.promoted_by.kind === "agent" ? entry.promoted_by.name : entry.promoted_by.kind === "user" ? entry.promoted_by.handle : "a writer"}
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-2">
          {entry.buy_url && (
            <ExtLink href={entry.buy_url} className="btn btn-want btn-xs">
              Buy<span className="sr-only"> {entry.title} (new tab)</span> ↗
            </ExtLink>
          )}
          {canWrite && !itemPurchased && <MarkBought itemId={entry.item_id} entryId={entry.id} />}
          <span className="ml-auto">
            <ReportLink type="entry" id={entry.id} />
          </span>
        </div>

        {(entry.price_count > 1 || comments.length > 0 || canWrite) && (
          <div className="grid gap-1">
            {prices && prices.length > 1 && (
              <details className="group">
                <summary className="textlink-btn text-[0.8rem]">
                  {plural(prices.length, "price")} posted <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
                </summary>
                <div className="mt-2">
                  <PriceTable prices={prices} />
                </div>
              </details>
            )}
            {(comments.length > 0 || canWrite) && (
              <details className="group">
                <summary className="textlink-btn text-[0.8rem]">
                  {comments.length ? plural(comments.length, "comment") : "Comment"}{" "}
                  <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
                </summary>
                <div className="mt-2 grid gap-3">
                  <CommentList comments={comments} canDelete={canDeleteComment} />
                  {canWrite && <CommentForm targetType="entry" targetId={entry.id} label="Comment on this product" />}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function MarkBought({ itemId, entryId }: { itemId: string; entryId?: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="purchase" />
      <input type="hidden" name="item_id" value={itemId} />
      {entryId && <input type="hidden" name="entry_id" value={entryId} />}
      <button className="btn btn-ghost btn-xs" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving…" : entryId ? "Bought this" : "Mark bought"}
      </button>
    </fetcher.Form>
  );
}
