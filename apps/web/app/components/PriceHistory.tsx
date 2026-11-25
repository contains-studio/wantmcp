import { actorName, formatDate, formatDateTime, formatMoney } from "~/lib/format";
import { checkedAt, priceChangeLabel } from "~/lib/prices";
import type { PriceObservation } from "~/lib/types";
import { Time } from "./Time";

/**
 * A step chart of an entry's price over time (prices hold until the next observation),
 * with a table of every observation behind a disclosure. Time is when each price was checked,
 * not when it was posted (an agent may post an older check later).
 */
export function PriceSparkline({ prices, now }: { prices: PriceObservation[]; now: number }) {
  const pts = prices
    .map((p) => ({ t: Date.parse(checkedAt(p)), v: Number(p.price), p }))
    .filter((d) => Number.isFinite(d.t) && Number.isFinite(d.v))
    .sort((a, b) => a.t - b.t);
  if (pts.length < 2) return null;
  // Every check within the same hour: nothing to draw over time.
  if (pts[pts.length - 1].t - pts[0].t < 3600_000) return null;

  const W = 240;
  const H = 56;
  const PAD = 6;
  const t0 = pts[0].t;
  const t1 = Math.max(now, pts[pts.length - 1].t);
  const vals = pts.map((d) => d.v);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (t: number) => PAD + ((t - t0) / (t1 - t0 || 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - PAD * 2);

  let d = `M${x(pts[0].t).toFixed(1)},${y(pts[0].v).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` H${x(pts[i].t).toFixed(1)} V${y(pts[i].v).toFixed(1)}`;
  }
  d += ` H${x(t1).toFixed(1)}`;

  const first = pts[0];
  const last = pts[pts.length - 1];
  const cur = last.p.currency;
  const change = last.v - first.v;
  const changeLabel = priceChangeLabel(first.v, last.v, cur);
  const summary =
    change === 0
      ? `Price unchanged at ${formatMoney(last.v, cur)} across ${pts.length} observations.`
      : `Price ${change < 0 ? "fell" : "rose"} from ${formatMoney(first.v, cur)} to ${formatMoney(last.v, cur)} across ${pts.length} observations. Lowest ${formatMoney(lo, cur)}, highest ${formatMoney(hi, cur)}.`;

  return (
    <figure className="price-sparkline m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-14 w-full overflow-visible" role="img" aria-label={summary} preserveAspectRatio="none">
        <line x1={PAD} x2={W - PAD} y1={y(lo)} y2={y(lo)} stroke="var(--line)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* Markers are HTML so they stay round when the SVG stretches. */}
      <div className="relative -mt-14 h-14" aria-hidden="true">
        {pts.map((pt, i) => (
          <span
            key={pt.p.id}
            title={`${formatMoney(pt.v, cur)} · ${formatDateTime(checkedAt(pt.p))} · ${actorName(pt.p.posted_by)}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              left: `${(x(pt.t) / W) * 100}%`,
              top: `${(y(pt.v) / H) * 100}%`,
              width: i === pts.length - 1 ? 10 : 8,
              height: i === pts.length - 1 ? 10 : 8,
              background: i === pts.length - 1 ? "var(--want)" : "var(--card)",
              borderColor: i === pts.length - 1 ? "var(--card)" : "var(--ink-2)",
            }}
          />
        ))}
      </div>
      <figcaption className="mt-1 flex justify-between gap-2 text-[0.72rem] text-ink-3 tabular-nums">
        <span>
          {formatMoney(first.v, cur)} on {formatDate(checkedAt(first.p))}
        </span>
        {/* The change from the first check to now; nothing when the price hasn't moved. */}
        {changeLabel && <span className={change < 0 ? "text-deal" : ""}>{changeLabel}</span>}
      </figcaption>
    </figure>
  );
}

export function PriceTable({ prices }: { prices: PriceObservation[] }) {
  const rows = [...prices].sort((a, b) => checkedAt(b).localeCompare(checkedAt(a)));
  return (
    <table className="w-full text-left text-[0.8rem]">
      <caption className="sr-only">Price history, newest first</caption>
      <thead className="text-ink-3">
        <tr>
          <th scope="col" className="py-1 pr-2 font-semibold">Price</th>
          <th scope="col" className="py-1 pr-2 font-semibold">When</th>
          <th scope="col" className="py-1 font-semibold">By</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} className="border-t border-line align-top">
            <td className="py-1.5 pr-2 font-semibold tabular-nums">
              {formatMoney(p.price, p.currency)}
              {p.original_price && Number(p.original_price) > Number(p.price) && (
                <span className="price-was ml-1 font-normal">{formatMoney(p.original_price, p.currency)}</span>
              )}
              {p.note && <div className="font-normal text-ink-3">{p.note}</div>}
            </td>
            <td className="py-1.5 pr-2 text-ink-2">
              <Time ts={checkedAt(p)} />
            </td>
            <td className="py-1.5 text-ink-2">{actorName(p.posted_by)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
