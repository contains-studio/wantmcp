/**
 * /app/notices/:id/open?to=<path> (SPEC 26.3): opening a notice's link marks it seen, then goes where it points. Only a
 * path on this site is followed (never another site: the address can't be used to send anyone elsewhere).
 */
import { redirect } from "react-router";
import type { Route } from "./+types/app-notice-open";
import { api } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { noticePath } from "~/lib/routines";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);
  await api(request, `/me/notices/${encodeURIComponent(params.id)}/seen`, { method: "POST" }).catch(() => null);
  throw redirect(noticePath(new URL(request.url).searchParams.get("to")));
}
