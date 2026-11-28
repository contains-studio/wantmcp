/**
 * /app/routines/:id/runs (SPEC 20.9): a routine's runs, newest first, ten at a time. History on a card loads it with
 * a fetcher; without JavaScript it is a page of its own. Reading it counts as the person looking (the server records a
 * list view for History).
 */
import { data, Link } from "react-router";
import type { Route } from "./+types/app-routine-runs";
import { api, toRouteError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { routinesOn, runOutcome, runTrigger } from "~/lib/routines";
import type { Page, Routine, RoutineRun } from "~/lib/types";
import { Time } from "~/components/Time";

export function meta() {
  return [{ title: "Routine history · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  if (!routinesOn(user)) throw new Response("Not found", { status: 404 });
  const cursor = new URL(request.url).searchParams.get("cursor");
  let page: Page<RoutineRun>;
  let mine: { data: Routine[] };
  try {
    // The routine's kind decides what a run says (searching is exa_search's alone); the server has no single-routine read.
    [page, mine] = await Promise.all([
      api<Page<RoutineRun>>(request, `/routines/${encodeURIComponent(params.id)}/runs`, { query: cursor ? { cursor } : {} }),
      api<{ data: Routine[] }>(request, "/me/routines"),
    ]);
  } catch (err) {
    toRouteError(err);
  }
  const routine = mine.data.find((r) => r.id === params.id);
  return data({ ...page, kind: routine?.kind ?? null, name: routine?.name ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}

export default function RoutineRuns({ loaderData, params }: Route.ComponentProps) {
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[47.5rem] gap-4 px-4 pt-8 pb-16 sm:pt-10">
        <Link to="/app/routines" className="link w-fit text-[0.9rem] text-ink-3">
          ← Routines
        </Link>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">History</h1>
        {loaderData.name && <p className="-mt-2 text-ink-2">{loaderData.name}</p>}
        <ol className="card grid gap-0 px-5 py-2">
          {loaderData.data.map((r) => (
            <li key={r.id} className="grid gap-0.5 border-t border-line py-3 text-[0.92rem] first:border-t-0">
              <p>
                <Time ts={r.finished_at ?? r.started_at ?? r.queued_at} />
                {runTrigger(r) && <> · {runTrigger(r)}</>}
              </p>
              <p className={r.state === "failed" || r.state === "blocked" ? "text-warn" : "text-ink-2"}>{runOutcome(r, true, loaderData.kind ?? "")}</p>
              {r.note && <p className="text-ink-3">{r.note}</p>}
            </li>
          ))}
          {loaderData.data.length === 0 && <li className="py-3 text-ink-3">It hasn't run yet.</li>}
        </ol>
        {loaderData.next_cursor && (
          <Link to={`/app/routines/${encodeURIComponent(params.id)}/runs?cursor=${encodeURIComponent(loaderData.next_cursor)}`} className="link w-fit">
            Show older
          </Link>
        )}
      </div>
    </div>
  );
}
