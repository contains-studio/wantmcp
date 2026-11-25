import { redirect } from "react-router";
import type { Route } from "./+types/claim-resume";
import { getSessionToken, getClaimToken, clearClaimCookie } from "~/lib/session.server";
import { keep } from "~/lib/claims.server";

/**
 * Where sign-in lands after "Keep this list" (SPEC 13.4): claims the list whose token the claim page left in
 * a short-lived cookie, then goes to the list. Any failure goes back to the claim page, which explains it.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const token = getClaimToken(request);
  if (!token) throw redirect("/app");
  if (!getSessionToken(request)) throw redirect("/login?next=/claim");
  const clear = { "Set-Cookie": clearClaimCookie(request), "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const kept = await keep(request, token);
  if ("list" in kept) throw redirect(`/l/${kept.list.id}`, { headers: clear });
  throw redirect(`/claim/${encodeURIComponent(token)}`, { headers: clear });
}
