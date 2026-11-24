import { useEffect, useRef, useState } from "react";
import { useFetchers, useNavigation, useRevalidator } from "react-router";

const INTERVAL = 15_000;

type LiveResult = { next?: number; changed?: boolean; disabled?: boolean; error?: string };

/**
 * Polls /live every 15 seconds while the tab is visible and revalidates the page's data
 * when something new happened. Shows a small "Updated" cue for changes made elsewhere.
 */
export function LiveUpdates({ query }: { query: string }) {
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const [cue, setCue] = useState(false);
  const cursor = useRef<number | null>(null);
  const lastLocalWrite = useRef(0);
  const busy = navigation.state !== "idle" || fetchers.some((f) => f.state !== "idle");

  // Our own submissions also produce events; don't announce those as news.
  useEffect(() => {
    if (busy) lastLocalWrite.current = Date.now();
  }, [busy]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    cursor.current = null;

    async function poll() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const after = cursor.current === null ? "" : `&after=${cursor.current}`;
        const res = await fetch(`/live?${query}${after}`, { headers: { accept: "application/json" } });
        const body = (await res.json()) as LiveResult;
        if (body.disabled) {
          stopped = true;
          return;
        }
        if (typeof body.next === "number") {
          const first = cursor.current === null;
          cursor.current = body.next;
          if (!first && body.changed) {
            revalidator.revalidate();
            if (Date.now() - lastLocalWrite.current > 10_000) {
              setCue(true);
              setTimeout(() => setCue(false), 4000);
            }
          }
        }
      } catch {
        // Offline or a blip: try again next tick.
      }
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === "visible") timer = setTimeout(poll, INTERVAL);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        // Catch up straight away when the tab comes back.
        clearTimeout(timer);
        poll();
      } else {
        clearTimeout(timer);
      }
    }

    poll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // revalidator identity changes every render; the effect only depends on the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      {cue && (
        <p className="live-cue flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper shadow-lg">
          <span className="tag-dot" aria-hidden="true" /> Updated with new activity
        </p>
      )}
    </div>
  );
}
