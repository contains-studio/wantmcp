import { data, Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/invite";
import { ApiError, apiOptional } from "~/lib/api.server";
import { getUser } from "~/lib/auth.server";
import { assertSameOrigin } from "~/lib/session.server";
import { acceptInvite, lookupInvite } from "~/lib/tokens.server";
import type { InvitePreview, ListSummary } from "~/lib/types";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.invite ? `Join “${loaderData.invite.list.title}”` : "Accept invite";
  return [{ title: `${title} · The Want MCP` }, { name: "robots", content: "noindex" }, { name: "referrer", content: "no-referrer" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [user, invite] = await Promise.all([
    getUser(request),
    // null for an unknown token (or an API without the preview endpoint yet).
    lookupInvite(request, params.token),
  ]);
  // Already a writer of the list: nothing to accept.
  let alreadyMember = false;
  if (user && invite) {
    const list = await apiOptional<ListSummary>(request, `/lists/${encodeURIComponent(invite.list.id)}`);
    alreadyMember = Boolean(list?.my_role);
  }
  return data({ user, invite, alreadyMember }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  try {
    const list = await acceptInvite(request, params.token);
    return redirect(`/l/${list.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return redirect(`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`);
      const message =
        err.status === 404
          ? "This invite has expired or was cancelled. Ask the list owner for a new one."
          : err.code === "conflict"
            ? "Someone has already used this invite. Ask the list owner for a new one."
            : err.message;
      return data({ error: message }, err.status);
    }
    throw err;
  }
}

/** Who sent it, truthfully: an agent is named as one (SPEC 13.7). Older API builds don't say, so name the list's owner. */
function sentBy(invite: InvitePreview): string {
  const by = invite.invited_by;
  if (by?.kind === "agent") return `${by.name}, an AI agent, invited you`;
  if (by?.kind === "user") return `${by.handle} invited you`;
  return `A want list by ${invite.list.owner_handle}`;
}

export default function Invite({ loaderData, params }: Route.ComponentProps) {
  const { user, invite, alreadyMember } = loaderData;
  const result = useActionData<typeof action>();
  const nav = useNavigation();
  const listTitle = invite?.list.title;
  // Checked before anything else: an unknown, used or cancelled link never says "you're invited".
  const usable = !!invite && invite.status === "invited";

  if (!invite) {
    return (
      <div className="wrap grid place-items-center py-12">
        <div className="card grid w-full max-w-md justify-items-center gap-3 p-6 text-center sm:p-8">
          <h1 className="text-[1.6rem] leading-tight font-semibold">This invite link doesn't work</h1>
          <p className="text-ink-2">It may have expired, been cancelled or already used. Ask the person who sent it for a new one.</p>
          <Link to={user ? "/app/new" : "/login?next=/app/new"} className="btn btn-want mt-2">
            Start a list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap grid place-items-center py-12">
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        <p className="eyebrow">Invitation</p>
        <h1 className="serif mt-2 text-[2rem] leading-tight">Help with “{listTitle}”</h1>
        <p className="mt-2 text-[0.92rem] text-ink-3">{sentBy(invite)}</p>

        {alreadyMember ? (
          <div className="mt-6 grid gap-3">
            <p className="text-ink-2">You can already write to this list.</p>
            <Link to={`/l/${invite.list.id}`} className="btn btn-want">
              Open the list
            </Link>
          </div>
        ) : !usable ? (
          <div className="mt-6 grid gap-3">
            <p className="form-error">
              {invite?.status === "revoked"
                ? "This invite was cancelled. Ask the list owner for a new one."
                : "This invite has already been used. Ask the list owner for a new one."}
            </p>
            <Link to={user ? "/app/new" : "/login?next=/app/new"} className="btn btn-want">
              Start a list
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-ink-2">Accept to add items, comment, review suggestions and connect your own agents to the list.</p>
            {result?.error && (
              <p className="form-error mt-4" role="alert">
                {result.error}
              </p>
            )}
            {user ? (
              <Form method="post" className="mt-6 grid gap-2">
                <button className="btn btn-want" disabled={nav.state !== "idle"}>
                  {nav.state !== "idle" ? "Joining…" : `Accept as ${user.handle}`}
                </button>
                <p className="hint">
                  Not you? <Link to="/app/account" className="link">Switch account</Link>
                </p>
              </Form>
            ) : (
              <div className="mt-6 grid gap-2">
                <Link to={`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`} className="btn btn-want">
                  Sign in to accept
                </Link>
                <p className="hint">You’ll come straight back here after signing in.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
