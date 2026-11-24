import { data, Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/invite";
import { api, ApiError } from "~/lib/api.server";
import { getUser } from "~/lib/auth.server";
import { assertSameOrigin } from "~/lib/session.server";
import type { ListSummary } from "~/lib/types";

export function meta() {
  return [{ title: "Accept invite · The Want MCP" }, { name: "robots", content: "noindex" }, { name: "referrer", content: "no-referrer" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  return data({ user }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  try {
    const list = await api<ListSummary>(request, `/invites/${encodeURIComponent(params.token)}/accept`, { method: "POST" });
    return redirect(`/l/${list.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return redirect(`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`);
      return data({ error: err.status === 404 ? "This invite has expired or was cancelled. Ask the list owner for a new one." : err.message }, err.status);
    }
    throw err;
  }
}

export default function Invite({ loaderData, params }: Route.ComponentProps) {
  const { user } = loaderData;
  const result = useActionData<typeof action>();
  const nav = useNavigation();
  return (
    <div className="wrap grid min-h-[60dvh] place-items-center py-12">
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        <p className="eyebrow">Invitation</p>
        <h1 className="mt-2 text-3xl font-extrabold">You're invited to a want list</h1>
        <p className="mt-3 text-ink-2">
          Accept to add items, comment, review suggestions and connect your own agents to the list.
        </p>
        {result?.error && <p className="form-error mt-4" role="alert">{result.error}</p>}
        {user ? (
          <Form method="post" className="mt-6 grid gap-2">
            <button className="btn btn-want" disabled={nav.state !== "idle"}>
              {nav.state !== "idle" ? "Joining…" : `Accept as ${user.handle}`}
            </button>
            <p className="hint">Not you? <Link to="/app/account" className="link">Switch account</Link></p>
          </Form>
        ) : (
          <div className="mt-6 grid gap-2">
            <Link to={`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`} className="btn btn-want">
              Sign in to accept
            </Link>
            <p className="hint">You’ll come straight back here after signing in.</p>
          </div>
        )}
      </div>
    </div>
  );
}
