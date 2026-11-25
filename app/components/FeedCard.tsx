import { Link } from "react-router";
import { formatMoney } from "~/lib/format";
import type { FeedEntry } from "~/lib/types";
import { ActorTag } from "./ActorTag";
import { DealBadge, PriceBlock } from "./EntryCard";
import { ProductImage } from "./ProductImage";
import { Time } from "./Time";

/** A feed row: one listed entry with the item and list it belongs to. */
export function FeedCard({ row, children }: { row: FeedEntry; children?: React.ReactNode }) {
  const { entry: e, item, list } = row;
  const href = `/l/${list.id}#${e.id}`;
  if (e.status === "suggested") return <SuggestedFeedCard row={row}>{children}</SuggestedFeedCard>;
  if (e.kind && e.kind !== "product") return <TextFeedCard row={row}>{children}</TextFeedCard>;
  return (
    <article className="card grid grid-cols-[5.5rem_1fr] gap-3 p-3 sm:grid-cols-[8rem_1fr] sm:gap-4 sm:p-4" aria-label={e.title}>
      <Link to={href} tabIndex={-1} aria-hidden="true">
        <ProductImage src={e.image_url} alt="" />
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="truncate text-[0.78rem] text-ink-3">
          For <span className="font-semibold text-ink-2">“{item.text}”</span>
        </p>
        <h3 className="font-sans text-[0.98rem] font-semibold leading-snug tracking-normal">
          <Link to={href} className="link">
            {e.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <PriceBlock price={e.current_price} size="md" />
          {e.coupon_code && <span className="coupon pr-2">{e.coupon_code}</span>}
          <DealBadge entry={e} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] text-ink-3">
          <ActorTag actor={e.author} compact />
          <Time ts={e.created_at} />
          <span aria-hidden="true">·</span>
          <span className="truncate">{e.retailer}</span>
        </div>
        <p className="truncate text-[0.78rem] text-ink-3">
          on{" "}
          <Link to={`/l/${list.id}`} className="link font-semibold text-ink-2">
            {list.title}
          </Link>{" "}
          by {list.owner_handle}
          {item.purchase && <span className="chip chip-live ml-2">Bought</span>}
        </p>
        {children}
      </div>
    </article>
  );
}

/** Writers-only. An outside suggestion is untrusted text: no image, no links. */
function SuggestedFeedCard({ row, children }: { row: FeedEntry; children?: React.ReactNode }) {
  const { entry: e, item, list } = row;
  return (
    <article className="untrusted grid gap-1.5 p-4" aria-label={`Suggestion: ${e.title}`}>
      <p className="eyebrow text-warn">Outside suggestion · not public</p>
      <p className="truncate text-[0.78rem] text-ink-3">
        For <span className="font-semibold text-ink-2">“{item.text}”</span> on {list.title}
      </p>
      <p className="break-words font-semibold">{e.title}</p>
      {e.current_price && <p className="price text-[1.3rem]">{formatMoney(e.current_price.price, e.current_price.currency)}</p>}
      <p className="plain-url">{e.product_url}</p>
      <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-ink-3">
        <ActorTag actor={e.author} /> <Time ts={e.created_at} />
      </div>
      <Link to={`/l/${list.id}#sugg-h`} className="btn btn-ghost btn-xs mt-1 w-fit">
        Review on the list
      </Link>
      {children}
    </article>
  );
}


/** An update (task list) or answer (research list) in a feed: text, no image or price. */
function TextFeedCard({ row, children }: { row: FeedEntry; children?: React.ReactNode }) {
  const { entry: e, item, list } = row;
  const href = `/l/${list.id}#${e.id}`;
  return (
    <article className="card grid gap-1.5 p-4" aria-label={e.title}>
      <p className="truncate text-[0.78rem] text-ink-3">
        {e.kind === "answer" ? "Answer to" : "Update on"} <span className="font-semibold text-ink-2">“{item.text}”</span>
      </p>
      <h3 className="font-sans text-[0.98rem] font-semibold leading-snug tracking-normal">
        <Link to={href} className="link">
          {e.title}
        </Link>
      </h3>
      {e.description && <p className="line-clamp-3 whitespace-pre-line text-[0.88rem] text-ink-2">{e.description}</p>}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] text-ink-3">
        <ActorTag actor={e.author} compact />
        <Time ts={e.created_at} />
        <span aria-hidden="true">·</span>
        <Link to={`/l/${list.id}`} className="link truncate font-semibold text-ink-2">
          {list.title}
        </Link>
      </div>
      {children}
    </article>
  );
}
