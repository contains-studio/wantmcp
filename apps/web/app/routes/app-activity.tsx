/**
 * /app/activity: everything that happened on the person's lists, newest first (GET /me/activity): finds, prices,
 * questions and answers, comments, what was added, bought or done, their own actions included. One plain sentence a
 * row; a burst of the same thing from one actor on one list folds into one row, so twenty finds never bury a question.
 * Filter by list with one row of chips.
 */
import { afterChange } from "~/lib/prg.server";
import { orFallback, orUnavailable } from "~/lib/degrade.server";
import { data, Link } from "react-router";
import type { Route } from "./+types/app-activity";
import { ActorTag } from "~/components/ActorTag";
import { LiveUpdates } from "~/components/LiveUpdates";
import { Time } from "~/components/Time";
import { api } from "~/lib/api.server";
import { loadCards } from "~/lib/app-home.server";
import { requireUser } from "~/lib/auth.server";
import { formatMoney } from "~/lib/format";
import { handleWriterIntent } from "~/lib/intents.server";
import { FORMATS } from "~/lib/formats";
import type { ActivityEvent, ListFormat, ListSummary, Page } from "~/lib/types";
import { ViewSwitch } from "./app";

export function meta() {
  return [{ title: "Activity · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const listId = url.searchParams.get("list") || null;
  const cursor = url.searchParams.get("cursor");
  const [lists, feedResult] = await Promise.all([
    api<ListSummary[]>(request, "/me/lists"),
    orUnavailable(api<Page<ActivityEvent>>(request, "/me/activity", { query: { list_id: listId, cursor, limit: 60 } }), "/app/activity"),
  ]);
  const feed: Page<ActivityEvent> = feedResult.value ?? { data: [], next_cursor: null };
  const feedUnavailable = feedResult.unavailable;
  const chips = [...lists].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((l) => ({ id: l.id, title: l.title }));
  // Each list's own words for a burst ("12 products", "3 questions").
  const formats = Object.fromEntries(lists.map((l) => [l.id, l.format ?? "shopping"])) as Record<string, ListFormat>;
  // What agents say they are doing now (status_note), on the first page only.
  const working = cursor
    ? []
    : (await orFallback(loadCards(request, []), [], "/app/activity"))
        .filter((c) => c.note && (!listId || c.id === listId))
        .map((c) => ({ listId: c.id, listTitle: c.title, ...c.note! }))
        .sort((a, b) => b.at.localeCompare(a.at));
  return data({ chips, formats, listId, cursor, feed, working, feedUnavailable }, { headers: { "Cache-Control": "private, no-store" } });
}

async function act({ request }: Route.ActionArgs) {
  return handleWriterIntent(request, await request.formData());
}

export default function Activity({ loaderData }: Route.ComponentProps) {
  const { chips, formats, listId, cursor, feed, working, feedUnavailable } = loaderData;
  const q = (id: string | null, c?: string | null) => {
    const p = new URLSearchParams();
    if (id) p.set("list", id);
    if (c) p.set("cursor", c);
    const s = p.toString();
    return `/app/activity${s ? `?${s}` : ""}`;
  };
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[47.5rem] gap-6 px-4 pt-8 pb-16 sm:pt-10">
        <header className="grid gap-5">
          <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.4rem]">Activity</h1>
          <ViewSwitch current="activity" />
          {/* Says what it holds (review C1). */}
          <p className="text-[0.92rem] text-ink-2">Everything on your lists, newest first: what was found, questions and answers, comments, and what was bought or done.</p>
        </header>
        <LiveUpdates query="scope=me" />

        {chips.length > 1 && (
          <nav aria-label="Show activity for" className="flex flex-wrap gap-2">
            <Link to={q(null)} aria-current={!listId ? "page" : undefined} className={`chip-link ${!listId ? "is-on" : ""}`}>
              All lists
            </Link>
            {chips.map((c) => (
              <Link key={c.id} to={q(c.id)} aria-current={listId === c.id ? "page" : undefined} className={`chip-link ${listId === c.id ? "is-on" : ""}`}>
                {c.title}
              </Link>
            ))}
          </nav>
        )}

        {working.length > 0 && (
          <section aria-labelledby="working-h" className="grid gap-2">
            <h2 id="working-h" className="text-[0.95rem] font-semibold text-ink-2">
              Working now
            </h2>
            <ul className="card grid divide-y divide-line p-0">
              {working.map((w) => (
                <li key={w.anchor} className="px-5 py-4">
                  <p className="leading-snug">
                    <ActorTag actor={w.actor} compact /> <span className="text-ink-2">on</span>{" "}
                    <Link to={`/l/${w.listId}#${w.anchor}`} className="link font-medium">
                      {w.item}
                    </Link>
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-ink-2">“{w.text}”</p>
                  <p className="mt-0.5 text-[0.85rem] text-ink-3">
                    {w.listTitle} · {w.timed ? "" : "in progress since "}
                    <Time ts={w.at} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {feedUnavailable ? (
          <p role="alert" className="card px-5 py-4 text-[0.95rem]">
            We couldn't load the activity just now.{" "}
            <a href="/app/activity" className="link">
              Try again
            </a>
            . Reference: <code className="font-semibold">{feedUnavailable}</code>
          </p>
        ) : feed.data.length === 0 ? (
          <div className="card grid justify-items-start gap-3 p-6">
            <p className="font-semibold">Nothing has happened yet</p>
            <p className="text-ink-2">When an agent finds something, asks you a question or posts an update, it shows here.</p>
            <Link to={listId ? `/connect?list=${listId}` : "/connect"} className="btn btn-sm">
              Connect an agent
            </Link>
          </div>
        ) : (
          <ol className="card grid divide-y divide-line p-0">
            {groupEvents(feed.data).map((g) => (
              <ActivityRow key={g[0].id} group={g} format={formats[g[0].list.id] ?? "shopping"} />
            ))}
          </ol>
        )}

        {(cursor || feed.next_cursor) && (
          <div className="flex gap-3">
            {cursor && (
              <Link to={q(listId)} className="btn btn-sm">
                Newest
              </Link>
            )}
            {feed.next_cursor && (
              <Link to={q(listId, feed.next_cursor)} className="btn btn-sm">
                Older
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Kinds that come in bursts from one agent run: a run of them by one actor on one list is one row. */
const BURSTY = new Set<ActivityEvent["type"]>(["entry.listed", "entry.suggested", "price.posted", "item.created"]);
const BURST_WINDOW = 3 * 3600_000;

/** Newest first, consecutive same-kind events by one actor on one list within a few hours fold together. */
export function groupEvents(events: ActivityEvent[]): ActivityEvent[][] {
  const out: ActivityEvent[][] = [];
  for (const e of events) {
    const g = out.at(-1);
    const head = g?.[0];
    if (
      g &&
      head &&
      BURSTY.has(e.type) &&
      e.type === head.type &&
      e.list.id === head.list.id &&
      e.actor.kind === head.actor.kind &&
      e.actor.name === head.actor.name &&
      Date.parse(head.at) - Date.parse(e.at) < BURST_WINDOW
    )
      g.push(e);
    else out.push([e]);
  }
  return out;
}

const money = (p: ActivityEvent["text"]["price"]) => (p ? formatMoney(p.amount, p.currency) : null);

/** Who, in the sentence: "You", or the agent's or person's name. */
function Who({ e }: { e: ActivityEvent }) {
  if (e.by === "you") return <span className="font-semibold">You</span>;
  return (
    <span className="font-semibold">
      {e.actor.name}
      {e.by === "your_agent" && <span className="sr-only">, your agent</span>}
    </span>
  );
}

/** At most `max` characters, cut at a word: item texts can be paragraphs. */
const cut = (t: string, max = 70) => {
  if (t.length <= max) return t;
  const c = t.slice(0, max);
  const at = c.lastIndexOf(" ");
  return `${(at > max / 2 ? c.slice(0, at) : c).replace(/[\s,;:.…-]+$/, "")}…`;
};
const quote = (t: string | undefined, max = 200) => (t ? `“${cut(t, max)}”` : "");

/** One event as a plain sentence after its actor. */
function sentence(e: ActivityEvent): React.ReactNode {
  const t = e.text;
  const item = e.item?.text;
  switch (e.type) {
    case "entry.listed": {
      if (t.accepted) return <>accepted the suggestion {quote(t.entry_title)}</>;
      const p = money(t.price);
      return p ? (
        <>
          found {t.entry_title} for <strong className="font-semibold tabular-nums">{p}</strong>
        </>
      ) : (
        <>posted {quote(t.entry_title)}</>
      );
    }
    case "entry.suggested":
      return e.actor.kind === "outsider" ? <>suggested {quote(t.entry_title)}</> : <>suggested {quote(t.entry_title)} from outside</>;
    case "price.posted":
      return (
        <>
          checked {t.entry_title}: <strong className="font-semibold tabular-nums">{money(t.price)}</strong>
        </>
      );
    case "comment.created":
      return <>commented: {quote(t.comment)}</>;
    case "question.asked":
      return <>asked: {quote(t.question)}</>;
    case "question.answered":
      return (
        <>
          answered {quote(t.answer)}
          {t.question && <span className="text-ink-2"> to {quote(t.question, 90)}</span>}
        </>
      );
    case "item.created":
      return <>added {quote(item, 90)}</>;
    case "item.purchased": {
      const p = money(t.price);
      return (
        <>
          bought {quote(item)}
          {p && (
            <>
              {" "}
              for <strong className="font-semibold tabular-nums">{p}</strong>
            </>
          )}
        </>
      );
    }
    case "item.status_changed": {
      const what =
        t.status === "done" ? <>marked {quote(item)} done</> : t.status === "in_progress" ? <>started on {quote(item)}</> : t.status === "waiting_on_owner" ? <>is waiting on you about {quote(item)}</> : <>reopened {quote(item)}</>;
      return (
        <>
          {what}
          {t.status_note && <>: {quote(t.status_note)}</>}
        </>
      );
    }
    default:
      return <>changed {quote(item)}</>;
  }
}

/** A folded burst, in the list's own words: "found 12 products", "posted 3 updates", "added 5 questions". */
function burst(g: ActivityEvent[], format: ListFormat): React.ReactNode {
  const n = g.length;
  const fi = FORMATS[format];
  switch (g[0].type) {
    case "entry.listed":
      return <>{format === "shopping" ? "found" : format === "research" ? "answered with" : "posted"} {n} {fi.entries}</>;
    case "entry.suggested":
      return <>suggested {n} {fi.entries}</>;
    case "price.posted":
      return <>checked {n} prices</>;
    default:
      return <>added {n} {fi.items}</>;
  }
}

/** One row: the sentence, then the want it's about (a link to it on the list), the list and when. */
function ActivityRow({ group, format }: { group: ActivityEvent[]; format: ListFormat }) {
  const e = group[0];
  const href = (x: ActivityEvent) => `/l/${x.list.id}${x.item ? `#${x.item.id}` : ""}`;
  if (group.length > 1) {
    return (
      <li className="px-5 py-4" data-type={e.type}>
        <p className="leading-snug">
          <Who e={e} /> {burst(group, format)} on{" "}
          <Link to={`/l/${e.list.id}`} className="link font-medium">
            {e.list.title}
          </Link>
        </p>
        <p className="mt-0.5 text-[0.85rem] text-ink-3">
          <Time ts={e.at} />
        </p>
        <details className="group mt-1">
          <summary className="textlink-btn text-[0.85rem]">
            Show all {group.length}
          </summary>
          <ul className="mt-2 grid gap-2 border-l border-line pl-3">
            {group.map((x) => (
              <li key={x.id} className="text-[0.92rem] leading-snug">
                {x.type === "item.created" && x.item ? (
                  <Link to={href(x)} className="link">
                    {cut(x.item.text, 90)}
                  </Link>
                ) : (
                  sentence(x)
                )}
                {x.item && x.type !== "item.created" && (
                  <>
                    {" "}
                    <span className="text-ink-3">·</span>{" "}
                    <Link to={href(x)} className="link text-ink-2">
                      {cut(x.item.text)}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      </li>
    );
  }
  return (
    <li className="px-5 py-4" data-type={e.type}>
      <p className="leading-snug break-words">
        <Who e={e} /> {sentence(e)}
      </p>
      <p className="mt-0.5 text-[0.85rem] text-ink-3">
        {e.item && (
          <>
            <Link to={href(e)} className="link text-ink-2">
              {e.type === "item.created" ? "Open it" : cut(e.item.text)}
            </Link>{" "}
            ·{" "}
          </>
        )}
        {e.list.title} · <Time ts={e.at} />
      </p>
    </li>
  );
}

/** Without JavaScript, a change that worked is answered with a redirect back here (prg.server.ts), never re-posted. */
export async function action(args: Route.ActionArgs) {
  return afterChange(args.request, await act(args));
}
