import { useEffect, useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { ExtLink } from "~/components/ExtLink";
import { ProductImage } from "~/components/ProductImage";
import { formatMoney, timeAgo } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import type { ClaimEntry, ClaimItem, ListFormat } from "~/lib/types";
import { orUnavailable } from "~/lib/degrade.server";
import { Unavailable } from "~/components/Unavailable";
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
  const [user, looked] = await Promise.all([getUser(request), orUnavailable(lookupClaim(request, params.token), "/claim/:token")]);
  const claim = looked.value;
  if (looked.unavailable) return data({ user, claim: null, now: Date.now(), unavailable: looked.unavailable }, { headers: PRIVATE_HEADERS });
  // A used link reopened by the person who used it: claiming is idempotent for them, so take them to the list.
  if (!claim && user) {
    const kept = await keep(request, params.token);
    if ("list" in kept) throw redirect(`/l/${kept.list.id}`, { headers: PRIVATE_HEADERS });
  }
  return data({ user, claim, now: Date.now(), unavailable: null as string | null }, { headers: PRIVATE_HEADERS });
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
  const { user, claim, now, unavailable } = loaderData;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  if (unavailable) return <Unavailable reference={unavailable} what="this link" />;
  if (!claim || actionData?.error) {
    return <LinkGone signedIn={!!user} message={actionData?.error} />;
  }

  const fi = FORMATS[claim.list.format] ?? FORMATS.shopping;
  const items = claim.items ?? [];
  const total = claim.list.counts.items;
  // "7 wants · 3 found": the work, once (SPEC 15.3). Older API builds without per-item detail show the count alone.
  const found =
    claim.list.format === "shopping"
      ? (claim.list.counts.items_with_entries ?? (items.some((i) => i.entry_count !== undefined) ? items.filter((i) => (i.entry_count ?? 0) > 0).length : null))
      : items.some((i) => i.status) && total <= items.length ? items.filter((i) => i.status === "done").length : null;
  const statusLine = [
    `${total} ${total === 1 ? fi.item : fi.items}`,
    found !== null ? `${found} ${claim.list.format === "shopping" ? "found" : claim.list.format === "tasks" ? "done" : "answered"}` : null,
  ].filter(Boolean);
  // Never the placeholder account's handle: an unclaimed list is named by its agent.
  const who = claim.agent_name || claim.from?.handle || "Someone";
  const ownLink = claim.kind === "handover" && !!user && user.handle === claim.from?.handle;

  return (
    <div className="wrap grid max-w-2xl gap-5 pt-6 sm:py-10">
      {/* No bottom padding on a phone: the Keep bar is the page's last thing, with nothing empty under it (SPEC 17.1). */}
      <header className="grid gap-1">
        <p className="text-[0.95rem] text-ink-2">
          {ownLink
            ? "Your hand-over link"
            : claim.kind === "unclaimed"
              ? `${who} started a list for you`
              : claim.agent_name && claim.from
                ? `${claim.agent_name} made this list for you, from @${claim.from.handle}`
                : `@${claim.from?.handle ?? who} made this list for you`}
        </p>
        <h1 className="serif text-[1.75rem] leading-tight break-words sm:text-[2.1rem]">{claim.list.title}</h1>
        <p className="flex flex-wrap items-center gap-x-2 text-[0.9rem] text-ink-3">
          {/* Lists agents start are always private; a hand-over keeps whatever its owner chose. */}
          {claim.kind === "unclaimed" && (
            <>
              <PrivateBadge bare />
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>{statusLine.join(" · ")}</span>
        </p>
      </header>

      {/* What the agent did is the reason to keep the list: every want, with what was found under it. */}
      {items.length > 0 && (
        <ol aria-label="What's on it" className="card grid divide-y divide-line p-0">
          {items.map((it, i) => (
            <ClaimItemRow
              key={i}
              item={it}
              format={claim.list.format}
              who={who}
              question={claim.open_questions.find((q) => q.item.text === it.text) ?? null}
            />
          ))}
          {total > items.length && <li className="px-4 py-3 text-[0.9rem] text-ink-3">and {total - items.length} more</li>}
        </ol>
      )}

      {/* SPEC 17.1: a question sits under its own want (above). One whose want is past the first 20 still shows here. */}
      {claim.open_questions.filter((q) => !items.some((it) => it.text === q.item.text)).map((q) => (
        <section key={q.id} aria-label={`A question about ${q.item.text}`} className="card grid gap-2 p-4">
          <p className="text-[0.85rem] text-ink-3">On “{q.item.text}”</p>
          <ClaimQuestion question={q} who={who} />
        </section>
      ))}

      {ownLink ? (
        <p className="text-ink-2">
          Send it to the person who should own this list. When they keep it, it becomes theirs and you stay on it as a member. <Deadline expiresAt={claim.expires_at} now={now} kind="handover" />
        </p>
      ) : (
        // One primary action. On a phone it stays in reach at the bottom of the screen however long the list is;
        // on wider screens it follows the list.
        <div className="claim-actions">
          <Form method="post" className="mx-auto grid w-full max-w-2xl gap-1.5">
            <button className="btn btn-want w-full sm:w-fit" disabled={busy}>
              {busy ? "Keeping…" : "Keep this list"}
            </button>
            <p className="text-[0.85rem] text-ink-3">
              {/* One thought per line: who keeps it, then what happens otherwise. */}
              {user ? (
                <>
                  {claim.kind === "handover" ? "It becomes yours, as " : "You'll keep it as "}
                  {user.handle} (
                  <Link to="/app/account" className="link">
                    not you?
                  </Link>
                  ){claim.kind === "handover" ? "; they can keep working on it. " : ". "}
                </>
              ) : (
                <>
                  Confirm your email to keep it.{" "}
                  {claim.kind === "handover" && "Keep it and it becomes yours; they can keep working on it. "}
                </>
              )}
              <Deadline expiresAt={claim.expires_at} now={now} kind={claim.kind} />
            </p>
          </Form>
        </div>
      )}
    </div>
  );
}

/**
 * The facts about time, quietly, in the visitor's own clock ("deleted tomorrow at 9:14 AM unless you keep it"), from
 * expires_at. The server renders hours left; the browser swaps in its local day and time.
 */
function Deadline({ expiresAt, now, kind }: { expiresAt: string; now: number; kind: "unclaimed" | "handover" }) {
  const [when, setWhen] = useState<string | null>(null);
  useEffect(() => setWhen(localWhen(expiresAt)), [expiresAt]);
  const left = hoursLeft(expiresAt, now);
  if (kind === "handover") {
    // A hand-over link loses nothing when it lapses: mention it only when it is close.
    if (!(left > 0 && left < 24)) return null;
    return <>This link stops working {when ?? inHours(expiresAt, now)}.</>;
  }
  return <>Otherwise it's deleted {when ?? inHours(expiresAt, now)}.</>;
}

/** "today at 9:14 PM", "tomorrow at 9:14 AM", "on Friday at 9:14 AM", in the visitor's locale and time zone. */
function localWhen(iso: string): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(at) - day(new Date())) / 86_400_000);
  if (days <= 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  return `on ${at.toLocaleDateString(undefined, { weekday: "long" })} at ${time}`;
}

const TASK_STATUS: Record<string, string> = { open: "Open", in_progress: "In progress", waiting_on_owner: "Waiting on you", done: "Done" };

/** One want and what was found under it, in the list page's own product look (image, title, retailer, price). */
type OpenQuestion = { id: string; text: string; options: string[]; item: { id: string; text: string } };

/** The agent's question, with its choices, under its want (SPEC 17.1). Answering comes with keeping the list. */
function ClaimQuestion({ question: q, who }: { question: OpenQuestion; who: string }) {
  return (
    <div className="grid gap-1.5 rounded-[10px] bg-sunk px-3 py-2.5">
      <p className="text-[0.9rem]">
        <span className="font-medium text-warn">{who} asks: </span>
        {q.text}
      </p>
      {q.options.length > 0 && (
        <ul aria-label="Choices" className="flex flex-wrap gap-1.5">
          {q.options.map((o) => (
            <li key={o} className="chip">
              {o}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[0.8rem] text-ink-3">You can answer once the list is yours.</p>
    </div>
  );
}

function ClaimItemRow({ item, format, who, question }: { item: ClaimItem; format: ListFormat; who: string; question: OpenQuestion | null }) {
  const entries = item.entries ?? [];
  const more = (item.entry_count ?? entries.length) - entries.length;
  const detailed = item.status !== undefined || item.entries !== undefined;
  // The question is shown in full below, so the status line doesn't also say "A question for you".
  const asking = item.status === "waiting_on_owner" && !question;
  return (
    <li className="grid gap-2 px-4 py-3.5">
      <p className="font-semibold leading-snug break-words">{item.text}</p>
      {!detailed ? null : format === "shopping" ? (
        item.status === "done" ? (
          <p className="text-[0.9rem] text-deal">Bought</p>
        ) : entries.length > 0 ? (
          <>
            {asking && <p className="text-[0.88rem] font-medium text-warn">A question for you</p>}
          <ul className="grid gap-2">
            {entries.map((e, i) => (
              <ClaimProduct key={i} entry={e} />
            ))}
            {more > 0 && <li className="text-[0.85rem] text-ink-3">and {more} more</li>}
          </ul>
          </>
        ) : asking ? (
          <p className="text-[0.9rem] font-medium text-warn">A question for you</p>
        ) : item.note ? (
          // SPEC 17.1: why nothing was found, in the agent's own words.
          <p className="text-[0.9rem] text-ink-2">
            <span className="font-medium">{who}:</span> {item.note.text}
          </p>
        ) : question ? null : (
          <p className="text-[0.9rem] text-ink-3">Nothing found yet</p>
        )
      ) : format === "tasks" ? (
        <p className="text-[0.9rem] text-ink-2">
          <span className="font-medium">{TASK_STATUS[item.status ?? "open"] ?? item.status}</span>
          {item.summary && <> · “{item.summary}”</>}
        </p>
      ) : (
        <p className="text-[0.9rem] text-ink-2">
          {item.status === "done" && item.summary ? (
            <>Answer: {item.summary}</>
          ) : asking ? (
            <span className="font-medium text-warn">A question for you</span>
          ) : question ? null : (
            <span className="text-ink-3">Not answered yet</span>
          )}
        </p>
      )}
      {question && <ClaimQuestion question={question} who={who} />}
    </li>
  );
}

/** SPEC 17.1: how sure the price is, in words: checked on the store's page, or only seen in a search result. */
function trustLine(e: ClaimEntry, now: number): string | null {
  if (!e.price || e.verified === undefined) return null;
  const when = e.checked_at ? ` · ${timeAgo(e.checked_at, now)}` : "";
  if (e.verified) return `Checked on the store's page${when}`;
  const from = e.price_source === "aggregator" ? "From a price site" : e.price_source === "user" ? "Entered by hand" : e.price_source === "search" ? "From a search result" : "Where it was seen isn't recorded";
  return `${from}, not checked on the store's page${when}`;
}

function ClaimProduct({ entry: e }: { entry: ClaimEntry }) {
  const title = e.product_url ? (
    <ExtLink href={e.product_url} className="link font-medium">
      {e.title}
    </ExtLink>
  ) : (
    <span className="font-medium">{e.title}</span>
  );
  const was = e.price && e.original_price && Number(e.original_price) > Number(e.price) ? e.original_price : null;
  const trust = trustLine(e, useNow());
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-start gap-3">
      {/* A fixed frame, so nothing moves when the image arrives. */}
      <div className="w-14">
        <ProductImage src={e.image_url} alt="" />
      </div>
      <div className="min-w-0 text-[0.92rem] leading-snug">
        <span className="line-clamp-2">{title}</span>
        {e.retailer && <span className="block text-[0.82rem] text-ink-3">{e.retailer}</span>}
        {trust && <span className="block text-[0.78rem] text-ink-3">{trust}</span>}
      </div>
      <div className="text-right tabular-nums">
        {e.price ? <span className="price text-[1.1rem]">{formatMoney(e.price, e.currency ?? "USD")}</span> : <span className="text-ink-3">–</span>}
        {was && <span className="price-was block text-[0.8rem]">{formatMoney(was, e.currency ?? "USD")}</span>}
      </div>
    </li>
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
