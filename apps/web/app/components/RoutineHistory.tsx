/**
 * A routine's History (SPEC 20.9, 20.14 item 5): a fold under its card. Opening it loads the newest ten runs (and the
 * server counts it as the person looking: a list view); "Show older" pages back by cursor. Each run in plain words:
 * when, scheduled or Run now (and by whom), how it went, wants searched, suggestions, searches used, and the server's
 * one-line note. Without JavaScript the fold links to the same runs as a page of its own.
 */
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Time } from "./Time";
import { runOutcome, runTrigger } from "~/lib/routines";
import type { Page, RoutineRun } from "~/lib/types";

export function RoutineHistory({
  routineId,
  name,
  kind,
  latest,
}: {
  routineId: string;
  name: string;
  /** Searching is exa_search's alone: other kinds' runs say their state and the server's note. */
  kind: string;
  /** The newest run's id: History reloads when it changes. */
  latest?: string | null;
}) {
  const first = useFetcher<Page<RoutineRun>>({ key: `history-${routineId}` });
  const more = useFetcher<Page<RoutineRun>>({ key: `history-more-${routineId}` });
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState<RoutineRun[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const href = `/app/routines/${encodeURIComponent(routineId)}/runs`;

  useEffect(() => {
    if (open && first.state === "idle" && !first.data) first.load(href);
  }, [open, first, href]);
  // A run just ended (the card's live line): the first rows are current without a reload.
  const [seen, setSeen] = useState(latest);
  useEffect(() => {
    if (latest === seen) return;
    setSeen(latest);
    if (open) first.load(href);
  }, [latest, seen, open, first, href]);
  useEffect(() => {
    if (first.data) {
      setRuns(first.data.data);
      setCursor(first.data.next_cursor);
    }
  }, [first.data]);
  useEffect(() => {
    if (more.data) {
      setRuns((r) => [...r, ...more.data!.data.filter((x) => !r.some((y) => y.id === x.id))]);
      setCursor(more.data.next_cursor);
    }
  }, [more.data]);

  return (
    <details className="rt-fold" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="textlink-btn text-[0.88rem]">
        History<span className="sr-only"> of {name}</span>
      </summary>
      <div className="rt-fold-body grid gap-2">
        {first.state !== "idle" && !first.data && <p className="text-[0.88rem] text-ink-3">Loading…</p>}
        {first.data && runs.length === 0 && <p className="text-[0.88rem] text-ink-3">It hasn't run yet.</p>}
        {runs.length > 0 && (
          <ol className="grid">
            {runs.map((r) => (
              <li key={r.id} className="grid gap-0.5 border-t border-line py-2 text-[0.88rem] first:border-t-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-ink">
                    <Time ts={r.finished_at ?? r.started_at ?? r.queued_at} />
                  </span>
                  {runTrigger(r) && <span className="text-ink-3">{runTrigger(r)}</span>}
                </p>
                <p className={r.state === "failed" || r.state === "blocked" ? "text-warn" : "text-ink-2"}>{runOutcome(r, true, kind)}</p>
                {r.note && <p className="text-ink-3">{r.note}</p>}
              </li>
            ))}
          </ol>
        )}
        {cursor && (
          <button type="button" className="textlink-btn w-fit text-[0.88rem]" disabled={more.state !== "idle"} onClick={() => more.load(`${href}?cursor=${encodeURIComponent(cursor)}`)}>
            {more.state !== "idle" ? "Loading…" : "Show older"}
          </button>
        )}
        <noscript>
          <a href={href} className="link text-[0.88rem]">
            See its runs
          </a>
        </noscript>
      </div>
    </details>
  );
}
