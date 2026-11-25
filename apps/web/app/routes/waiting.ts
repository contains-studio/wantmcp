import { data } from "react-router";
import type { Route } from "./+types/waiting";
import { getSessionToken } from "~/lib/session.server";
import { waitingQuestions } from "~/lib/waiting.server";

/** How many questions wait on the signed-in person, for the count in the navigation. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!getSessionToken(request)) return data({ count: 0 }, { headers });
  const waiting = await waitingQuestions(request).catch(() => []);
  return data({ count: waiting.length }, { headers });
}
