import { discountPercent, formatMoney } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import { isFresh } from "~/lib/prices";
import type { Entry } from "~/lib/types";
import { DealBadge } from "./EntryCard";
import { ExtLink } from "./ExtLink";
import { ProductImage } from "./ProductImage";
import { Provenance } from "./Provenance";

/**
 * The Cards layout's comparison: one tight row per product, with price, was, saving and who saw
 * it lined up so the eye can run down a column. Each row carries the entry's #ent_ anchor;
 * descriptions, price history, comments and tools live in the disclosure under the rows.
 */
export function EntryRows({ entries, lowestId, boughtId, itemText }: { entries: Entry[]; lowestId: string | null; boughtId: string | null; itemText: string }) {
  const now = useNow();
  return (
    <ul className="entry-rows" aria-label={`Products for ${itemText}`}>
      {entries.map((e) => {
        const p = e.current_price;
        const pct = discountPercent(p);
        const stale = !!p && !isFresh(p, now);
        return (
          <li key={e.id} id={e.id} className={`entry-row scroll-mt-24 ${stale ? "is-stale" : ""} ${e.id === lowestId ? "is-lowest" : ""}`}>
            <span className="entry-row-img" aria-hidden="true">
              <ProductImage src={e.image_url} alt="" />
            </span>
            <span className="entry-row-name">
              <ExtLink href={e.product_url ?? ""} className="link font-medium leading-snug">
                {e.title}
                <span className="sr-only"> (opens retailer site in a new tab)</span>
              </ExtLink>
              <span className="block text-[0.8rem] text-ink-3">
                {e.retailer || "Retailer not given"}
                {e.id === boughtId && <span className="stamp ml-2">Bought</span>}
                {e.id === lowestId && e.id !== boughtId && <span className="lowest ml-2">Lowest</span>}
              </span>
            </span>
            <span className="entry-row-price">
              {p ? (
                <>
                  <span className="price text-[1.2rem]">{formatMoney(p.price, p.currency)}</span>
                  {pct !== null && (
                    <span className="block text-[0.8rem]">
                      <span className="price-was">
                        <span className="sr-only">was </span>
                        {formatMoney(p.original_price, p.currency)}
                      </span>{" "}
                      <span className="save">−{pct}%</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[0.85rem] text-ink-3">No price</span>
              )}
            </span>
            <span className="entry-row-meta">
              <Provenance price={p} />
              <span className="flex flex-wrap gap-1.5">
                {e.coupon_code && <span className="coupon pr-2">{e.coupon_code}</span>}
                <DealBadge entry={e} />
                {e.buy_url && (
                  <ExtLink href={e.buy_url} className="link text-[0.8rem]">
                    Buy<span className="sr-only"> {e.title} (new tab)</span>
                  </ExtLink>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
