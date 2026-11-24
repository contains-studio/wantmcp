import { data } from "react-router";
import type { Route } from "./+types/live";
import { api, ApiError } from "~/lib/api.server";
import { getSessionToken } from "~/lib/session.server";
import type { WantEvent } from "~/lib/types";

type EventsPage = { events: WantEvent[]; next: number };

/**
 * Change feed for live updates, polled by the browser. Proxies the API's events log so the
 * session token stays server-side.
 *
 *   GET /live?list=<id>&after=<seq>   public events on a list (plus writer events if signed in)
 *   GET /live?scope=me&after=<seq>    events across the signed-in user's lists
 *
 * Without `after`, returns the current head cursor and `changed: false`.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const listId = url.searchParams.get("list");
  const me = url.searchParams.get("scope") === "me";
  if (!listId && !me) return data({ error: "list or scope=me required" }, 400);
  if (me && !getSessionToken(request)) return data({ disabled: true }, { headers: noStore });
  const path = me ? "/me/events" : `/lists/${encodeURIComponent(listId!)}/events`;
  const afterParam = url.searchParams.get("after");

  try {
    if (afterParam === null) {
      // Walk to the head of the log once, so later polls only see new events.
      let after = 0;
      for (let i = 0; i < 50; i++) {
        const page = await api<EventsPage>(request, path, { query: { after } });
        if (!page.events.length || page.next === after) break;
        after = page.next;
      }
      return data({ next: after, changed: false }, { headers: noStore });
    }
    const after = Math.max(0, parseInt(afterParam, 10) || 0);
    const page = await api<EventsPage>(request, path, { query: { after } });
    return data({ next: page.next ?? after, changed: page.events.length > 0, count: page.events.length }, { headers: noStore });
  } catch (err) {
    // An API without the events log, or a list that went away: stop polling quietly.
    if (err instanceof ApiError && (err.status === 404 || err.status === 401 || err.status === 403)) {
      return data({ disabled: true }, { headers: noStore });
    }
    if (err instanceof ApiError) return data({ error: err.message }, { status: 502, headers: noStore });
    throw err;
  }
}

const noStore = { "Cache-Control": "private, no-store" };
