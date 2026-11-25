import { data, Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/claim";
import { keep, keepAndLand } from "~/lib/claims.server";
import { lookupClaim } from "~/lib/tokens.server";
import { getUser } from "~/lib/auth.server";
import { hoursLeft, inHours, UNCLAIMED_TTL_HOURS } from "~/lib/claims";
import { PrivateBadge } from "~/components/ListView";
import { FORMATS } from "~/lib/formats";
import { assertSameOrigin, claimCookie, getSessionToken } from "~/lib/session.server";

/**
 * A claim link (SPEC 13.4): a list an agent started for its person, or a list handed over to them.
 * The token is a secret: the page is never indexed, cached, counted by analytics or sent as a referrer,
 * and the token never goes into another URL (sign-in carries it in a short-lived cookie instead).
 */
export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.claim ? `Keep “${loaderData.claim.list.title}”` : "Link expired";
  return [{ title: `${title} · The Want MCP` }, { name: "robots", content: "noindex" }, { name: "referrer", content: "no-referrer" }];
}

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };

export function headers() {
  return PRIVATE_HEADERS;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [user, claim] = await Promise.all([
    getUser(request),
    lookupClaim(request, params.token),
  ]);
  // A used link reopened by the person who used it: claiming is idempotent for them, so take them to the list.
  if (!claim && user) {
    const kept = await keep(request, params.token);
    if ("list" in kept) throw redirect(`/l/${kept.list.id}`, { headers: PRIVATE_HEADERS });
  }
  return data({ user, claim, now: Date.now() }, { headers: PRIVATE_HEADERS });
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  if (!getSessionToken(request)) {
    // Sign in (or sign up) first; /claim finishes the job with the token from the cookie.
    throw redirect("/login?next=/claim", { headers: { "Set-Cookie": claimCookie(request, params.token), ...PRIVATE_HEADERS } });
  }
  const landed = await keepAndLand(request, params.token, PRIVATE_HEADERS);
  if (landed instanceof Response) throw landed;
  return data({ error: landed.error }, { status: 400, headers: PRIVATE_HEADERS });
}

export default function Claim({ loaderData, actionData }: Route.ComponentProps) {
  const { user, claim, now } = loaderData;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  if (!claim || actionData?.error) {
    return <LinkGone signedIn={!!user} message={actionData?.error} />;
  }

  const fi = FORMATS[claim.list.format] ?? FORMATS.shopping;
  const { items, entries, open_questions } = claim.list.counts;
  const counts = [
    `${items} ${items === 1 ? fi.item : fi.items}`,
    entries ? `${entries} ${entries === 1 ? fi.entry : fi.entries} found` : null,
    open_questions ? `${open_questions} ${open_questions === 1 ? "question" : "questions"} for you` : null,
  ].filter(Boolean);
  // Never the placeholder account's handle: an unclaimed list is named by its agent.
  const who = claim.agent_name || claim.from?.handle || "Someone";
  const ownLink = claim.kind === "handover" && !!user && user.handle === claim.from?.handle;
  const left = hoursLeft(claim.expires_at, now);

  return (
    <div className="wrap grid place-items-center py-10 sm:py-14">
      <div className="card grid w-full max-w-md gap-4 p-6 sm:p-8">
        <div className="grid gap-1">
          <p className="text-[0.95rem] text-ink-2">
            {ownLink ? "Your hand-over link" : claim.kind === "unclaimed" ? `${who} started a list for you` : `${who} made this list for you`}
          </p>
          <h1 className="serif text-[1.9rem] leading-tight break-words">{claim.list.title}</h1>
          <p className="flex flex-wrap items-center gap-x-2 text-[0.9rem] text-ink-3">
            {/* Lists agents start are always private; a hand-over keeps whatever its owner chose. */}
            {claim.kind === "unclaimed" && (
              <>
                <PrivateBadge bare />
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{counts.join(" · ")}</span>
          </p>
        </div>

        {claim.kind === "unclaimed" ? (
          <p className="text-[1.0625rem] font-semibold">Keep this list. It is deleted {inHours(claim.expires_at, now)} unless you do.</p>
        ) : ownLink ? null : (
          <p className="text-ink-2">
            Keep it and it becomes yours; they can keep working on it.
            {left > 0 && left < 24 && <> This link stops working {inHours(claim.expires_at, now)}.</>}
          </p>
        )}

        {claim.items && claim.items.length > 0 && (
          <ul aria-label={`What's on it`} className="grid gap-1.5 border-y border-line py-3 text-[0.95rem]">
            {claim.items.slice(0, 10).map((it, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="text-ink-3">
                  •
                </span>
                <span className="min-w-0 break-words">{it.text}</span>
              </li>
            ))}
            {items > 10 && <li className="text-ink-3">and {items - 10} more</li>}
          </ul>
        )}

        {claim.open_questions.length > 0 && (
          <section aria-labelledby="claim-q" className="grid gap-2 rounded-[14px] bg-sunk p-4">
            <h2 id="claim-q" className="text-[0.95rem] font-semibold">
              {claim.open_questions.length === 1 ? `${who} has a question for you` : `${who} has ${claim.open_questions.length} questions for you`}
            </h2>
            <ul className="grid gap-2">
              {claim.open_questions.slice(0, 3).map((q) => (
                <li key={q.id} className="grid gap-0.5">
                  <span>{q.text}</span>
                  <span className="text-[0.85rem] text-ink-3">On “{q.item.text}”</span>
                </li>
              ))}
            </ul>
            <p className="text-[0.85rem] text-ink-3">You can answer once the list is yours.</p>
          </section>
        )}

        {ownLink ? (
          <p className="text-ink-2">
            Send it to the person who should own this list. When they keep it, it becomes theirs and you stay on it as a member.
            {left > 0 && left < 24 && <> It stops working {inHours(claim.expires_at, now)}.</>}
          </p>
        ) : (
          <Form method="post" className="grid gap-2">
            <button className="btn btn-want" disabled={busy}>
              {busy ? "Keeping…" : "Keep this list"}
            </button>
            <p className="hint text-center">
              {user ? (
                <>
                  As {user.handle}. Not you?{" "}
                  <Link to="/app/account" className="link">
                    Switch account
                  </Link>
                </>
              ) : (
                "Confirm your email with a code. New here? That signs you up."
              )}
            </p>
          </Form>
        )}
      </div>
    </div>
  );
}

function LinkGone({ signedIn, message }: { signedIn: boolean; message?: string }) {
  return (
    <div className="wrap grid place-items-center py-12">
      <div className="card grid w-full max-w-md justify-items-center gap-3 p-6 text-center sm:p-8">
        <h1 className="text-[1.6rem] leading-tight font-semibold">This link doesn't work any more</h1>
        <p className="text-ink-2">
          {message ||
            `Someone may have kept the list already, or the link ran out. A list an agent starts is deleted if nobody keeps it within ${UNCLAIMED_TTL_HOURS} hours.`}
        </p>
        <Link to={signedIn ? "/app/new" : "/login?next=/app/new"} className="btn btn-want mt-2">
          Start a list
        </Link>
        {!signedIn && (
          <p className="hint">
            Kept it already?{" "}
            <Link to="/login" className="link">
              Sign in
            </Link>{" "}
            to find it.
          </p>
        )}
      </div>
    </div>
  );
}
