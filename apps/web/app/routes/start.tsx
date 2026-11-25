import { data, Form, Link, redirect } from "react-router";
import type { Route } from "./+types/start";
import { api } from "~/lib/api.server";
import { SEASON } from "~/lib/season";
import { assertSameOrigin, getSessionToken } from "~/lib/session.server";
import type { ListSummary } from "~/lib/types";
import { getThemeView, resolveLook } from "~/themes/catalogue.server";

/**
 * Start a gift list dressed for an occasion, from a seasonal tile. A POST creates it at once when
 * signed in; signed out, the person signs in and lands here to confirm with one tap (a GET never
 * creates anything).
 */
function occasionOf(value: string | null): string | null {
  return value && SEASON.occasions.includes(value) ? value : null;
}

export function loader({ request }: Route.LoaderArgs) {
  const occasion = occasionOf(new URL(request.url).searchParams.get("occasion"));
  if (!occasion) throw redirect("/");
  if (!getSessionToken(request)) throw redirect(`/login?next=${encodeURIComponent(`/start?occasion=${occasion}`)}`);
  const view = getThemeView(`sheet--${occasion}`, "shopping");
  return { occasion, title: SEASON.listTitle[occasion] ?? `${view.name} list`, look: view.name };
}

export function meta() {
  return [{ title: "Start a gift list · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const occasion = occasionOf(String(form.get("occasion") ?? ""));
  if (!occasion) throw redirect("/");
  if (!getSessionToken(request)) throw redirect(`/login?next=${encodeURIComponent(`/start?occasion=${occasion}`)}`);
  try {
    // Shopping lists follow the format's own default visibility (the API's): nothing is forced here.
    const list = await api<ListSummary>(request, "/lists", { method: "POST", body: { title: SEASON.listTitle[occasion], format: "shopping" } });
    await api(request, `/lists/${list.id}`, { method: "PATCH", body: { theme: resolveLook(`sheet--${occasion}`, "shopping").slug } }).catch(() => null);
    return redirect(`/l/${list.id}`);
  } catch {
    return data({ error: "That didn't work. Try again in a moment." }, 502);
  }
}

export default function Start({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <div className="wrap grid max-w-xl justify-items-start gap-4 py-16">
      <h1 className="display text-[2rem] sm:text-[2.4rem]">{loaderData.title}</h1>
      <p className="text-ink-2">A shopping list in the {loaderData.look} look. You can rename it and change the look later.</p>
      <Form method="post">
        <input type="hidden" name="occasion" value={loaderData.occasion} />
        <button className="btn btn-want">Start the list</button>
      </Form>
      {actionData && "error" in actionData && <p className="form-error">{actionData.error}</p>}
      <Link to="/" className="link text-[0.9rem] text-ink-3">
        Not now
      </Link>
    </div>
  );
}
