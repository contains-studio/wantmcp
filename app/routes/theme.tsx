import { data, redirect } from "react-router";
import type { Route } from "./+types/theme";
import { safeNext } from "~/lib/session.server";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const t = String(form.get("theme") ?? "system");
  const theme = t === "light" || t === "dark" ? t : "system";
  const cookie = `wm_theme=${theme}; Path=/; SameSite=Lax; Max-Age=31536000`;
  // Without JavaScript the form posts here directly; send the visitor back.
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    const ref = request.headers.get("referer");
    const back = ref ? safeNext(new URL(ref).pathname + new URL(ref).search, "/") : "/";
    return redirect(back, { headers: { "set-cookie": cookie } });
  }
  return data({ ok: true }, { headers: { "set-cookie": cookie } });
}

export function loader() {
  return redirect("/");
}
