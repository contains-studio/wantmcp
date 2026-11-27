/**
 * A routine's run, live (SPEC 20.14 item 10; owner, 27 Nov 2026: "i want live status instead of Running now"). It
 * replaces the card's status line while a run is queued or running, and after Run now:
 *   "Waiting to start…" → "Searching 2 of 3: “Noise-cancelling headphones…”" → "Done: searched 3 wants, 9 suggestions"
 * with a link to the suggestions. It asks for the run every 1.5 seconds while it is queued or running, stops when it
 * ends, after 2 minutes ("Still running. See History.") and while the tab is hidden.
 *
 * A real run takes about 5 seconds, so each state stays at least 600 ms, and a state older than the one shown is
 * never shown. A polite live region; nothing spins or slides, the text simply changes. Without JavaScript: "Running
 * now." with "Check again", which reloads.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, useRevalidator } from "react-router";
import { runEnded, runOutcome } from "~/lib/routines";
import type { RoutineRun } from "~/lib/types";

const POLL_MS = 1500;
const HOLD_MS = 600;
const GIVE_UP_MS = 120_000;

/** How far along a run is: later states rank higher, so an older answer never replaces a newer one. */
function rank(r: RoutineRun | null): number {
  if (!r || r.state === "queued") return 0;
  if (r.state === "running") return 1 + r.wants_searched;
  return 10_000;
}

const short = (t: string) => (t.length > 48 ? `${t.slice(0, 46).trimEnd()}…` : t);

export function liveText(r: RoutineRun | null): string {
  if (!r || r.state === "queued") return "Waiting to start…";
  if (r.state === "running") {
    // Several wants are searched at once: the text is an example of what it is on, not "the" want.
    if (r.current && r.wants_total) return `Searching ${Math.min(r.wants_searched + 1, r.wants_total)} of ${r.wants_total} wants, including “${short(r.current.text)}”`;
    return "Searching…";
  }
  return runOutcome(r);
}

export function LiveRunLine({ routineId, listId, runId, initial }: { routineId: string; listId: string; runId: string; initial: RoutineRun | null }) {
  const poll = useFetcher<RoutineRun | { throttled: true; retry_after: number }>({ key: `live-${runId}` });
  const revalidator = useRevalidator();
  const [live, setLive] = useState(false);
  const [shown, setShown] = useState<RoutineRun | null>(initial);
  const [gaveUp, setGaveUp] = useState(false);
  const shownAt = useRef(Date.now());
  const pending = useRef<RoutineRun | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(Date.now());
  const waited = useRef(false);
  const ended = !!shown && runEnded(shown);
  const href = `/app/routines/${encodeURIComponent(routineId)}/runs/${encodeURIComponent(runId)}`;

  useEffect(() => setLive(true), []);

  // Show the newest answer, never an older state, each state for at least HOLD_MS.
  useEffect(() => {
    const next = poll.data;
    if (!next || !("id" in next) || next.id !== runId) return;
    pending.current = next;
    if (timer.current) return;
    const apply = () => {
      timer.current = null;
      const p = pending.current;
      if (!p) return;
      setShown((cur) => {
        if (rank(p) < rank(cur) || (cur && liveText(cur) === liveText(p) && cur.state === p.state)) return cur;
        shownAt.current = Date.now();
        return p;
      });
    };
    const wait = HOLD_MS - (Date.now() - shownAt.current);
    if (wait <= 0) apply();
    else timer.current = setTimeout(apply, wait);
  }, [poll.data, runId]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // Ask every POLL_MS while it is live, the tab is visible and it hasn't been 2 minutes.
  useEffect(() => {
    if (!live || ended || gaveUp) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (Date.now() - started.current > GIVE_UP_MS) return setGaveUp(true);
      // Told to wait (429): honour Retry-After, keep the last line showing.
      const d = poll.data;
      const wait = d && "throttled" in d && !waited.current ? d.retry_after * 1000 : 0;
      waited.current = wait > 0;
      if (!wait && document.visibilityState === "visible") poll.load(href);
      t = setTimeout(tick, wait || POLL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !t) tick();
      if (document.visibilityState === "hidden" && t) (clearTimeout(t), (t = null));
    };
    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (t) clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // poll.load is stable for this fetcher key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, ended, gaveUp, href]);

  // Ended: the card's History, status line and "n left today" (and a list page's suggestions) catch up.
  const told = useRef(false);
  useEffect(() => {
    if (ended && !told.current) {
      told.current = true;
      revalidator.revalidate();
    }
  }, [ended, revalidator]);

  if (!live) {
    return (
      <p className="text-[0.88rem] text-ink-2">
        Running now.{" "}
        <a href="" className="link">
          Check again
        </a>
      </p>
    );
  }
  const bad = shown && (shown.state === "failed" || shown.state === "blocked");
  return (
    <div className="grid gap-0.5" data-run-state={shown?.state ?? "queued"}>
      <p role="status" aria-live="polite" className={`text-[0.88rem] ${bad ? "text-warn" : ended ? "text-ink-2" : "font-medium text-ink"}`}>
        {gaveUp && !ended ? (
          <>
            Still running.{" "}
            <Link to={`/app/routines/${encodeURIComponent(routineId)}/runs`} className="link">
              See History
            </Link>
            .
          </>
        ) : (
          liveText(shown)
        )}
      </p>
      {/* Its own line, so a wrapped line never starts with a dot. */}
      {ended && shown && shown.suggestions_posted > 0 && (
        <Link to={`/l/${encodeURIComponent(listId)}#sugg-h`} className="link w-fit text-[0.88rem]">
          See them on the list
        </Link>
      )}
      {ended && shown?.note && <p className="text-[0.85rem] text-ink-3">{shown.note}</p>}
    </div>
  );
}
