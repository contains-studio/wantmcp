import { data, Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import type { Route } from "./+types/app";
import { CommentForm } from "~/components/Comments";
import { MarkBought } from "~/components/EntryCard";
import { FeedCard } from "~/components/FeedCard";
import { Time } from "~/components/Time";
import { api, formError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { plural } from "~/lib/format";
import { handleWriterIntent } from "~/lib/intents.server";
import { assertSameOrigin } from "~/lib/session.server";
import type { FeedEntry, ListSummary, Page } from "~/lib/types";

export function meta() {
  return [{ title: "My lists · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const listId = url.searchParams.get("list") || null;
  const cursor = url.searchParams.get("cursor");
  const [lists, feed] = await Promise.all([
    api<ListSummary[]>(request, "/me/lists"),
    api<Page<FeedEntry>>(request, "/me/feed", { query: { list_id: listId, cursor } }),
  ]);
  return data({ user, lists, feed, listId, cursor }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  if (form.get("intent") === "create-list") {
    const title = String(form.get("title") ?? "").trim();
    if (!title) return data({ error: "Give the list a title" }, 400);
    try {
      const list = await api<ListSummary>(request, "/lists", {
        method: "POST",
        body: { title, description: String(form.get("description") ?? "").trim() || undefined },
      });
      return redirect(`/l/${list.id}`);
    } catch (err) {
      return data(formError(err), 400);
    }
  }
  return handleWriterIntent(request, form);
}

export default function AppHome({ loaderData }: Route.ComponentProps) {
  const { user, lists, feed, listId, cursor } = loaderData;
  const current = lists.find((l) => l.id === listId) ?? null;

  return (
    <div className="wrap grid gap-8 py-8 lg:grid-cols-[19rem_1fr] lg:gap-10">
      <aside className="grid content-start gap-6 lg:sticky lg:top-24">
        <div>
          <p className="eyebrow">Signed in as</p>
          <p className="mt-1 font-display text-xl font-extrabold">{user.handle}</p>
          <Link to="/app/account" className="link text-[0.85rem] text-ink-3">
            Account
          </Link>
        </div>

        <nav aria-labelledby="lists-h" className="grid gap-2">
          <h2 id="lists-h" className="eyebrow">Your lists</h2>
          {lists.length === 0 && <p className="text-[0.9rem] text-ink-3">No lists yet. Make your first one below.</p>}
          <ul className="grid gap-1.5">
            {lists.map((l) => (
              <li key={l.id} className={`rounded-xl border p-3 ${l.id === listId ? "border-want bg-want-soft" : "border-line bg-card"}`}>
                <Link to={`/l/${l.id}`} className="link block font-semibold leading-snug">
                  {l.title}
                </Link>
                <p className="mt-1 text-[0.78rem] text-ink-3">
                  {plural(l.item_count, "item")} · {l.my_role} · updated <Time ts={l.updated_at} />
                </p>
                <p className="mt-1.5 flex gap-3 text-[0.8rem]">
                  <Link to={l.id === listId ? "/app" : `/app?list=${l.id}`} className="link text-ink-2" aria-current={l.id === listId ? "true" : undefined}>
                    {l.id === listId ? "Show all" : "Filter feed"}
                  </Link>
                  <Link to={`/app/lists/${l.id}/settings`} className="link text-ink-2">
                    Settings<span className="sr-only"> for {l.title}</span>
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </nav>

        <CreateList first={lists.length === 0} />
      </aside>

      <section aria-labelledby="feed-h" className="grid content-start gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{current ? "Filtered" : "All your lists"}</p>
            <h1 id="feed-h" className="mt-1 text-3xl font-extrabold sm:text-4xl">
              {current ? current.title : "Your feed"}
            </h1>
          </div>
          {lists.length > 1 && <ListFilter lists={lists} listId={listId} />}
        </div>

        {lists.length > 0 && <QuickAddItem lists={lists} listId={listId} />}

        {feed.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center">
            <p className="font-display text-xl font-bold">Nothing found yet</p>
            <p className="mx-auto mt-2 max-w-md text-ink-3">
              Add items, then connect an agent and ask it to shop your list. New products and outside suggestions show up here, newest first.
            </p>
            <Link to="/connect" className="btn btn-ghost btn-sm mt-4">
              Connect an agent
            </Link>
          </div>
        ) : (
          <ol className="grid gap-3">
            {feed.data.map((row) => (
              <li key={row.entry.id}>
                <FeedCard row={row}>
                  {row.entry.status === "listed" && (
                    <div className="mt-1 flex flex-wrap items-start gap-2">
                      {!row.item.purchase && <MarkBought itemId={row.item.id} entryId={row.entry.id} />}
                      <details className="min-w-0 flex-1">
                        <summary className="btn btn-ghost btn-xs w-fit">Comment</summary>
                        <div className="mt-2">
                          <CommentForm targetType="entry" targetId={row.entry.id} label={`Comment on ${row.entry.title}`} />
                        </div>
                      </details>
                    </div>
                  )}
                </FeedCard>
              </li>
            ))}
          </ol>
        )}
        <div className="flex gap-3">
          {cursor && (
            <Link to={listId ? `/app?list=${listId}` : "/app"} className="btn btn-ghost btn-sm">
              Newest
            </Link>
          )}
          {feed.next_cursor && (
            <Link to={`/app?${new URLSearchParams({ ...(listId ? { list: listId } : {}), cursor: feed.next_cursor })}`} className="btn btn-ghost btn-sm">
              Older
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function ListFilter({ lists, listId }: { lists: ListSummary[]; listId: string | null }) {
  return (
    <Form method="get" className="flex items-center gap-2">
      <label htmlFor="list-filter" className="text-[0.85rem] text-ink-3">
        Show
      </label>
      <select
        id="list-filter"
        name="list"
        defaultValue={listId ?? ""}
        className="select w-auto min-w-44"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">All lists</option>
        {lists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.title}
          </option>
        ))}
      </select>
      <noscript>
        <button className="btn btn-ghost btn-sm">Go</button>
      </noscript>
    </Form>
  );
}

function QuickAddItem({ lists, listId }: { lists: ListSummary[]; listId: string | null }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";
  const added = fetcher.state === "idle" && fetcher.data?.ok;
  return (
    <fetcher.Form
      method="post"
      className="card grid gap-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem("text") as HTMLInputElement | null;
        requestAnimationFrame(() => input && (input.value = ""));
      }}
    >
      <input type="hidden" name="intent" value="add-item" />
      <label className="field">
        <span className="label">Add something you want</span>
        <input name="text" required maxLength={500} placeholder="e.g. Waterproof walking boots, size 9 UK" className="input" />
      </label>
      <label className="field">
        <span className="label">to</span>
        <select name="list_id" defaultValue={listId ?? lists[0]?.id} className="select sm:max-w-52">
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-want" disabled={busy}>
        {busy ? "Adding…" : "Add item"}
      </button>
      <div aria-live="polite" className="sm:col-span-3">
        {fetcher.data?.error && <p className="form-error">{fetcher.data.error}</p>}
        {added && <p className="text-[0.85rem] text-deal">Added. Your agents will see it next time they check the list.</p>}
      </div>
    </fetcher.Form>
  );
}

function CreateList({ first }: { first: boolean }) {
  const nav = useNavigation();
  const busy = nav.state === "submitting" && nav.formData?.get("intent") === "create-list";
  return (
    <details open={first} className="card p-4">
      <summary className="flex items-center justify-between font-display text-lg font-bold">
        New list <span aria-hidden="true" className="text-want">+</span>
      </summary>
      <Form method="post" className="mt-3 grid gap-3">
        <input type="hidden" name="intent" value="create-list" />
        <label className="field">
          <span className="label">Title</span>
          <input name="title" required maxLength={140} placeholder="Black Friday 2026" className="input" />
        </label>
        <label className="field">
          <span className="label">Description (optional)</span>
          <textarea name="description" maxLength={500} className="textarea" placeholder="Budget, sizes, where you can get deliveries…" />
        </label>
        <p className="hint">Lists are public once they have an item. Anyone can read them; only you and people you invite can write.</p>
        <button className="btn" disabled={busy}>
          {busy ? "Creating…" : "Create list"}
        </button>
      </Form>
    </details>
  );
}
