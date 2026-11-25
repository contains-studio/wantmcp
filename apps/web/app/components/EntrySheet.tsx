import { useMemo, useState } from "react";
import { dealState, discountPercent, formatDateTime, formatMoney, timeAgo } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import { checkedAt, isFresh, SOURCE_LABEL } from "~/lib/prices";
import type { Entry } from "~/lib/types";
import { ActorTag } from "./ActorTag";
import { ExtLink } from "./ExtLink";
import { ProductImage } from "./ProductImage";

type SortKey = "price" | "discount" | "updated";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const priceOf = (e: Entry) => (e.current_price ? Number(e.current_price.price) : Number.POSITIVE_INFINITY);
const discountOf = (e: Entry) => discountPercent(e.current_price) ?? -1;
const updatedOf = (e: Entry) => Date.parse(e.current_price ? checkedAt(e.current_price) : e.updated_at) || 0;

/** From this many products a want gets sort controls; below it the list is already in price order, cheapest first. */
const SORT_FROM = 4;

/**
 * The Sheet layout: the products found for one want, cheapest first, one row each. Usually one to three, so no table
 * chrome: each row is the product (photo, title) then its price with the retailer under it; who posted it, when the
 * price was checked and where it was seen sit on one quiet line (from 640px). From four products a small sort control
 * appears. Each row opens in place (its details, price history and comments) and carries the entry's #ent_… anchor.
 */
export function EntrySheet({
  entries,
  lowestId,
  boughtId,
  itemText,
  renderDetail,
}: {
  entries: Entry[];
  lowestId: string | null;
  boughtId: string | null;
  itemText: string;
  /** A product's details, price history and comments, opened under its own row. */
  renderDetail?: (e: Entry) => React.ReactNode;
}) {
  const now = useNow();
  const [sort, setSort] = useState<Sort>({ key: "price", dir: "asc" });
  const rows = useMemo(() => {
    const val = sort.key === "price" ? priceOf : sort.key === "discount" ? discountOf : updatedOf;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...entries].sort((a, b) => {
      const d = (val(a) - val(b)) * sign;
      if (Number.isNaN(d)) return 0;
      // Entries without a price always go last.
      if (!a.current_price && b.current_price) return 1;
      if (a.current_price && !b.current_price) return -1;
      return d;
    });
  }, [entries, sort]);
  const currencies = new Set(entries.map((e) => e.current_price?.currency).filter(Boolean));
  // A photo column only when some product has a photo; then every row keeps the frame (the neutral tile) so rows align.
  const photos = entries.some((e) => !!e.image_url);

  const sortButton = (key: SortKey, label: string, defaultDir: "asc" | "desc") => {
    const active = sort.key === key;
    return (
      <button
        type="button"
        aria-pressed={active}
        className={`sheet-sort-btn ${active ? "is-on" : ""}`}
        onClick={() => setSort(active ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: defaultDir })}
      >
        {label}
        {active && <span aria-hidden="true"> {sort.dir === "asc" ? "↑" : "↓"}</span>}
        {active && <span className="sr-only">, {sort.dir === "asc" ? "lowest first" : "highest first"}</span>}
      </button>
    );
  };

  return (
    <div className="sheet-list">
      {(entries.length >= SORT_FROM || currencies.size > 1) && (
        <div className="sheet-sort">
          {currencies.size > 1 && <span className="mr-auto text-warn">Mixed currencies: compare with care</span>}
          {entries.length >= SORT_FROM && (
            <div role="group" aria-label={`Sort products for ${itemText}`} className="ml-auto flex items-center gap-1">
              <span className="text-ink-3">Sort</span>
              {sortButton("price", "Price", "asc")}
              {entries.some((e) => discountPercent(e.current_price) !== null) && sortButton("discount", "Saving", "desc")}
              {sortButton("updated", "Checked", "desc")}
            </div>
          )}
        </div>
      )}
      <ul aria-label={`Products for ${itemText}`} className="sheet-rows">
        {rows.map((e) => {
          const p = e.current_price;
          const pct = discountPercent(p);
          const deal = dealState(e.deal_starts_at, e.deal_ends_at, now);
          const updated = p ? checkedAt(p) : e.updated_at;
          const stale = !!p && !isFresh(p, now);
          const state = e.id === boughtId ? "is-bought" : e.id === lowestId ? "is-lowest" : "";
          return (
            // Each product is its own group: its row, then its details (shown while the row's toggle is open, app.css).
            <li key={e.id} id={e.id} className={`sheet-group scroll-mt-24 ${state} ${stale ? "is-stale" : ""}`}>
              <div
                className={`sheet-row ${photos ? "has-photo" : ""} ${renderDetail ? "cursor-pointer" : ""}`}
                onClick={(ev) => {
                  // The whole row opens its details; links and buttons inside keep their own job.
                  if (!renderDetail || (ev.target as HTMLElement).closest("a, button, summary, input")) return;
                  const d = ev.currentTarget.querySelector<HTMLDetailsElement>("details.row-toggle");
                  if (d) d.open = !d.open;
                }}
              >
                {photos && (
                  <div className="sheet-thumb">
                    <ProductImage src={e.image_url} alt="" />
                  </div>
                )}
                <div className="sheet-main">
                  {/* Two title lines at most, the tag inline after it: about four products per phone screen. */}
                  <span className="sheet-title line-clamp-2">
                    <ExtLink href={e.product_url ?? ""} className="link">
                      {e.title}
                      <span className="sr-only"> (opens retailer site in a new tab)</span>
                    </ExtLink>
                    {e.id === boughtId && <span className="stamp ml-1.5 align-middle text-[0.6rem]">Bought</span>}
                    {e.id === lowestId && e.id !== boughtId && <span className="lowest ml-1.5 align-middle text-[0.6rem]">Lowest</span>}
                  </span>
                  {/* Who found it and how sure the price is: one quiet line, the trust words as everywhere else. */}
                  <span className="sheet-meta">
                    <ActorTag actor={e.author} compact />
                    <span>
                      checked{" "}
                      <time dateTime={updated} title={formatDateTime(updated)}>
                        {timeAgo(updated, now)}
                      </time>
                      {stale && ", not today"}
                    </span>
                    {p && <span>{SOURCE_LABEL[p.source ?? "unknown"]}</span>}
                    {p?.in_stock === false && <span className="text-warn">out of stock</span>}
                    {e.coupon_code && (
                      <span>
                        Code <code className="font-semibold text-ink-2">{e.coupon_code}</code>
                      </span>
                    )}
                    {deal && <span className="text-ink-2">{deal.label}</span>}
                    {e.buy_url && (
                      <ExtLink href={e.buy_url} className="link">
                        Buy ↗<span className="sr-only"> {e.title} (new tab)</span>
                      </ExtLink>
                    )}
                  </span>
                </div>
                {/* The answer: the price, with where it is sold right under it. */}
                <div className="sheet-price">
                  {p ? <span className="price">{formatMoney(p.price, p.currency)}</span> : <span className="text-ink-3">No price</span>}
                  <span className="sheet-price-sub">
                    {pct !== null && <span className="save">−{pct}%</span>}
                    {pct !== null && p?.original_price && <span className="price-was max-sm:hidden">{formatMoney(p.original_price, p.currency)}</span>}
                    {e.retailer && <span className="sheet-retailer">{e.retailer}</span>}
                  </span>
                </div>
                {renderDetail ? (
                  <details className="row-toggle">
                    <summary className="row-toggle-btn" title="Details, price history and comments">
                      <span className="sr-only">Details, price history and comments for {e.title}</span>
                      <span aria-hidden="true" className="row-toggle-chev">
                        ›
                      </span>
                    </summary>
                  </details>
                ) : (
                  <span />
                )}
              </div>
              {renderDetail && <div className="sheet-detail">{renderDetail(e)}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
