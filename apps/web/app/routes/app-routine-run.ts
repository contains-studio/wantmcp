/**
 * /app/routines/:id/runs/:runId (SPEC 20.14 item 10): one run, as JSON, for a card's live line to ask every 1.5
 * seconds while the run is queued or running. Same readers as History.
 */
import { data } from "react-router";
import type { Route } from "./+types/app-routine-run";
import { api, ApiError, toRouteError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { routinesOn } from "~/lib/routines";
import type { RoutineRun } from "~/lib/types";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  if (!routinesOn(user)) throw new Response("Not found", { status: 404 });
  try {
    const run = await api<RoutineRun>(request, `/routines/${encodeURIComponent(params.id)}/runs/${encodeURIComponent(params.runId)}`);
    return data(run, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    // Asked too often (120 a minute): not an error for the person. The line keeps what it shows and waits.
    if (err instanceof ApiError && err.status === 429) {
      const wait = Number((err.details as { retry_after?: number } | undefined)?.retry_after) || 5;
      return data({ throttled: true as const, retry_after: wait }, { headers: { "Cache-Control": "private, no-store" } });
    }
    toRouteError(err);
  }
}
