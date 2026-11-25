import { useEffect, useState } from "react";
import { data, Form, Link, redirect, useActionData, useFetcher, useNavigation } from "react-router";
import { PrivateBadge } from "~/components/ListView";
import { FORMATS, formatInfo, visibilityOf, type FormatInfo } from "~/lib/formats";
import type { Route } from "./+types/app";
import { CommentForm } from "~/components/Comments";
import { MarkBought } from "~/components/EntryCard";
import { FeedCard } from "~/components/FeedCard";
import { Time } from "~/components/Time";
import { api, apiOptional, formError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { plural } from "~/lib/format";
import { handleWriterIntent } from "~/lib/intents.server";
import { assertSameOrigin } from "~/lib/session.server";
import { LiveUpdates } from "~/components/LiveUpdates";
import { DetailsPrompt } from "~/components/ListView";
import { Button, Field, Input, Select, Textarea } from "~/components/ui";
import type { AgentInfo, FeedEntry, ListFormat, ListSummary, ListVisibility, Page, PendingInvite } from "~/lib/types";

export function meta() {
  return [{ title: "My lists · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const listId = url.searchParams.get("list") || null;
  const cursor = url.searchParams.get("cursor");
  const [lists, feed, invites] = await Promise.all([
    api<ListSummary[]>(request, "/me/lists"),
    api<Page<FeedEntry>>(request, "/me/feed", { query: { list_id: listId, cursor } }),
    // Older API servers don't have pending invites yet: show none.
    apiOptional<PendingInvite[]>(request, "/me/invites").then((r) => r ?? []),
  ]);
  // First run: work out which getting-started steps are done.
  const firstRun = !listId && !cursor && feed.data.length === 0;
  const agentCount = firstRun ? (await api<AgentInfo[]>(request, "/me/agents").catch(() => [])).length : 0;
  return data({ user, lists, feed, listId, cursor, invites, firstRun, agentCount }, { headers: { "Cache-Control": "private, no-store" } });
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
        body: {
          title,
          description: String(form.get("description") ?? "").trim() || undefined,
          format: ["shopping", "tasks", "research"].includes(String(form.get("format"))) ? form.get("format") : "shopping",
          visibility: form.get("visibility") === "private" ? "private" : form.get("visibility") === "public" ? "public" : undefined,
        },
      });
      return redirect(`/l/${list.id}`);
    } catch (err) {
      return data(formError(err), 400);
    }
  }
  if (form.get("intent") === "accept-invite") {
    const id = String(form.get("list_id") ?? "");
    try {
      const list = await api<ListSummary>(request, `/me/invites/${encodeURIComponent(id)}/accept`, { method: "POST" });
      return redirect(`/l/${list.id}`);
    } catch (err) {
      return data({ ...formError(err), intent: "accept-invite" }, 400);
    }
  }
  return handleWriterIntent(request, form);
}

export default function AppHome({ loaderData }: Route.ComponentProps) {
  const { user, lists, feed, listId, cursor, invites, firstRun, agentCount } = loaderData;
  const current = lists.find((l) => l.id === listId) ?? null;

  return (
    <div className="wrap grid grid-cols-1 gap-8 py-8 lg:grid-cols-[19rem_1fr] lg:gap-10">

      <section aria-labelledby="feed-h" className="grid content-start gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="feed-h" className="serif mt-2 text-[2rem] sm:text-[2.4rem]">
              {current ? current.title : "Latest"}
            </h1>
          </div>
          {lists.length > 1 && <ListFilter lists={lists} listId={listId} />}
        </div>

        {/* Phones: the list sidebar comes after the feed, so give quick links to it here. */}
        <nav aria-label="Your lists, quick links" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
          {lists.map((l) => (
            <Link key={l.id} to={`/l/${l.id}`} className="btn btn-ghost btn-sm max-w-[15rem] shrink-0">
              <span className="truncate">{l.title}</span>
            </Link>
          ))}
          <a href="#new-list" className="btn btn-ghost btn-sm shrink-0" onClick={() => document.getElementById("new-list")?.setAttribute("open", "")}>
            New list
          </a>
        </nav>

        {lists.length > 0 && <QuickAddItem lists={lists} listId={listId} />}

        <LiveUpdates query="scope=me" />
        {invites.length > 0 && <PendingInvites invites={invites} />}

        {firstRun ? (
          <GettingStarted lists={lists} agentCount={agentCount} />
        ) : feed.data.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-strong p-8 text-center">
            <p className="text-lg font-semibold">Nothing posted yet</p>
            <p className="mx-auto mt-2 max-w-md text-ink-3">
              Ask an agent to work on your list.
            </p>
            <Link to="/connect" className="btn btn-ghost btn-sm mt-4">
              Connect an agent
            </Link>
          </div>
        ) : (
          <ol className="feed-rows grid border-t border-line">
            {feed.data.map((row) => (
              <li key={row.entry.id}>
                <FeedCard row={row}>
                  {row.entry.status === "listed" && (row.entry.kind ?? "product") === "product" && (
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
      <aside className="grid content-start gap-6 lg:sticky lg:top-24 lg:order-first">
        <div>
          <p className="mt-1 font-display text-xl font-semibold">{user.handle}</p>
          <Link to="/app/account" className="link text-[0.85rem] text-ink-3">
            Account
          </Link>
        </div>

        <nav aria-labelledby="lists-h" className="grid gap-2">
          <h2 id="lists-h" className="eyebrow">Your lists</h2>
          {lists.length === 0 && <p className="text-[0.9rem] text-ink-3">No lists yet.</p>}
          <ul className="grid border-t border-line">
            {lists.map((l) => (
              <li key={l.id} className={`border-b border-line py-3 ${l.id === listId ? "-mx-3 bg-sunk px-3" : ""}`}>
                <Link to={`/l/${l.id}`} className="link block font-semibold leading-snug">
                  {l.title}
                </Link>
                {visibilityOf(l) === "private" && (
                  <span className="mt-1 inline-block">
                    <PrivateBadge />
                  </span>
                )}
                <p className="mt-1 text-[0.78rem] text-ink-3">
                  {formatInfo(l).label} · {plural(l.item_count, formatInfo(l).item)} · {l.my_role} · updated <Time ts={l.updated_at} />
                </p>
                <p className="mt-1.5 flex gap-3 text-[0.8rem]">
                  <Link to={l.id === listId ? "/app" : `/app?list=${l.id}`} className="link text-ink-2" aria-current={l.id === listId ? "true" : undefined}>
                    {l.id === listId ? "Show all" : "Show only this"}
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
    </div>
  );
}

function ListFilter({ lists, listId }: { lists: ListSummary[]; listId: string | null }) {
  return (
    <Form method="get" className="flex items-center gap-2">
      <label htmlFor="list-filter" className="sr-only">
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
  const fetcher = useFetcher<{ ok?: boolean; error?: string; itemId?: string }>();
  const busy = fetcher.state !== "idle";
  const added = fetcher.state === "idle" && fetcher.data?.ok && fetcher.data.itemId ? fetcher.data.itemId : null;
  const [promptFor, setPromptFor] = useState<string | null>(null);
  useEffect(() => {
    if (added) setPromptFor(added);
  }, [added]);
  const [target, setTarget] = useState(listId ?? lists[0]?.id ?? "");
  const fi = formatInfo(lists.find((l) => l.id === target));
  return (
    <div className="card grid gap-3 p-4">
      <fetcher.Form
        method="post"
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:items-end"
        onSubmit={(e) => {
          const form = e.currentTarget;
          requestAnimationFrame(() => {
            const input = form.elements.namedItem("text") as HTMLInputElement | null;
            const details = form.elements.namedItem("details") as HTMLTextAreaElement | null;
            if (input) input.value = "";
            if (details) details.value = "";
          });
        }}
      >
        <input type="hidden" name="intent" value="add-item" />
        <Field label={fi.addItemTitle}>
          {(p) => <Input {...p} name="text" required maxLength={500} placeholder={fi.itemPlaceholder} />}
        </Field>
        <Field label="List">
          {(p) => (
            <Select {...p} name="list_id" value={target} onChange={(e) => setTarget(e.currentTarget.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button variant="primary" disabled={busy}>
          {busy ? "Adding…" : `Add ${fi.item}`}
        </Button>
        <details className="group sm:col-span-3">
          <summary className="textlink-btn text-[0.85rem]">
            Details <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
          </summary>
          <Field label="Details (optional)" className="mt-2">
            {(p) => <Textarea {...p} name="details" maxLength={2000} placeholder={fi.detailsPlaceholder} className="min-h-16" />}
          </Field>
        </details>
        <div aria-live="polite" className="empty:hidden sm:col-span-3">
          {fetcher.data?.error && <p className="form-error">{fetcher.data.error}</p>}
        </div>
      </fetcher.Form>
      {promptFor && <DetailsPrompt itemId={promptFor} fi={fi} onDone={() => setPromptFor(null)} />}
    </div>
  );
}

function CreateList({ first }: { first: boolean }) {
  const nav = useNavigation();
  const result = useActionData<typeof action>() as { error?: string } | undefined;
  const busy = nav.state === "submitting" && nav.formData?.get("intent") === "create-list";
  const [format, setFormat] = useState<ListFormat>("shopping");
  // Visibility follows the format's default until the person picks one themselves.
  const [visibility, setVisibility] = useState<ListVisibility | null>(null);
  const fi = FORMATS[format];
  const vis = visibility ?? fi.defaultVisibility;
  return (
    <details id="new-list" open={first || undefined} className="card scroll-mt-24 p-4">
      <summary className="flex items-center justify-between text-lg font-semibold">
        New list <span aria-hidden="true" className="text-want">+</span>
      </summary>
      <Form method="post" className="mt-3 grid gap-4">
        <input type="hidden" name="intent" value="create-list" />
        <fieldset className="grid gap-2">
          <legend className="label mb-1">What is this list for?</legend>
          {(Object.values(FORMATS) as FormatInfo[]).map((f) => (
            <label
              key={f.format}
              className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-md border p-3 ${format === f.format ? "border-ink bg-sunk" : "border-line"}`}
            >
              <input
                type="radio"
                name="format"
                value={f.format}
                checked={format === f.format}
                onChange={() => setFormat(f.format)}
                className="mt-1 accent-[var(--want)]"
              />
              <span>
                <span className="block font-semibold">{f.label}</span>
                <span className="block text-[0.82rem] text-ink-2">{f.blurb}</span>
                <span className="mt-0.5 block text-[0.76rem] text-ink-3">e.g. {f.examples}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span className="label">Title</span>
          <input name="title" required maxLength={140} placeholder={format === "shopping" ? "Black Friday 2026" : format === "tasks" ? "Moving flat" : "Heat pump questions"} className="input" />
        </label>
        <label className="field">
          <span className="label">Description (optional)</span>
          <textarea name="description" maxLength={500} className="textarea" placeholder={fi.detailsPlaceholder} />
        </label>
        <fieldset className="grid gap-2">
          <legend className="label mb-1">Who can see it?</legend>
          {(["public", "private"] as const).map((v) => (
            <label key={v} className="flex cursor-pointer items-start gap-2 text-[0.88rem]">
              <input type="radio" name="visibility" value={v} checked={vis === v} onChange={() => setVisibility(v)} className="mt-1 accent-[var(--want)]" />
              <span>
                <span className="font-semibold">{v === "public" ? "Public" : "Private"}</span>
                {fi.defaultVisibility === v && <span className="text-ink-3"> (usual for {fi.label.toLowerCase()})</span>}
                <span className="block text-ink-3">
                  {v === "public"
                    ? "Anyone with the link can read it, and search engines can find it once it has an item."
                    : "Only you, people you invite and your connected agents can see it."}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        {result?.error && <p className="form-error" role="alert">{result.error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Creating…" : `Create ${fi.label.toLowerCase()} list`}
        </button>
      </Form>
    </details>
  );
}

function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  const nav = useNavigation();
  const result = useActionData<typeof action>() as { error?: string; intent?: string } | undefined;
  return (
    <section aria-labelledby="invites-h" className="card grid gap-3 p-4 sm:p-5">
      <h2 id="invites-h" className="text-lg font-semibold">
        {invites.length === 1 ? "You're invited to a list" : `You're invited to ${invites.length} lists`}
      </h2>
      <ul className="grid gap-2">
        {invites.map((inv) => (
          <li key={inv.list.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-line p-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{inv.list.title}</p>
              <p className="text-[0.8rem] text-ink-3">
                by {inv.list.owner_handle} · invited <Time ts={inv.invited_at} />
              </p>
            </div>
            <Form method="post">
              <input type="hidden" name="intent" value="accept-invite" />
              <input type="hidden" name="list_id" value={inv.list.id} />
              <button className="btn btn-want btn-sm" disabled={nav.state !== "idle"}>
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

/** First run: what will appear here, and the three steps to get there. */
function GettingStarted({ lists, agentCount }: { lists: ListSummary[]; agentCount: number }) {
  const hasList = lists.length > 0;
  const hasItem = lists.some((l) => l.item_count > 0);
  const hasAgent = agentCount > 0;
  const firstList = lists[0];
  const steps: Array<{ done: boolean; title: string; body: React.ReactNode }> = [
    {
      done: hasList,
      title: "Make a list",
      body: hasList ? (
        <Link to={`/l/${firstList.id}`} className="link">
          Open {firstList.title}
        </Link>
      ) : (
        <>Use New list.</>
      ),
    },
    { done: hasItem, title: "Add what you want", body: hasItem ? null : <>In your own words.</> },
    {
      done: hasAgent,
      title: "Connect an agent",
      body: hasAgent ? (
        <>Ask it to work on your list.</>
      ) : (
        <>
          ChatGPT, Claude or any AI app.{" "}
          <Link to="/connect" className="link">
            How to connect
          </Link>
        </>
      ),
    },
  ];
  const next = steps.findIndex((st) => !st.done);
  return (
    <section aria-labelledby="start-h" className="card grid gap-5 p-5 sm:p-7">
      <div>
        <h2 id="start-h" className="serif text-[1.75rem]">
          {next === -1 ? "All set" : "Get started"}
        </h2>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((st, i) => (
          <li
            key={st.title}
            className={`grid content-start gap-2 rounded-md border p-4 ${i === next ? "border-ink bg-sunk" : "border-line"}`}
            aria-current={i === next ? "step" : undefined}
          >
            <span
              className={`text-[0.95rem] font-medium ${st.done ? "text-deal" : i === next ? "text-ink" : "text-ink-3"}`}
              aria-hidden="true"
            >
              {st.done ? "✓" : i + 1}
            </span>
            <h3 className="font-sans text-[1.02rem] font-semibold tracking-normal">
              {st.title}
              {st.done && <span className="sr-only"> (done)</span>}
            </h3>
            <p className="text-[0.9rem] text-ink-2">{st.body}</p>
          </li>
        ))}
      </ol>
      {next === -1 && (
        <p className="rounded-md bg-sunk px-4 py-3 text-[0.9rem] text-ink-2">
          Try: “Work on my Want MCP list.”
        </p>
      )}
    </section>
  );
}
