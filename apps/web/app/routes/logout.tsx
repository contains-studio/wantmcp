import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { api } from "~/lib/api.server";
import { assertSameOrigin, clearSessionCookie, getSessionToken } from "~/lib/session.server";

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  if (getSessionToken(request)) {
    await api(request, "/auth/logout", { method: "POST" }).catch(() => undefined);
  }
  return redirect("/", { headers: { "set-cookie": clearSessionCookie(request) } });
}

export function loader() {
  return redirect("/app/account");
}
