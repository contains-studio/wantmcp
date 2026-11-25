/**
 * /app/activity: everything agents posted across the person's lists, newest first (the feed the
 * spec requires), one or two lines a row. Filter by list with one row of chips.
 */
import { data, Link } from "react-router";
import type { Route } from "./+types/app-activity";
import { ActorTag } from "~/components/ActorTag";
import { CommentForm } from "~/components/Comments";
import { LiveUpdates } from "~/components/LiveUpdates";
import { ProductImage } from "~/components/ProductImage";
import { Time } from "~/components/Time";
import { api } from "~/lib/api.server";
import { listCards } from "~/lib/app-home.server";
import { requireUser } from "~/lib/auth.server";
import { formatMoney } from "~/lib/format";
import { handleWriterIntent } from "~/lib/intents.server";
import type { FeedEntry, ListSummary, Page } from "~/lib/types";
import { ViewSwitch } from "./app";

export function meta() {
  return [{ title: "Activity · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const listId = url.searchParams.get("list") || null;
  const cursor = url.searchParams.get("cursor");
  const [lists, feed] = await Promise.all([
    api<ListSummary[]>(request, "/me/lists"),
    api<Page<FeedEntry>>(request, "/me/feed", { query: { list_id: listId, cursor } }),
  ]);
  const chips = [...lists].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((l) => ({ id: l.id, title: l.title }));
  // What agents say they are doing now (status_note), on the first page only.
  const working = cursor
    ? []
    : (await listCards(request, listId ? lists.filter((l) => l.id === listId) : lists, []))
        .filter((c) => c.note)
        .map((c) => ({ listId: c.id, listTitle: c.title, ...c.note! }))
        .sort((a, b) => b.at.localeCompare(a.at));
  return data({ chips, listId, cursor, feed, working }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function action({ request }: Route.ActionArgs) {
  return handleWriterIntent(request, await request.formData());
}

export default function Activity({ loaderData }: Route.ComponentProps) {
  const { chips, listId, cursor, feed, working } = loaderData;
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
                    {w.listTitle} · in progress since <Time ts={w.at} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {feed.data.length === 0 ? (
          <div className="card grid justify-items-start gap-3 p-6">
            <p className="font-semibold">Nothing posted yet</p>
            <p className="text-ink-2">When an agent finds something or posts an update, it shows here.</p>
            <Link to={listId ? `/connect?list=${listId}` : "/connect"} className="btn btn-sm">
              Connect an agent
            </Link>
          </div>
        ) : (
          <ol className="card grid divide-y divide-line p-0">
            {feed.data.map((row) => (
              <ActivityRow key={row.entry.id} row={row} />
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

/** Who did what, the price when there is one, for which want, on which list, when. */
function ActivityRow({ row }: { row: FeedEntry }) {
  const { entry: e, item, list } = row;
  const href = `/l/${list.id}#${e.id}`;
  const suggested = e.status === "suggested";
  const kind = e.kind ?? "product";
  const verb = suggested ? "suggested" : kind === "product" ? "found" : kind === "answer" ? "answered" : "posted";
  // Outside suggestions are untrusted text: no image, no link to their URL, reviewed on the list.
  const image = !suggested && kind === "product" && e.image_url;
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-4">
      <div className="min-w-0">
        <p className="leading-snug">
          <ActorTag actor={e.author} compact /> <span className="text-ink-2">{verb}</span>{" "}
          <Link to={suggested ? `/l/${list.id}#sugg-h` : href} className="link font-medium">
            {e.title}
          </Link>
          {e.current_price && (
            <>
              {" "}
              <span className="text-ink-2">for</span>{" "}
              <strong className="font-semibold tabular-nums">{formatMoney(e.current_price.price, e.current_price.currency)}</strong>
            </>
          )}
          {suggested && <span className="chip chip-warn ml-2">Outside suggestion</span>}
        </p>
        <p className="mt-0.5 text-[0.85rem] text-ink-3">
          {item.text} · {list.title} · <Time ts={e.created_at} />
          {item.purchase && <span className="chip chip-live ml-2">Bought</span>}
        </p>
        {!suggested && (
          <details className="group mt-1">
            <summary className="add-link text-[0.85rem]">
              Comment<span className="sr-only"> on {e.title}</span>
            </summary>
            <div className="mt-2">
              <CommentForm targetType="entry" targetId={e.id} label={`Comment on ${e.title}`} />
            </div>
          </details>
        )}
      </div>
      {image && (
        <Link to={href} tabIndex={-1} aria-hidden="true" className="row-span-2 block w-16 sm:w-20">
          <ProductImage src={e.image_url} alt="" />
        </Link>
      )}
    </li>
  );
}
