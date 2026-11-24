import { useState } from "react";
import { data, Link, useFetcher } from "react-router";
import type { Route } from "./+types/list";
import { ActorTag } from "~/components/ActorTag";
import { CommentForm, CommentList } from "~/components/Comments";
import { CopyButton } from "~/components/CopyButton";
import { EntryCard } from "~/components/EntryCard";
import { canManage, EditItem, EntryForm, MarkBoughtElsewhere, RemoveButton } from "~/components/WriteTools";
import { ReportLink } from "~/components/Report";
import { Time } from "~/components/Time";
import { api, apiOptional, toRouteError } from "~/lib/api.server";
import { siteOrigin } from "~/lib/config.server";
import { clip, formatMoney, plural } from "~/lib/format";
import { useRootData } from "~/lib/hooks";
import { handleWriterIntent } from "~/lib/intents.server";
import { getSessionToken } from "~/lib/session.server";
import type { Comment, Entry, Item, ListDetail, ListPrices, Page, PriceObservation, UserSelf } from "~/lib/types";

type ItemWithEntries = Item & { entries: Entry[] };

/** Comments for the whole list, a few pages deep. */
async function loadComments(request: Request, listId: string): Promise<Comment[]> {
  const comments: Comment[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 5; i++) {
    const page: Page<Comment> = await api<Page<Comment>>(request, `/lists/${encodeURIComponent(listId)}/comments`, { query: { cursor } });
    comments.push(...page.data);
    cursor = page.next_cursor;
    if (!cursor) break;
  }
  return comments;
}

/**
 * Price history for every entry in one call. Requested anonymously so it can never include
 * suggestions. Falls back to one call per entry on an API without `/lists/{id}/prices`.
 */
async function loadPrices(request: Request, listId: string, items: ItemWithEntries[]): Promise<Record<string, PriceObservation[]>> {
  const all = await apiOptional<ListPrices>(request, `/lists/${encodeURIComponent(listId)}/prices`, {
    anonymous: true,
  });
  if (all) return all.prices ?? {};
  const need = items.flatMap((it) => it.entries).filter((e) => e.price_count > 1).slice(0, 60);
  const histories = await Promise.all(
    need.map((e) => api<PriceObservation[]>(request, `/entries/${encodeURIComponent(e.id)}/prices`, { anonymous: true }).catch(() => null)),
  );
  const prices: Record<string, PriceObservation[]> = {};
  need.forEach((e, i) => {
    if (histories[i]) prices[e.id] = histories[i]!;
  });
  return prices;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const id = params.id;
  let list: ListDetail;
  try {
    list = await api<ListDetail>(request, `/lists/${encodeURIComponent(id)}`);
  } catch (err) {
    toRouteError(err);
  }
  const role = list.my_role ?? null;
  const isWriter = role === "owner" || role === "member";

  // Suggestions are writers-only. Never let one reach an anonymous page or a crawler,
  // even if the API were to return it.
  const suggestions: Array<{ entry: Entry; item: Pick<Item, "id" | "text"> }> = [];
  const items: ItemWithEntries[] = list.items.map((it) => {
    const listed: Entry[] = [];
    for (const e of it.entries) {
      if (e.status === "listed") listed.push(e);
      else if (isWriter) suggestions.push({ entry: e, item: { id: it.id, text: it.text } });
    }
    return { ...it, entries: listed };
  });

  const listedIds = new Set(items.flatMap((it) => it.entries.map((e) => e.id)));
  const [comments, prices] = await Promise.all([loadComments(request, id), loadPrices(request, id, items)]);
  // Only listed entries' histories reach the page.
  for (const key of Object.keys(prices)) if (!listedIds.has(key)) delete prices[key];

  const { items: _drop, ...summary } = list;
  const signedIn = Boolean(getSessionToken(request));
  return data(
    { list: summary, items, suggestions, comments, prices, isWriter, role, origin: siteOrigin(request) },
    {
      headers: {
        "Cache-Control": signedIn ? "private, no-store" : "public, max-age=30, s-maxage=60",
        Vary: "Cookie",
      },
    },
  );
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function action({ request, params }: Route.ActionArgs) {
  return handleWriterIntent(request, await request.formData(), params.id);
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "List not found · The Want MCP" }, { name: "robots", content: "noindex" }];
  const { list, items, origin } = loaderData;
  const url = `${origin}/l/${list.id}`;
  const listed = items.flatMap((i) => i.entries);
  const description = clip(
    list.description ||
      `${plural(items.length, "thing")} ${list.owner_handle} wants, with ${plural(listed.length, "product")} found by AI agents: ${items
        .slice(0, 3)
        .map((i) => i.text)
        .join("; ")}`,
  );
  const title = `${list.title} · a want list by ${list.owner_handle}`;
  const firstImage = listed.find((e) => e.image_url?.startsWith("https://"))?.image_url;

  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: list.title,
    description: list.description || undefined,
    url,
    dateModified: list.updated_at,
    numberOfItems: items.length,
    author: { "@type": "Person", name: list.owner_handle },
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${url}#${it.id}`,
      name: it.text,
      ...(it.entries.length
        ? {
            item: {
              "@type": "ItemList",
              name: it.text,
              itemListElement: it.entries.map((e, j) => ({
                "@type": "ListItem",
                position: j + 1,
                item: {
                  "@type": "Product",
                  name: e.title,
                  url: e.product_url,
                  ...(e.image_url?.startsWith("https://") ? { image: e.image_url } : {}),
                  ...(e.current_price
                    ? {
                        offers: {
                          "@type": "Offer",
                          price: e.current_price.price,
                          priceCurrency: e.current_price.currency,
                          url: e.buy_url ?? e.product_url,
                          ...(e.retailer ? { seller: { "@type": "Organization", name: e.retailer } } : {}),
                          ...(e.deal_ends_at ? { priceValidUntil: e.deal_ends_at.slice(0, 10) } : {}),
                        },
                      }
                    : {}),
                },
              })),
            },
          }
        : {}),
    })),
  };

  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "The Want MCP" },
    { property: "og:title", content: list.title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    ...(firstImage ? [{ property: "og:image", content: firstImage }] : []),
    { name: "twitter:card", content: firstImage ? "summary_large_image" : "summary" },
    ...(items.length === 0 ? [{ name: "robots", content: "noindex" }] : []),
    { "script:ld+json": ld },
  ];
}

function lowestEntryId(entries: Entry[]): string | null {
  const priced = entries.filter((e) => e.current_price);
  if (priced.length < 2) return null;
  const currency = priced[0].current_price!.currency;
  if (!priced.every((e) => e.current_price!.currency === currency)) return null;
  return priced.reduce((a, b) => (Number(b.current_price!.price) < Number(a.current_price!.price) ? b : a)).id;
}

function sortByPrice(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (!a.current_price) return 1;
    if (!b.current_price) return -1;
    return Number(a.current_price.price) - Number(b.current_price.price);
  });
}

export default function ListPage({ loaderData }: Route.ComponentProps) {
  const { list, items, suggestions, comments, prices, isWriter, role, origin } = loaderData;
  const { user } = useRootData();
  const listUrl = `${origin}/l/${list.id}`;

  const commentsFor = (type: "item" | "entry", id: string) => comments.filter((c) => c.target_type === type && c.target_id === id);
  const canDeleteComment = (c: Comment) => canManage(c.author, user, role);

  const wanted = items.filter((i) => !i.purchase);
  const bought = items.filter((i) => i.purchase);
  const productCount = items.reduce((n, i) => n + i.entries.length, 0);

  return (
    <div>
      <section className="border-b border-line bg-[radial-gradient(ellipse_at_top_left,var(--want-soft),transparent_60%)]">
        <div className="wrap py-10 sm:py-14">
          <p className="eyebrow">
            Want list <span aria-hidden="true">·</span> by <span className="normal-case tracking-normal">{list.owner_handle}</span>
          </p>
          <h1 className="mt-3 max-w-4xl text-[2.4rem] font-extrabold sm:text-6xl">{list.title}</h1>
          {list.description && <p className="mt-4 max-w-2xl text-[1.05rem] text-ink-2">{list.description}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-[0.9rem] text-ink-3">
            <span>
              <strong className="text-ink">{wanted.length}</strong> wanted
            </span>
            {bought.length > 0 && (
              <span>
                <strong className="text-ink">{bought.length}</strong> bought
              </span>
            )}
            <span>
              <strong className="text-ink">{productCount}</strong> {productCount === 1 ? "product" : "products"} found
            </span>
            <span>
              Updated <Time ts={list.updated_at} />
            </span>
            <span className="flex items-center gap-3">
              <CopyButton text={listUrl} label="Copy link" />
              <ReportLink type="list" id={list.id} label="Report list" />
            </span>
          </div>
          {isWriter && (
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip chip-live">You can write to this list ({role})</span>
              <Link to={`/app/lists/${list.id}/settings`} className="btn btn-ghost btn-sm">
                List settings & agents
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="wrap grid grid-cols-1 gap-12 py-10">
        {isWriter && suggestions.length > 0 && <Suggestions suggestions={suggestions} />}
        {isWriter && <AddItem listId={list.id} empty={items.length === 0} />}

        {wanted.map((item, i) => (
          <ItemSection
            key={item.id}
            n={i + 1}
            item={item}
            prices={prices}
            commentsFor={commentsFor}
            isWriter={isWriter}
            role={role}
            user={user}
            canDeleteComment={canDeleteComment}
            eager={i === 0}
          />
        ))}

        {bought.length > 0 && (
          <section aria-labelledby="bought-h" className="grid gap-10">
            <div className="flex items-center gap-4">
              <h2 id="bought-h" className="text-2xl font-extrabold">Bought</h2>
              <div className="divider-dots flex-1" />
            </div>
            {bought.map((item) => (
              <ItemSection
                key={item.id}
                item={item}
                prices={prices}
                commentsFor={commentsFor}
                isWriter={isWriter}
                role={role}
                user={user}
                canDeleteComment={canDeleteComment}
              />
            ))}
          </section>
        )}

        {!isWriter && (
          <aside className="card grid gap-3 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 className="text-xl font-extrabold">Want your agents to shop for you too?</h2>
              <p className="mt-1 text-ink-2">Make a list, connect ChatGPT, Claude or any MCP client, and compare what they find.</p>
            </div>
            <Link to={user ? "/app" : "/login"} className="btn btn-want">
              Start a list
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}

function ItemSection({
  item,
  n,
  prices,
  commentsFor,
  isWriter,
  role,
  user,
  canDeleteComment,
  eager,
}: {
  item: ItemWithEntries;
  n?: number;
  prices: Record<string, PriceObservation[]>;
  commentsFor: (t: "item" | "entry", id: string) => Comment[];
  isWriter: boolean;
  role: "owner" | "member" | null;
  user: UserSelf | null;
  canDeleteComment: (c: Comment) => boolean;
  eager?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const canEditItem = canManage(item.created_by, user, role);
  const entries = sortByPrice(item.entries);
  const lowest = lowestEntryId(entries);
  const itemComments = commentsFor("item", item.id);
  const p = item.purchase;
  const cheapest = entries.find((e) => e.current_price)?.current_price;
  // Older purchases may only record the entry; fall back to its price and retailer.
  const boughtEntry = p?.entry_id ? entries.find((e) => e.id === p.entry_id) : undefined;
  const boughtPrice = p?.price ? { price: p.price, currency: p.currency } : boughtEntry?.current_price ?? null;
  const boughtRetailer = p?.retailer ?? boughtEntry?.retailer ?? null;
  const headingId = `${item.id}-h`;

  return (
    <section id={item.id} aria-labelledby={headingId} className="grid scroll-mt-24 gap-5">
      <header className="grid gap-2">
        <div className="flex items-start gap-3">
          {n !== undefined && (
            <span aria-hidden="true" className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-extrabold text-paper">
              {n}
            </span>
          )}
          {editing ? (
            <div className="flex-1">
              <h2 id={headingId} className="sr-only">
                Editing: {item.text}
              </h2>
              <EditItem item={item} onDone={() => setEditing(false)} />
            </div>
          ) : (
            <h2 id={headingId} className={`text-[1.25rem] font-bold sm:text-[1.7rem] ${p ? "text-ink-2" : ""}`}>
              {item.text}
            </h2>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.85rem] text-ink-3 sm:pl-11">
          <span className="inline-flex items-center gap-1.5">
            Added by <ActorTag actor={item.created_by} compact /> <Time ts={item.created_at} />
          </span>
          <span>
            {entries.length === 0
              ? "No products yet"
              : `${plural(entries.length, "option")}${cheapest && entries.length > 1 ? ` from ${formatMoney(cheapest.price, cheapest.currency)}` : ""}`}
          </span>
          <ReportLink type="item" id={item.id} />
          {canEditItem && !editing && (
            <>
              <button type="button" className="textlink-btn text-[0.8rem]" onClick={() => setEditing(true)}>
                Edit<span className="sr-only"> item</span>
              </button>
              <RemoveButton
                intent="delete-item"
                fields={{ item_id: item.id }}
                label="Remove item"
                confirmText={`Remove “${item.text.slice(0, 80)}” and all its products, prices and comments?`}
              />
            </>
          )}
        </div>
        {p && (
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-deal/40 bg-deal-soft px-4 py-3 text-[0.9rem] sm:ml-11">
            <span className="stamp">Bought</span>
            <span className="text-ink">
              {boughtPrice ? <strong>{formatMoney(boughtPrice.price, boughtPrice.currency)}</strong> : "Bought"}
              {boughtRetailer ? ` at ${boughtRetailer}` : ""} by{" "}
              {p.purchased_by.kind === "user" ? p.purchased_by.handle : p.purchased_by.kind === "agent" ? p.purchased_by.name : "someone"},{" "}
              <Time ts={p.purchased_at} />
            </span>
            {isWriter && <UndoPurchase itemId={item.id} />}
          </div>
        )}
      </header>

      {entries.length > 0 ? (
        <div className={`grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 sm:pl-11 ${p ? "opacity-80" : ""}`}>
          {entries.map((e, i) => (
            <EntryCard
              key={e.id}
              entry={e}
              prices={prices[e.id] ?? null}
              comments={commentsFor("entry", e.id)}
              isLowest={e.id === lowest}
              boughtThis={p?.entry_id === e.id}
              itemPurchased={!!p}
              canWrite={isWriter}
              canEdit={canManage(e.author, user, role)}
              canDeleteComment={canDeleteComment}
              eagerImage={eager && i < 3}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-ink-3 sm:ml-11">
          Waiting for an agent to find something.{isWriter ? " Ask one of your connected agents to shop for this item." : ""}
        </p>
      )}

      {(itemComments.length > 0 || isWriter) && (
        <div className="grid gap-3 sm:pl-11">
          <h3 className="eyebrow">Discussion</h3>
          <CommentList comments={itemComments} canDelete={canDeleteComment} />
          {isWriter && <CommentForm targetType="item" targetId={item.id} label="Comment on this item" />}
        </div>
      )}

      {isWriter && (
        <div className="flex flex-wrap gap-2 sm:pl-11">
          {!p && <MarkBoughtElsewhere itemId={item.id} />}
          <AddEntry itemId={item.id} />
        </div>
      )}
    </section>
  );
}

function UndoPurchase({ itemId }: { itemId: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" className="ml-auto">
      <input type="hidden" name="intent" value="unpurchase" />
      <input type="hidden" name="item_id" value={itemId} />
      <button className="btn btn-ghost btn-xs" disabled={fetcher.state !== "idle"}>
        Undo
      </button>
    </fetcher.Form>
  );
}

function AddItem({ listId, empty }: { listId: string; empty: boolean }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";
  return (
    <section aria-labelledby="add-item-h" className={`card p-5 ${empty ? "border-want" : ""}`}>
      <h2 id="add-item-h" className="text-xl font-extrabold">
        {empty ? "Add the first thing you want" : "Add something you want"}
      </h2>
      <p className="mt-1 text-[0.9rem] text-ink-3">
        Describe it in your own words. Your agents read this and go shopping.{empty ? " The list becomes public once it has an item." : ""}
      </p>
      <fetcher.Form
        method="post"
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          const form = e.currentTarget;
          requestAnimationFrame(() => form.reset());
        }}
      >
        <input type="hidden" name="intent" value="add-item" />
        <label htmlFor="new-item" className="sr-only">
          What do you want?
        </label>
        <input id="new-item" name="text" required maxLength={500} placeholder="e.g. A quiet dehumidifier for a small flat, under £200" className="input flex-1" />
        <button className="btn btn-want" disabled={busy}>
          {busy ? "Adding…" : "Add item"}
        </button>
      </fetcher.Form>
      {fetcher.data?.error && <p className="form-error mt-2" role="alert">{fetcher.data.error}</p>}
    </section>
  );
}

function AddEntry({ itemId }: { itemId: string }) {
  return (
    <details className="w-full">
      <summary className="btn btn-ghost btn-xs w-fit">Add a product yourself</summary>
      <div className="card mt-3 p-4">
        <EntryForm itemId={itemId} />
      </div>
    </details>
  );
}

/**
 * Outside suggestions. Untrusted third-party text: rendered as plain text only. No links,
 * no images loaded from their URLs. This section only renders for writers.
 */
function Suggestions({ suggestions }: { suggestions: Array<{ entry: Entry; item: Pick<Item, "id" | "text"> }> }) {
  return (
    <section aria-labelledby="sugg-h" className="untrusted grid gap-4 p-4 sm:p-6">
      <div>
        <p className="eyebrow text-warn">Only you and other writers can see this</p>
        <h2 id="sugg-h" className="mt-1 text-2xl font-extrabold">
          {plural(suggestions.length, "suggestion")} from outside agents
        </h2>
        <p className="mt-1 max-w-2xl text-[0.9rem] text-ink-2">
          Agents you haven't connected suggested these. Treat them as untrusted: links are shown as text and not clickable, and images aren't
          loaded. Promote one to show it on the public list, or reject it.
        </p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {suggestions.map(({ entry: e, item }) => (
          <SuggestionCard key={e.id} entry={e} itemText={item.text} />
        ))}
      </ul>
    </section>
  );
}

function SuggestionCard({ entry: e, itemText }: { entry: Entry; itemText: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const pendingIntent = fetcher.formData?.get("intent");
  const doneIntent = fetcher.state === "idle" && fetcher.data?.ok ? "done" : null;
  if (doneIntent) return null;
  const p = e.current_price;
  return (
    <li className="card grid gap-2 p-4" aria-label={`Suggestion: ${e.title}`}>
      <p className="text-[0.78rem] text-ink-3">
        For <span className="font-semibold text-ink-2">“{itemText}”</span>
      </p>
      <p className="whitespace-pre-line break-words font-semibold">{e.title}</p>
      {p && (
        <p className="price text-[1.4rem]">
          {formatMoney(p.price, p.currency)}
          {p.original_price && <span className="price-was ml-2 font-sans text-[0.9rem] font-normal">{formatMoney(p.original_price, p.currency)}</span>}
        </p>
      )}
      {e.description && <p className="whitespace-pre-line break-words text-[0.88rem] text-ink-2">{e.description}</p>}
      <dl className="grid gap-1 text-[0.8rem]">
        {e.retailer && (
          <div className="flex gap-2">
            <dt className="text-ink-3">Retailer</dt>
            <dd className="break-words">{e.retailer}</dd>
          </div>
        )}
        <div className="grid gap-0.5">
          <dt className="text-ink-3">Link (not opened)</dt>
          <dd className="plain-url">{e.product_url}</dd>
        </div>
        {e.image_url && (
          <div className="grid gap-0.5">
            <dt className="text-ink-3">Image link (not loaded)</dt>
            <dd className="plain-url">{e.image_url}</dd>
          </div>
        )}
        {e.coupon_code && (
          <div className="flex gap-2">
            <dt className="text-ink-3">Coupon</dt>
            <dd className="font-mono">{e.coupon_code}</dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-3">
        <ActorTag actor={e.author} /> <Time ts={e.created_at} />
      </div>
      <fetcher.Form method="post" className="mt-1 flex gap-2">
        <input type="hidden" name="entry_id" value={e.id} />
        <button name="intent" value="promote" className="btn btn-sm" disabled={fetcher.state !== "idle"}>
          {pendingIntent === "promote" ? "Promoting…" : "Promote to list"}
        </button>
        <button name="intent" value="reject" className="btn btn-ghost btn-sm" disabled={fetcher.state !== "idle"}>
          {pendingIntent === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </fetcher.Form>
      {fetcher.data?.error && <p className="form-error" role="alert">{fetcher.data.error}</p>}
    </li>
  );
}
