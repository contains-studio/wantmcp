import { useMemo } from "react";
import { dealState, discountPercent, formatDateTime, formatMoney, timeAgo } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import { checkedAt, isFresh, LOWEST_VERIFIED_NOTE, lowestLabel, SOURCE_LABEL } from "~/lib/prices";
import type { Entry } from "~/lib/types";
import { ActorTag } from "./ActorTag";
import { ExtLink } from "./ExtLink";
import { ProductImage } from "./ProductImage";

type SortKey = "price" | "discount" | "updated";
export type SheetSort = { key: SortKey; dir: "asc" | "desc" };
type Sort = SheetSort;

const priceOf = (e: Entry) => (e.current_price ? Number(e.current_price.price) : Number.POSITIVE_INFINITY);
const discountOf = (e: Entry) => discountPercent(e.current_price) ?? -1;
const updatedOf = (e: Entry) => Date.parse(e.current_price ? checkedAt(e.current_price) : e.updated_at) || 0;

/** From this many products a want gets a sort control; below it the list is already in price order, cheapest first. */
export const SORT_FROM = 4;

/** Where the price was seen, in words a person knows (clean-eyes review F2). */
const SHEET_SOURCE: Record<string, string> = {
  retailer_page: "checked on the store's page",
  search: "from a search result",
  aggregator: "from a price site",
};

const SORTS: Array<[string, SheetSort, string]> = [
  ["price-asc", { key: "price", dir: "asc" }, "Price, low to high"],
  ["price-desc", { key: "price", dir: "desc" }, "Price, high to low"],
  ["discount-desc", { key: "discount", dir: "desc" }, "Biggest saving"],
  ["updated-desc", { key: "updated", dir: "desc" }, "Checked most recently"],
];

/**
 * The Sheet's sort, as one compact control (owner review: three pills on their own row read as a third heading). The
 * want puts it on its "Added by" line from 640px and on one short line above the products on a phone.
 */
export function SheetSortSelect({ value, onChange, saving, label, className = "" }: { value: SheetSort; onChange: (s: SheetSort) => void; saving: boolean; label: string; className?: string }) {
  const id = `${value.key}-${value.dir}`;
  return (
    <label className={`sheet-sort ${className}`}>
      <span className="text-ink-3">Sort</span>
      <select
        aria-label={label}
        value={id}
        onChange={(e) => onChange(SORTS.find(([k]) => k === e.target.value)![1])}
        className="sheet-sort-select"
      >
        {SORTS.filter(([k]) => saving || k !== "discount-desc").map(([k, , text]) => (
          <option key={k} value={k}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

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
  sort: sortProp,
}: {
  /** The sort, when the want shows the control (SheetSortSelect); cheapest first otherwise. */
  sort?: SheetSort;
  entries: Entry[];
  lowestId: string | null;
  boughtId: string | null;
  itemText: string;
  /** A product's details, price history and comments, opened under its own row. */
  renderDetail?: (e: Entry) => React.ReactNode;
}) {
  const now = useNow();
  const sort: Sort = sortProp ?? { key: "price", dir: "asc" };
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

  const lowestText = lowestLabel(entries, lowestId, now);

  return (
    <div className="sheet-list">
      {currencies.size > 1 && <p className="pb-1 text-[0.8rem] text-warn">Mixed currencies: compare with care</p>}
      <ul aria-label={`Products for ${itemText}`} className="sheet-rows">
        {rows.map((e) => {
          const p = e.current_price;
          const pct = discountPercent(p);
          const deal = dealState(e.deal_starts_at, e.deal_ends_at, now);
          const updated = p ? checkedAt(p) : e.updated_at;
          const stale = !!p && !isFresh(p, now);
          // Green price only for the truly lowest: a "Lowest verified" row with a cheaper one above stays plain.
          const state = e.id === boughtId ? "is-bought" : e.id === lowestId && lowestText === "Lowest" ? "is-lowest" : "";
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
                  {/* The whole name, wrapping (clean-eyes review T1: names cut mid-word on a phone). */}
                  <span className="sheet-title">
                    <ExtLink href={e.product_url ?? ""} className="link">
                      {e.title}
                      <span className="sr-only"> (opens retailer site in a new tab)</span>
                    </ExtLink>
                    {e.id === boughtId && <span className="stamp ml-1.5 align-middle text-[0.6rem]">Bought</span>}
                    {e.id === lowestId && e.id !== boughtId && (
                      <span className="lowest ml-1.5 align-middle text-[0.6rem]" title={lowestText === "Lowest verified" ? LOWEST_VERIFIED_NOTE : undefined}>
                        {lowestText}
                        {lowestText === "Lowest verified" && <span className="sr-only">: {LOWEST_VERIFIED_NOTE}</span>}
                      </span>
                    )}
                  </span>
                  {/* Who found it and how sure the price is: one quiet line, the trust words as everywhere else. */}
                  <span className="sheet-meta">
                    {/* On a phone the store leads this line (beside the price there it would be cut). */}
                    {e.retailer && <span className="sheet-meta-store">{e.retailer}</span>}
                    <span>
                      <ActorTag actor={e.author} compact />
                    </span>
                    <span>
                      checked{" "}
                      <time dateTime={updated} title={formatDateTime(updated)}>
                        {timeAgo(updated, now)}
                      </time>
                      {stale && ", not today"}
                    </span>
                    {p && <span>{SHEET_SOURCE[p.source ?? "unknown"] ?? SOURCE_LABEL[p.source ?? "unknown"]}</span>}
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
