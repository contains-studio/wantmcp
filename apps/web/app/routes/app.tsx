/**
 * /app, home for signed-in people (docs/design-standards.md, "Home for signed-in people"): what
 * needs me (questions waiting), then how my lists are doing. One column, the same on every screen.
 * The cross-list feed lives at /app/activity; a new list is made at /app/new.
 */
import { MetaLine } from "~/components/MetaLine";
import { useEffect, useRef, useState } from "react";
import { data, Form, Link, redirect, useActionData, useFetcher, useNavigation } from "react-router";
import type { Route } from "./+types/app";
import { Icon, Menu, MenuRemove } from "~/components/Actions";
import { ActorTag } from "~/components/ActorTag";
import { CopyButton } from "~/components/CopyButton";
import { LiveUpdates } from "~/components/LiveUpdates";
import { Time } from "~/components/Time";
import type { IntentResult } from "~/components/WriteTools";
import { api, apiOptional, formError } from "~/lib/api.server";
import { listCards, orderCards, type ListCard } from "~/lib/app-home.server";
import { requireUser } from "~/lib/auth.server";
import { formatMoney, plural } from "~/lib/format";
import { FORMATS } from "~/lib/formats";
import { moneyPlaceholder, useCurrency } from "~/lib/hooks";
import { handleWriterIntent } from "~/lib/intents.server";
import { assertSameOrigin } from "~/lib/session.server";
import type { AgentInfo, ListSummary, PendingInvite } from "~/lib/types";
import { waitingQuestions, type WaitingQuestion } from "~/lib/waiting.server";

export function meta() {
  return [{ title: "Your lists · The Want MCP" }, { name: "robots", content: "noindex" }];
}

/** Questions shown before "Show all". */
const FIRST_QUESTIONS = 3;
/** Lists at which a filter field appears. */
const FILTER_FROM = 9;

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const [lists, invites, waiting, agents] = await Promise.all([
    api<ListSummary[]>(request, "/me/lists"),
    // Older API servers don't have pending invites yet: show none.
    apiOptional<PendingInvite[]>(request, "/me/invites").then((r) => r ?? []),
    // SPEC 12.1: every open question across the person's lists comes first on this page.
    waitingQuestions(request).catch(() => ({ questions: [] as WaitingQuestion[], count: 0 })),
    api<AgentInfo[]>(request, "/me/agents").catch(() => [] as AgentInfo[]),
  ]);
  const cards = orderCards(await listCards(request, lists, waiting.questions));
  const q = (url.searchParams.get("q") ?? "").trim();
  return data(
    {
      bio: user.bio ?? null,
      cards: q ? cards.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())) : cards,
      listCount: cards.length,
      q,
      invites,
      waiting: waiting.questions,
      waitingTotal: waiting.count,
      showAllQuestions: url.searchParams.get("questions") === "all",
      hasAgent: agents.length > 0,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  if (form.get("intent") === "accept-invite") {
    const id = String(form.get("list_id") ?? "");
    try {
      const list = await api<ListSummary>(request, `/me/invites/${encodeURIComponent(id)}/accept`, { method: "POST" });
      return redirect(`/l/${list.id}`);
    } catch (err) {
      return data({ ...formError(err), intent: "accept-invite" }, 400);
    }
  }
  if (form.get("intent") === "delete-list") {
    const id = String(form.get("list_id") ?? "");
    try {
      await api(request, `/lists/${encodeURIComponent(id)}`, { method: "DELETE" });
      return { ok: true, intent: "delete-list" };
    } catch (err) {
      return data({ ...formError(err), intent: "delete-list" }, 400);
    }
  }
  // Adding to a list and answering questions: the same intents as on the list page.
  return handleWriterIntent(request, form);
}

export default function AppHome({ loaderData }: Route.ComponentProps) {
  const { cards, listCount, q, invites, waiting, waitingTotal, showAllQuestions, hasAgent, bio } = loaderData;
  const firstRun = listCount === 0 || !hasAgent;
  // Answers are confirmed here: the answered card itself leaves the page once the question is gone.
  const [announce, setAnnounce] = useState("");
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[47.5rem] gap-8 px-4 pt-8 pb-16 sm:pt-10">
        <header className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.4rem]">Your lists</h1>
            <Link to="/app/new" className="btn btn-want">
              <Icon name="plus" />
              New list
            </Link>
          </div>
          <ViewSwitch current="lists" />
        </header>

        <LiveUpdates query="scope=me" />
        <p role="status" className={announce ? "card px-5 py-3 text-[0.95rem] text-deal" : "sr-only"}>
          {announce}
        </p>
        {invites.length > 0 && <PendingInvites invites={invites} />}
        {waiting.length > 0 && (
          <WaitingOnYou waiting={showAllQuestions ? waiting : waiting.slice(0, FIRST_QUESTIONS)} total={waitingTotal} onAnswered={setAnnounce} />
        )}
        {firstRun && (
          <FirstRun hasList={listCount > 0} hasItem={cards.some((c) => c.items > 0)} hasAgent={hasAgent} firstListId={cards[0]?.id ?? null} needsBio={!bio} />
        )}

        {listCount > 0 && (
          <section aria-labelledby="lists-h" className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="lists-h" className="text-[0.95rem] font-semibold text-ink-2">
                Lists
              </h2>
              {listCount >= FILTER_FROM && (
                <Form method="get" role="search" className="flex items-end gap-2">
                  <label className="field">
                    <span className="sr-only">Find a list</span>
                    <input name="q" defaultValue={q} placeholder="Find a list" className="input input-sm w-52" />
                  </label>
                </Form>
              )}
            </div>
            {cards.length === 0 ? (
              <p className="text-ink-2">No list matches “{q}”.</p>
            ) : (
              <ul className="grid gap-3">
                {cards.map((c) => (
                  <ListCardRow key={c.id} card={c} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** Lists | Activity: two real links, the current one marked. */
export function ViewSwitch({ current }: { current: "lists" | "activity" }) {
  const tab = (to: string, label: string, on: boolean) => (
    <Link to={to} aria-current={on ? "page" : undefined} className={`view-tab ${on ? "is-on" : ""}`}>
      {label}
    </Link>
  );
  return (
    <nav aria-label="View" className="view-switch">
      {tab("/app", "Lists", current === "lists")}
      {tab("/app/activity", "Activity", current === "activity")}
    </nav>
  );
}

/* ---------------------------------------------------------------- Waiting on you */

function WaitingOnYou({ waiting, total, onAnswered }: { waiting: WaitingQuestion[]; total: number; onAnswered: (message: string) => void }) {
  return (
    <section aria-labelledby="waiting-h" className="grid gap-3">
      <h2 id="waiting-h" className="flex items-center gap-2 text-[0.95rem] font-semibold text-ink-2">
        Waiting on you
        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[0.8rem] text-warn">
          {total}
          <span className="sr-only"> {total === 1 ? "question" : "questions"}</span>
        </span>
      </h2>
      <ul className="grid gap-3">
        {waiting.map((q) => (
          <QuestionCard key={q.id} q={q} onAnswered={onAnswered} />
        ))}
      </ul>
      {total > waiting.length && (
        <Link to="/app?questions=all" className="link w-fit text-[0.9rem]">
          Show all ({total})
        </Link>
      )}
    </section>
  );
}

/** One question: who asked about which want; the options answer in one tap. */
function QuestionCard({ q, onAnswered }: { q: WaitingQuestion; onAnswered: (message: string) => void }) {
  const fetcher = useFetcher<IntentResult>();
  const busy = fetcher.state !== "idle";
  const answered = fetcher.state === "idle" && fetcher.data?.ok;
  // The action's result arrives while the page revalidates, before this card leaves it.
  const ok = !!fetcher.data?.ok;
  useEffect(() => {
    if (ok) onAnswered(`Answered “${q.item.text}”. ${q.asked_by.kind === "agent" ? q.asked_by.name : "The agent"} can carry on.`);
  }, [ok]);
  const qid = `q-${q.id}`;
  if (answered) {
    return (
      <li role="status" className="card px-5 py-4 text-[0.95rem] text-deal">
        Answered. {q.asked_by.kind === "agent" ? q.asked_by.name : "The agent"} can carry on.
      </li>
    );
  }
  const hidden = (
    <>
      <input type="hidden" name="intent" value="answer-question" />
      <input type="hidden" name="question_id" value={q.id} />
    </>
  );
  return (
    <li className="card grid gap-3 p-5 sm:p-6">
      <MetaLine
        as="p"
        className="text-[0.85rem] text-ink-3"
        items={[
          <span key="a" className="inline-flex items-center gap-1.5">
            <ActorTag actor={q.asked_by} compact /> asked
          </span>,
          <Time key="t" ts={q.asked_at} />,
          <Link key="i" to={`/l/${q.list.id}#${q.item.id}`} className="link text-ink-2 whitespace-normal">
            {q.item.text}
          </Link>,
          q.list.title,
        ]}
      />
      <p id={qid} className="text-[1.15rem] leading-snug font-semibold whitespace-pre-line">
        {q.text}
      </p>
      {q.options.length > 0 ? (
        <>
          <div role="group" aria-labelledby={qid} className="flex flex-wrap gap-2">
            {q.options.map((o) => (
              <fetcher.Form method="post" key={o}>
                {hidden}
                <input type="hidden" name="text" value={o} />
                <button className="btn" disabled={busy}>
                  {o}
                </button>
              </fetcher.Form>
            ))}
          </div>
          <details className="group">
            <summary className="add-link">Something else…</summary>
            <AnswerField fetcher={fetcher} hidden={hidden} labelledBy={qid} busy={busy} />
          </details>
        </>
      ) : (
        <AnswerField fetcher={fetcher} hidden={hidden} labelledBy={qid} busy={busy} />
      )}
      {fetcher.data?.error && (
        <p className="form-error" role="alert">
          {fetcher.data.error}
        </p>
      )}
    </li>
  );
}

function AnswerField({
  fetcher,
  hidden,
  labelledBy,
  busy,
}: {
  fetcher: ReturnType<typeof useFetcher<IntentResult>>;
  hidden: React.ReactNode;
  labelledBy: string;
  busy: boolean;
}) {
  const id = `${labelledBy}-a`;
  return (
    <fetcher.Form method="post" className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
      {hidden}
      <label htmlFor={id} className="sr-only">
        Your answer
      </label>
      <textarea
        id={id}
        name="text"
        required
        maxLength={2000}
        rows={1}
        placeholder="Your answer"
        aria-describedby={labelledBy}
        className="textarea textarea-grow flex-1"
      />
      <button className="btn" disabled={busy}>
        {busy ? "Sending…" : "Answer"}
      </button>
    </fetcher.Form>
  );
}

/* ---------------------------------------------------------------- Lists */

function ListCardRow({ card: c }: { card: ListCard }) {
  const fi = FORMATS[c.format];
  const progress = c.items > 0 && c.done > 0 ? c.done / c.items : 0;
  return (
    <li className="card relative grid gap-3 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.2rem] leading-snug font-semibold tracking-[-0.01em]">
            {/* The title is the card's link; the controls beside it sit above the stretched area. */}
            <Link to={`/l/${c.id}`} className="stretched-link">
              {c.title}
            </Link>
          </h3>
          <MetaLine
            as="p"
            className="mt-1 text-[0.88rem] text-ink-3"
            items={[
              c.isPrivate && (
                <span className="inline-flex items-center gap-1 text-ink-2">
                  <LockGlyph /> Private
                </span>
              ),
              plural(c.items, fi.item),
              c.done > 0 && `${c.done} ${fi.done}`,
              c.role === "member" && `by ${c.ownerHandle}`,
              c.role === "owner" && c.access && c.access.people > 1 && `Shared with ${plural(c.access.people - 1, "person", "people")}`,
              c.waiting > 0 && (
                <span className="font-medium text-warn">
                  <span aria-hidden="true">● </span>
                  {c.waiting} waiting on you
                </span>
              ),
            ]}
          />
        </div>
        <div className="relative z-[2] flex flex-none items-center gap-1">
          <AddToList card={c} />
          <Menu label={`More for ${c.title}`}>
            <Link to={`/app/lists/${c.id}/settings`} className="menu-item">
              Settings<span className="sr-only"> for {c.title}</span>
            </Link>
            <CopyButton text={c.url} label="Share: copy link" ariaLabel={`Copy link to ${c.title}`} className="menu-item" />
            {c.role === "owner" && (
              <MenuRemove
                intent="delete-list"
                fields={{ list_id: c.id }}
                label="Delete list"
                confirmText={`Delete “${c.title}” and everything on it? This can't be undone.`}
              />
            )}
          </Menu>
        </div>
      </div>
      {progress > 0 && (
        <div
          className="h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
          role="img"
          aria-label={`${c.done} of ${c.items} ${fi.done}`}
        >
          <div className="h-full rounded-full bg-deal" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div className="border-t border-line pt-3 text-[0.92rem]">
        {/* What an agent says it is doing now beats what it posted last; the note has no time of its own. */}
        {c.note ? (
          <p className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1">
              <ActorTag actor={c.note.actor} compact /> <span className="text-ink-2">on {c.note.item}:</span> <span className="text-ink">“{c.note.text}”</span>
            </span>
          </p>
        ) : c.latest ? (
          <p className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1">
              <ActorTag actor={c.latest.actor} compact />{" "}
              <span className="text-ink-2">{c.latest.kind === "product" ? "found" : c.latest.kind === "answer" ? "answered" : "posted"}</span>{" "}
              <span className="text-ink">{c.latest.title}</span>
              {c.latest.price && (
                <>
                  {" "}
                  <span className="text-ink-2">for</span>{" "}
                  <strong className="font-semibold tabular-nums">{formatMoney(c.latest.price.price, c.latest.price.currency)}</strong>
                </>
              )}
            </span>
            <span className="flex-none text-[0.82rem] text-ink-3">
              <Time ts={c.latest.at} />
            </span>
          </p>
        ) : (
          <p className="text-ink-2">
            No agent has worked on this yet.{" "}
            <Link to={`/connect?list=${c.id}`} className="relative z-[2] link font-medium text-ink">
              Connect one<span className="sr-only"> to {c.title}</span>
            </Link>
          </p>
        )}
      </div>
    </li>
  );
}

/** "+ Add": one field, in this list's own words. No list dropdown anywhere. */
function AddToList({ card }: { card: ListCard }) {
  const fi = FORMATS[card.format];
  const currency = useCurrency();
  const fetcher = useFetcher<IntentResult & { itemId?: string }>();
  const ref = useRef<HTMLFormElement>(null);
  const done = fetcher.state === "idle" && fetcher.data?.ok;
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (done) {
      ref.current?.reset();
      setCount((n) => n + 1);
    }
  }, [done]);
  const inputId = `add-${card.id}`;
  return (
    <Menu
      label={`${fi.addItemTitle}: ${card.title}`}
      wide
      triggerClass="btn btn-sm"
      trigger={
        <>
          + Add<span className="sr-only"> to {card.title}</span>
        </>
      }
    >
      <fetcher.Form method="post" ref={ref} className="grid gap-2 p-3">
        <input type="hidden" name="intent" value="add-item" />
        <input type="hidden" name="list_id" value={card.id} />
        <label htmlFor={inputId} className="label">
          {fi.addItemTitle}
        </label>
        <input id={inputId} name="text" required maxLength={500} placeholder={moneyPlaceholder(fi.itemPlaceholder, currency)} className="input" />
        <div className="flex items-center gap-3">
          <button className="btn btn-want btn-sm" disabled={fetcher.state !== "idle"}>
            {fetcher.state !== "idle" ? "Adding…" : `Add ${fi.item}`}
          </button>
          <span aria-live="polite" className="text-[0.85rem] text-deal">
            {count > 0 && done ? `Added to ${card.title}.` : ""}
          </span>
        </div>
        {fetcher.data?.error && (
          <p className="form-error" role="alert">
            {fetcher.data.error}
          </p>
        )}
      </fetcher.Form>
    </Menu>
  );
}

const LockGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/* ---------------------------------------------------------------- First run and invites */

/** Until there is a list and an agent: the three steps, each a real action. */
function FirstRun({
  hasList,
  hasItem,
  hasAgent,
  firstListId,
  needsBio,
}: {
  hasList: boolean;
  hasItem: boolean;
  hasAgent: boolean;
  firstListId: string | null;
  needsBio: boolean;
}) {
  const steps = [
    {
      done: hasList,
      title: "Make a list",
      action: (
        <Link to="/app/new" className="btn btn-sm">
          New list
        </Link>
      ),
    },
    {
      done: hasItem,
      title: "Add what you want",
      action: hasList ? (
        <Link to={`/l/${firstListId}#add-item`} className="btn btn-sm">
          Add to your list
        </Link>
      ) : null,
    },
    {
      done: hasAgent,
      title: "Connect an agent",
      action: (
        <Link to={firstListId ? `/connect?list=${firstListId}` : "/connect"} className="btn btn-sm">
          Connect an agent
        </Link>
      ),
    },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <section aria-labelledby="start-h" className="card grid gap-4 p-5 sm:p-6">
      <h2 id="start-h" className="text-[1.2rem] font-semibold">
        Three steps to your first agent at work
      </h2>
      <ol className="grid gap-2">
        {steps.map((s, i) => (
          <li
            key={s.title}
            aria-current={i === next ? "step" : undefined}
            className={`flex flex-wrap items-center gap-3 rounded-[14px] px-4 py-3 ${i === next ? "bg-[color-mix(in_srgb,var(--ink)_7%,var(--card))]" : ""}`}
          >
            <span
              aria-hidden="true"
              className={`grid h-7 w-7 flex-none place-items-center rounded-full text-[0.85rem] font-semibold ${s.done ? "bg-deal-soft text-deal" : "bg-sunk text-ink-2"}`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span className={`min-w-0 flex-1 font-medium ${s.done ? "text-ink-3 line-through" : ""}`}>
              {s.title}
              {s.done && <span className="sr-only"> (done)</span>}
            </span>
            {!s.done && i === next && s.action}
          </li>
        ))}
      </ol>
      {needsBio && (
        <p className="text-[0.9rem] text-ink-2">
          <Link to="/app/account#bio" className="link">
            Tell your agents your sizes and country
          </Link>{" "}
          so they search the right stores.
        </p>
      )}
    </section>
  );
}

function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  const nav = useNavigation();
  const result = useActionData<typeof action>() as { error?: string; intent?: string } | undefined;
  return (
    <section aria-labelledby="invites-h" className="grid gap-3">
      <h2 id="invites-h" className="text-[0.95rem] font-semibold text-ink-2">
        {invites.length === 1 ? "You're invited to a list" : `You're invited to ${invites.length} lists`}
      </h2>
      <ul className="grid gap-3">
        {invites.map((inv) => (
          <li key={inv.list.id} className="card flex flex-wrap items-center gap-x-3 gap-y-2 p-5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{inv.list.title}</p>
              <p className="text-[0.85rem] text-ink-3">
                by {inv.list.owner_handle} · invited <Time ts={inv.invited_at} />
              </p>
            </div>
            <Form method="post">
              <input type="hidden" name="intent" value="accept-invite" />
              <input type="hidden" name="list_id" value={inv.list.id} />
              <button className="btn btn-sm" disabled={nav.state !== "idle"}>
                Accept<span className="sr-only"> invite to {inv.list.title}</span>
              </button>
            </Form>
          </li>
        ))}
      </ul>
      {result?.intent === "accept-invite" && result.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
    </section>
  );
}
