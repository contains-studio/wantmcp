/**
 * /app/traffic (SPEC 23): where visitors come from, for the accounts the server allows (everyone else gets the normal
 * not-found page). One calm screen, phone first: two numbers, visits per day, then the top sources, tags, pages and
 * sign-ups by source. Page views are counted by the web Worker as route patterns, never a real list or person.
 */
import { data, Link } from "react-router";
import type { Route } from "./+types/app-traffic";
import { api, toRouteError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import type { TrafficReport } from "~/lib/types";

export function meta() {
  return [{ title: "Traffic · The Want MCP" }, { name: "robots", content: "noindex" }];
}

const RANGES = [7, 30] as const;

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const asked = Number(new URL(request.url).searchParams.get("days"));
  const days = RANGES.includes(asked as (typeof RANGES)[number]) ? asked : 30;
  let report: TrafficReport;
  try {
    report = await api<TrafficReport>(request, "/me/traffic", { query: { days } });
  } catch (err) {
    toRouteError(err); // 404 for anyone the server doesn't allow: the normal not-found page
  }
  return data({ report, days }, { headers: { "Cache-Control": "private, no-store" } });
}

const nf = new Intl.NumberFormat("en-US");
/** "Nov 24", in UTC (the server's days are UTC dates). */
const dayLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

export default function Traffic({ loaderData }: Route.ComponentProps) {
  const { report: r, days } = loaderData;
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[47.5rem] gap-6 px-4 pt-8 pb-16 sm:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.4rem]">Traffic</h1>
            <p className="mt-1 text-[0.92rem] text-ink-2">Where visitors come from. Pages are counted by kind, never by list or person.</p>
          </div>
          <nav aria-label="Period" className="view-switch w-fit">
            {RANGES.map((d) => (
              <Link key={d} to={`?days=${d}`} replace preventScrollReset aria-current={d === days ? "page" : undefined} className={`view-tab ${d === days ? "is-on" : ""}`}>
                {d} days
              </Link>
            ))}
          </nav>
        </header>

        {/* The two numbers that matter, then their shape over time. */}
        <section aria-label="Totals" className="grid grid-cols-2 gap-3">
          <Stat label="Visits" value={r.totals.visits} sub={`${nf.format(r.totals.signed_out)} signed out`} />
          <Stat label="Sign-ups" value={r.totals.sign_ups} sub={r.totals.visits ? `${((r.totals.sign_ups / r.totals.visits) * 100).toFixed(1)}% of visits` : "No visits yet"} />
        </section>

        <PerDay perDay={r.per_day} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Ranked title="Sources" note="The site a visit came from; direct when there was none." rows={r.sources.map((s) => ({ name: s.name, n: s.visits }))} />
          <Ranked title="Tags" note="From links with ?ref=." rows={r.tags.map((s) => ({ name: s.name, n: s.visits }))} empty="No tagged links used yet." />
          <Ranked title="Pages" rows={r.paths.map((s) => ({ name: s.name, n: s.visits }))} mono />
          <Ranked title="Sign-ups by source" rows={r.sign_ups_by_source.map((s) => ({ name: s.name, n: s.sign_ups }))} empty="No sign-ups in this period." />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="card grid gap-1 p-4 sm:p-5">
      <p className="text-[0.85rem] font-medium text-ink-2">{label}</p>
      <p className="text-[2rem] leading-none font-semibold tabular-nums tracking-[-0.02em]">{nf.format(value)}</p>
      <p className="text-[0.82rem] text-ink-3">{sub}</p>
    </div>
  );
}

/**
 * Visits per day: one series in the accent, thin bars with rounded tops on a recessive baseline. Each bar names its
 * day and count on hover or tap (title); the table under it carries the same numbers for screen readers.
 */
function PerDay({ perDay }: { perDay: TrafficReport["per_day"] }) {
  const max = Math.max(1, ...perDay.map((d) => d.visits));
  const peak = perDay.reduce((a, d) => (d.visits > a.visits ? d : a), perDay[0] ?? { date: "", visits: 0 });
  // A few day labels under the bars: the first, the last and two between, so they never collide on a phone.
  const labelled = new Set([0, Math.floor((perDay.length - 1) / 3), Math.floor(((perDay.length - 1) * 2) / 3), perDay.length - 1]);
  return (
    <section aria-labelledby="per-day-h" className="card grid gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="per-day-h" className="text-[1rem] font-semibold">
          Visits per day
        </h2>
        {peak.visits > 0 && (
          <p className="text-[0.82rem] text-ink-3">
            Busiest day: {new Date(`${peak.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })} ({nf.format(peak.visits)} visits)
          </p>
        )}
      </div>
      <div className="traffic-bars" aria-hidden="true">
        {perDay.map((d) => (
          <div key={d.date} className="traffic-bar-slot" title={`${longDay(d.date)}: ${nf.format(d.visits)} visits${d.sign_ups ? `, ${d.sign_ups} sign-up${d.sign_ups === 1 ? "" : "s"}` : ""}`}>
            <div className="traffic-bar" style={{ height: `${Math.max(d.visits ? 3 : 0, (d.visits / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="traffic-axis" aria-hidden="true">
        {perDay.map((d, i) => (
          <span key={d.date}>{labelled.has(i) ? dayLabel(d.date) : ""}</span>
        ))}
      </div>
      <details className="group">
        <summary className="textlink-btn text-[0.85rem]">Show as a table</summary>
        <table className="mt-2 w-full text-[0.85rem] tabular-nums">
          <caption className="sr-only">Visits per day</caption>
          <thead>
            <tr className="text-left text-ink-3">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Visits</th>
              <th className="py-1 text-right font-medium">Signed in</th>
              <th className="py-1 text-right font-medium">Sign-ups</th>
            </tr>
          </thead>
          <tbody>
            {[...perDay].reverse().map((d) => (
              <tr key={d.date} className="border-t border-line">
                <td className="py-1">{longDay(d.date)}</td>
                <td className="py-1 text-right">{nf.format(d.visits)}</td>
                <td className="py-1 text-right">{nf.format(d.signed_in)}</td>
                <td className="py-1 text-right">{nf.format(d.sign_ups)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

/** A ranked list: the name, its count, and a quiet bar for its share of the top one. */
function Ranked({ title, note, rows, empty = "Nothing yet.", mono = false }: { title: string; note?: string; rows: Array<{ name: string; n: number }>; empty?: string; mono?: boolean }) {
  const top = Math.max(1, ...rows.map((r) => r.n));
  const shown = rows.slice(0, 8);
  return (
    <section aria-label={title} className="card grid content-start gap-3 p-4 sm:p-5">
      <div>
        <h2 className="text-[1rem] font-semibold">{title}</h2>
        {note && <p className="text-[0.8rem] text-ink-3">{note}</p>}
      </div>
      {shown.length === 0 ? (
        <p className="text-[0.9rem] text-ink-3">{empty}</p>
      ) : (
        <ol className="grid gap-2">
          {shown.map((r) => (
            <li key={r.name} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-3 text-[0.9rem]">
                <span className={`min-w-0 break-words ${mono ? "font-mono text-[0.82rem]" : ""}`}>{r.name}</span>
                <span className="flex-none font-medium tabular-nums">{nf.format(r.n)}</span>
              </div>
              <div className="traffic-rank" aria-hidden="true">
                <div style={{ width: `${(r.n / top) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
