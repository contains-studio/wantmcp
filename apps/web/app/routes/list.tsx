import { data, redirect } from "react-router";
import { orFallback } from "~/lib/degrade.server";
import type { Route } from "./+types/list";
import { ListView, type ItemWithEntries } from "~/components/ListView";
import { api, apiOptional, toRouteError } from "~/lib/api.server";
import { siteOrigin } from "~/lib/config.server";
import { clip, plural } from "~/lib/format";
import { handleWriterIntent } from "~/lib/intents.server";
import { assertSameOrigin, clearKeptCookie, dismissedHandoffs, dismissHandoffCookie, getSessionToken, readKept } from "~/lib/session.server";
import type { AgentInfo, Comment, ListAccess, Entry, Item, ListDetail, ListPrices, Page, PriceObservation } from "~/lib/types";
import { getThemeView } from "~/themes/catalogue.server";
import { formatInfo, formatOf, visibilityOf } from "~/lib/formats";

/** Comments for the whole list, a few pages deep. */
async function loadComments(request: Request, listId: string): Promise<{ comments: Comment[]; cursor: string | null }> {
  const comments: Comment[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 5; i++) {
    const page: Page<Comment> = await api<Page<Comment>>(request, `/lists/${encodeURIComponent(listId)}/comments`, { query: { cursor } });
    comments.push(...page.data);
    cursor = page.next_cursor;
    if (!cursor) break;
  }
  // A non-null cursor means there are more; the page offers "Show more comments".
  return { comments, cursor };
}

/**
 * Price history for every entry in one call. Requested anonymously so it can never include
 * suggestions. Falls back to one call per entry on an API without `/lists/{id}/prices`.
 */
async function loadPrices(request: Request, listId: string, items: ItemWithEntries[], asWriter: boolean): Promise<Record<string, PriceObservation[]>> {
  // Public lists: fetched anonymously, so the result can never include suggestions. Private
  // lists are only rendered for writers, who need their credential to read them at all.
  const anonymous = !asWriter;
  const all = await apiOptional<ListPrices>(request, `/lists/${encodeURIComponent(listId)}/prices`, { anonymous });
  if (all) return all.prices ?? {};
  const need = items.flatMap((it) => it.entries).filter((e) => e.price_count > 1).slice(0, 60);
  const histories = await Promise.all(
    need.map((e) => api<PriceObservation[]>(request, `/entries/${encodeURIComponent(e.id)}/prices`, { anonymous }).catch(() => null)),
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
  const isPrivate = visibilityOf(list) === "private";
  // SPEC 11.2: a private list is served only to signed-in writers. The API already returns
  // not_found to everyone else; this is a second line of defence, and it 404s exactly like
  // a list that does not exist.
  if (isPrivate && !isWriter) throw new Response("Not found", { status: 404 });

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
  const [{ comments, cursor: commentsCursor }, prices] = await Promise.all([
    orFallback(loadComments(request, id), { comments: [] as Comment[], cursor: null as string | null }, "/l/:id"),
    formatInfo(list).format === "shopping"
      ? orFallback(loadPrices(request, id, items, isPrivate), {} as Record<string, PriceObservation[]>, "/l/:id")
      : Promise.resolve({} as Record<string, PriceObservation[]>),
  ]);
  // Only listed entries' histories reach the page.
  for (const key of Object.keys(prices)) if (!listedIds.has(key)) delete prices[key];

  const { items: _drop, ...summary } = list;
  const signedIn = Boolean(getSessionToken(request));
  // Just kept from a claim link: one line, once (the cookie is cleared with this response).
  const kept = role === "owner" ? readKept(request) : null;
  const keptHere = kept?.listId === list.id ? kept : null;
  const [handoff, accessList] = await Promise.all([
    role === "owner" ? orFallback(handoffFor(request, list), null, "/l/:id") : Promise.resolve(null),
    // Who can write it, for writers (older API builds don't have it: the header shows only the counts).
    isWriter ? apiOptional<ListAccess>(request, `/lists/${encodeURIComponent(id)}/access`).catch(() => null) : Promise.resolve(null),
  ]);
  return data(
    {
      list: summary,
      items,
      suggestions,
      comments,
      commentsCursor,
      prices,
      isWriter,
      role,
      origin: siteOrigin(request),
      isPrivate,
      handoff,
      accessList,
      kept: keptHere,
      // Only this list's theme is sent to the page: custom properties and motif, no theme code.
      // No theme picked: the format's default (Checklist for tasks, Doc for research).
      // A stored `default` (the retired Cards), an occasion alone or anything unknown resolves to the format's layout.
      theme: getThemeView(summary.theme ?? formatInfo(summary).defaultTheme, formatOf(summary)),
    },
    {
      headers: {
        // Anything a signed-in person sees may be private or personalised: never stored.
        // Public pages may be cached briefly by browsers, but shared caches must revalidate,
        // so a list switched to private stops being served at once.
        "Cache-Control": signedIn || isPrivate ? "private, no-store" : "public, max-age=30, s-maxage=0, must-revalidate",
        Vary: "Cookie",
        ...(keptHere ? { "Set-Cookie": clearKeptCookie(request) } : {}),
        ...(isPrivate ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
      },
    },
  );
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function action({ request, params }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") === "dismiss-handoff") {
    assertSameOrigin(request);
    throw redirect(`/l/${encodeURIComponent(params.id)}`, { headers: { "Set-Cookie": dismissHandoffCookie(request, params.id) } });
  }
  return handleWriterIntent(request, form, params.id);
}

/** Has any agent done anything on these items: added one, claimed one, posted, or left a note? */
function agentActive(items: ListDetail["items"]): boolean {
  return items.some(
    (it) => it.created_by.kind === "agent" || it.claimed_by?.kind === "agent" || !!it.status_note || it.entries.some((e) => e.author.kind === "agent"),
  );
}

/**
 * "Give this list to your agent" (the owner's next step): until an agent connects to the list or writes on it, or the
 * owner dismisses it. Opened from /app/new with ?new=1, which also moves focus to it.
 */
async function handoffFor(request: Request, list: ListDetail): Promise<{ focus: boolean; connectedName: string | null } | null> {
  if (dismissedHandoffs(request).includes(list.id)) return null;
  if (agentActive(list.items)) return null;
  // Any agent that can write the list (anyone's), from the API's counts.
  if ((list.access?.agents ?? 0) > 0) return null;
  const agents = await api<AgentInfo[]>(request, "/me/agents").catch(() => [] as AgentInfo[]);
  if (agents.some((a) => a.list_ids.includes(list.id))) return null;
  const oauth = agents.find((a) => a.kind === "oauth");
  return { focus: new URL(request.url).searchParams.get("new") === "1", connectedName: oauth?.name ?? null };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "List not found · The Want MCP" }, { name: "robots", content: "noindex" }];
  const { list, items, origin } = loaderData;
  if (loaderData.isPrivate) {
    // Private: a title for the owner's tab, nothing for crawlers or link previews.
    return [
      { title: `${list.title} · private list · The Want MCP` },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:image", content: `${origin}/og.png` },
    ];
  }
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
  // Designed share card; ?v changes whenever the list does, so caches never serve a stale card.
  const ogImage = `${origin}/og/l/${encodeURIComponent(list.id)}.png?v=${Date.parse(list.updated_at) || 0}`;

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
    { property: "og:image", content: ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: `${list.title}, a want list by ${list.owner_handle}` },
    { name: "twitter:card", content: "summary_large_image" },
    ...(items.length === 0 ? [{ name: "robots", content: "noindex" }] : []),
    { "script:ld+json": ld },
  ];
}

export default function ListPage({ loaderData }: Route.ComponentProps) {
  return <ListView {...loaderData} />;
}

/** Page views are counted on public lists only; a private list never loads the beacon. */
export const handle = {
  analytics: (data: unknown) => (data as { list?: { visibility?: string } } | null)?.list?.visibility === "public",
};
