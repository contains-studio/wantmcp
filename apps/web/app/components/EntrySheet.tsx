import { useMemo, useState } from "react";
import { dealState, discountPercent, formatDateTime, formatMoney, timeAgo } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import { checkedAt, isFresh, SOURCE_LABEL } from "~/lib/prices";
import type { Entry } from "~/lib/types";
import { ActorTag } from "./ActorTag";
import { ExtLink } from "./ExtLink";

type SortKey = "price" | "discount" | "updated";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const priceOf = (e: Entry) => (e.current_price ? Number(e.current_price.price) : Number.POSITIVE_INFINITY);
const discountOf = (e: Entry) => discountPercent(e.current_price) ?? -1;
const updatedOf = (e: Entry) => Date.parse(e.current_price ? checkedAt(e.current_price) : e.updated_at) || 0;

/**
 * The Sheet layout: one comparison table per item, sortable by price, discount and
 * freshness. On a phone it shows product, price and saving; each row's Details holds the rest.
 * Each row carries the entry's #ent_… anchor.
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

  const header = (key: SortKey, label: string, defaultDir: "asc" | "desc") => {
    const active = sort.key === key;
    return {
      "aria-sort": active ? (sort.dir === "asc" ? "ascending" : "descending") : "none",
      children: (
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1 font-semibold hover:text-ink"
          onClick={() => setSort(active ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: defaultDir })}
        >
          {label}
          <span aria-hidden="true" className={active ? "text-ink" : "text-ink-3 opacity-60"}>
            {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
          <span className="sr-only">, sort {active && sort.dir === "asc" ? "descending" : "ascending"}</span>
        </button>
      ),
    } as const;
  };

  const th = "whitespace-nowrap border-b border-line-strong px-3 py-2 text-left text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-ink-3";
  const td = "border-b border-line px-3 py-2 align-top sm:py-2.5";
  // On a phone: product, price and saving; the rest opens under each row.
  const wide = "hidden sm:table-cell";
  // A column with nothing in it for any product is left out (a column of dashes says nothing).
  const has = {
    was: entries.some((e) => e.current_price?.original_price && discountPercent(e.current_price) !== null),
    off: entries.some((e) => discountPercent(e.current_price) !== null),
    coupon: entries.some((e) => !!e.coupon_code),
    deal: entries.some((e) => !!dealState(e.deal_starts_at, e.deal_ends_at, now)),
  };
  const cols = 6 + Number(has.was) + Number(has.off) + Number(has.coupon) + Number(has.deal);
  const stickyA = "sm:sticky sm:left-0 z-[1] bg-card sm:w-[15rem] sm:min-w-[15rem]";
  const stickyB = "sm:sticky sm:left-[15rem] z-[1] bg-card sm:shadow-[inset_-1px_0_0_var(--line)]";

  return (
    <div className="card overflow-hidden p-0">
      {/* Wider than its column on a tablet: the edge fades to show there's more to the right. */}
      <div className="sheet-scroll relative overflow-x-auto" tabIndex={0} role="region" aria-label={`Price comparison for ${itemText}`}>
        <table className={`w-full border-collapse text-[0.88rem] tabular-nums ${cols >= 9 ? "sm:min-w-[52rem]" : "sm:min-w-[40rem]"}`}>
          {currencies.size > 1 && <caption className="px-3 pt-3 pb-1 text-left text-[0.8rem] text-warn">Mixed currencies: compare with care</caption>}
          <thead>
            <tr>
              <th scope="col" className={`${th} ${stickyA}`}>
                Product
              </th>
              <th scope="col" className={`${th} ${stickyB} text-right`} {...header("price", "Price", "asc")} />
              {has.was && (
                <th scope="col" className={`${th} ${wide} text-right`}>
                  Was
                </th>
              )}
              {has.off && <th scope="col" className={`${th} text-right`} {...header("discount", "Off", "desc")} />}
              <th scope="col" className={`${th} ${wide}`}>
                Retailer
              </th>
              {has.coupon && (
                <th scope="col" className={`${th} ${wide}`}>
                  Coupon
                </th>
              )}
              {has.deal && (
                <th scope="col" className={`${th} ${wide}`}>
                  Deal window
                </th>
              )}
              <th scope="col" className={`${th} ${wide}`}>
                Posted by
              </th>
              <th scope="col" className={`${th} ${wide}`} {...header("updated", "Checked", "desc")} />
              <th scope="col" className={`${th} ${wide}`}>
                Source
              </th>
            </tr>
          </thead>
            {rows.map((e) => {
              const p = e.current_price;
              const pct = discountPercent(p);
              const deal = dealState(e.deal_starts_at, e.deal_ends_at, now);
              const updated = p ? checkedAt(p) : e.updated_at;
              const stale = !!p && !isFresh(p, now);
              const highlight = e.id === boughtId ? "bg-deal-soft" : e.id === lowestId ? "bg-sunk" : "";
              // The row's own toggle (the whole row opens it too): a chevron, no extra line.
              const ROW_TOGGLE = renderDetail ? (
                <details className="row-toggle">
                  <summary className="row-toggle-btn" title="Details, price history and comments">
                    <span className="sr-only">Details, price history and comments for {e.title}</span>
                    <span aria-hidden="true" className="row-toggle-chev">
                      ›
                    </span>
                  </summary>
                </details>
              ) : null;
              return (
                // Each product is its own group: its row, then its details (shown while the row's toggle is open, app.css).
                <tbody key={e.id} className="sheet-group">
                <tr
                  id={e.id}
                  className={`scroll-mt-24 ${highlight} ${stale ? "is-stale" : ""} ${renderDetail ? "cursor-pointer" : ""}`}
                  onClick={(ev) => {
                    // The whole row opens its details; links and buttons inside keep their own job.
                    if (!renderDetail || (ev.target as HTMLElement).closest("a, button, summary, input")) return;
                    const d = ev.currentTarget.querySelector<HTMLDetailsElement>("details.row-toggle");
                    if (d) d.open = !d.open;
                  }}
                >
                  <th scope="row" className={`${td} ${stickyA} ${highlight || "bg-card"} text-left font-normal`}>
                    {/* Two title lines at most, the tag inline after the title: about four products per phone screen. */}
                    <span className="line-clamp-2 leading-snug">
                      <ExtLink href={e.product_url ?? ""} className="link font-semibold">
                        {e.title}
                        <span className="sr-only"> (opens retailer site in a new tab)</span>
                      </ExtLink>
                      {e.id === boughtId && <span className="stamp ml-1.5 align-middle text-[0.6rem]">Bought</span>}
                      {e.id === lowestId && e.id !== boughtId && <span className="lowest ml-1.5 align-middle text-[0.6rem]">Lowest</span>}
                    </span>
                    {e.buy_url && (
                      <ExtLink href={e.buy_url} className="link mt-1 hidden text-[0.78rem] text-ink-2 sm:inline-block">
                        Buy ↗<span className="sr-only"> {e.title} (new tab)</span>
                      </ExtLink>
                    )}
                  </th>
                  <td className={`${td} ${stickyB} ${highlight || "bg-card"} text-right`}>
                    <span className="inline-flex items-start justify-end gap-1">
                      {p ? <span className="price text-[1.25rem]">{formatMoney(p.price, p.currency)}</span> : <span className="text-ink-3">–</span>}
                      {!has.off && ROW_TOGGLE}
                    </span>
                  </td>
                  {has.was && (
                    <td className={`${td} ${wide} text-right text-ink-2`}>
                      {p?.original_price && pct !== null ? <span className="price-was">{formatMoney(p.original_price, p.currency)}</span> : <span className="text-ink-3">–</span>}
                    </td>
                  )}
                  {has.off && (
                    <td className={`${td} text-right`}>
                      <span className="inline-flex items-start justify-end gap-1">
                        {pct !== null ? <span className="save">−{pct}%</span> : <span className="text-ink-3">–</span>}
                        {ROW_TOGGLE}
                      </span>
                    </td>
                  )}
                  <td className={`${td} ${wide} text-ink-2`}>{e.retailer || "–"}</td>
                  {has.coupon && <td className={`${td} ${wide}`}>{e.coupon_code ? <code className="font-semibold">{e.coupon_code}</code> : <span className="text-ink-3">–</span>}</td>}
                  {has.deal && <td className={`${td} ${wide} whitespace-nowrap text-ink-2`}>{deal ? deal.label.replace(/^Deal /, "") : <span className="text-ink-3">–</span>}</td>}
                  <td className={`${td} ${wide}`}>
                    <ActorTag actor={e.author} compact />
                  </td>
                  <td className={`${td} ${wide} whitespace-nowrap text-ink-2`}>
                    <time dateTime={updated} title={formatDateTime(updated)}>
                      {timeAgo(updated, now)}
                    </time>
                    {stale && <span className="block text-[0.75rem] text-ink-3">not checked today</span>}
                  </td>
                  <td className={`${td} ${wide} whitespace-nowrap text-ink-2`}>
                    {p ? (
                      <>
                        {SOURCE_LABEL[p.source ?? "unknown"]}
                        {p.in_stock === true && <span className="block text-[0.75rem] text-ink-3">in stock</span>}
                        {p.in_stock === false && <span className="block text-[0.75rem] text-warn">out of stock</span>}
                      </>
                    ) : (
                      <span className="text-ink-3">–</span>
                    )}
                  </td>
                </tr>
                {renderDetail && (
                  <tr className="sheet-detail">
                    <td colSpan={cols} className="border-b border-line bg-paper px-3 py-3">
                      {renderDetail(e)}
                    </td>
                  </tr>
                )}
                </tbody>
              );
            })}
        </table>
      </div>
    </div>
  );
}
