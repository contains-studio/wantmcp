import { useMemo, useState } from "react";
import { dealState, discountPercent, formatDateTime, formatMoney, timeAgo } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import { checkedAt, isFresh, isVerified, SOURCE_LABEL } from "~/lib/prices";
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
 * freshness. On a phone the product and price columns stay pinned while the rest scrolls.
 * Each row carries the entry's #ent_… anchor.
 */
export function EntrySheet({ entries, lowestId, boughtId, itemText }: { entries: Entry[]; lowestId: string | null; boughtId: string | null; itemText: string }) {
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
          className="inline-flex items-center gap-1 font-semibold hover:text-ink"
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
  const td = "border-b border-line px-3 py-2.5 align-top";
  const stickyA = "sticky left-0 z-[1] w-[9.5rem] min-w-[9.5rem] bg-card sm:w-[15rem] sm:min-w-[15rem]";
  const stickyB = "sticky left-[9.5rem] z-[1] bg-card shadow-[inset_-1px_0_0_var(--line)] sm:left-[15rem]";

  return (
    <div className="card overflow-hidden p-0">
      <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={`Price comparison for ${itemText}`}>
        <table className="w-full min-w-[52rem] border-collapse text-[0.88rem] tabular-nums">
          <caption className="px-3 pt-3 pb-1 text-left text-[0.8rem] text-ink-3">
            {entries.length} {entries.length === 1 ? "product" : "products"} compared
            {currencies.size > 1 && " · mixed currencies, compare with care"}
            <span className="sm:hidden"> · scroll sideways for more</span>
          </caption>
          <thead>
            <tr>
              <th scope="col" className={`${th} ${stickyA}`}>
                Product
              </th>
              <th scope="col" className={`${th} ${stickyB} text-right`} {...header("price", "Price", "asc")} />
              <th scope="col" className={`${th} text-right`}>
                Was
              </th>
              <th scope="col" className={`${th} text-right`} {...header("discount", "Off", "desc")} />
              <th scope="col" className={th}>
                Retailer
              </th>
              <th scope="col" className={th}>
                Coupon
              </th>
              <th scope="col" className={th}>
                Deal window
              </th>
              <th scope="col" className={th}>
                Posted by
              </th>
              <th scope="col" className={th} {...header("updated", "Checked", "desc")} />
              <th scope="col" className={th}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const p = e.current_price;
              const pct = discountPercent(p);
              const deal = dealState(e.deal_starts_at, e.deal_ends_at, now);
              const updated = p ? checkedAt(p) : e.updated_at;
              const stale = !!p && !isFresh(p, now);
              const highlight = e.id === boughtId ? "bg-deal-soft" : e.id === lowestId ? "bg-sunk" : "";
              return (
                <tr key={e.id} id={e.id} className={`scroll-mt-24 ${highlight} ${stale ? "is-stale" : ""}`}>
                  <th scope="row" className={`${td} ${stickyA} ${highlight || "bg-card"} text-left font-normal`}>
                    <ExtLink href={e.product_url ?? ""} className="link line-clamp-3 font-semibold leading-snug">
                      {e.title}
                      <span className="sr-only"> (opens retailer site in a new tab)</span>
                    </ExtLink>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {e.id === boughtId && <span className="stamp text-[0.6rem]">Bought</span>}
                      {e.id === lowestId && e.id !== boughtId && <span className="lowest text-[0.6rem]">Lowest</span>}
                      {e.buy_url && (
                        <ExtLink href={e.buy_url} className="link text-[0.78rem] text-ink-2">
                          Buy ↗<span className="sr-only"> {e.title} (new tab)</span>
                        </ExtLink>
                      )}
                    </span>
                  </th>
                  <td className={`${td} ${stickyB} ${highlight || "bg-card"} text-right`}>
                    {p ? <span className="price text-[1.25rem]">{formatMoney(p.price, p.currency)}</span> : <span className="text-ink-3">–</span>}
                  </td>
                  <td className={`${td} text-right text-ink-2`}>
                    {p?.original_price && pct !== null ? <span className="price-was">{formatMoney(p.original_price, p.currency)}</span> : <span className="text-ink-3">–</span>}
                  </td>
                  <td className={`${td} text-right`}>{pct !== null ? <span className="save">−{pct}%</span> : <span className="text-ink-3">–</span>}</td>
                  <td className={`${td} text-ink-2`}>{e.retailer || "–"}</td>
                  <td className={td}>{e.coupon_code ? <code className="font-semibold">{e.coupon_code}</code> : <span className="text-ink-3">–</span>}</td>
                  <td className={`${td} whitespace-nowrap text-ink-2`}>{deal ? deal.label.replace(/^Deal /, "") : <span className="text-ink-3">–</span>}</td>
                  <td className={td}>
                    <ActorTag actor={e.author} compact />
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink-2`}>
                    <time dateTime={updated} title={formatDateTime(updated)}>
                      {timeAgo(updated, now)}
                    </time>
                    {stale && <span className="block text-[0.75rem] text-ink-3">not checked today</span>}
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink-2`}>
                    {p ? (
                      <>
                        {SOURCE_LABEL[p.source ?? "unknown"]}
                        {!isVerified(p) && <span className="block text-[0.75rem] text-ink-3">unverified</span>}
                        {p.in_stock === true && <span className="block text-[0.75rem] text-ink-3">in stock</span>}
                        {p.in_stock === false && <span className="block text-[0.75rem] text-warn">out of stock</span>}
                      </>
                    ) : (
                      <span className="text-ink-3">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
