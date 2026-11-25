import { data } from "react-router";
import type { Route } from "./+types/list";
import { ListView, type ItemWithEntries } from "~/components/ListView";
import { api, apiOptional, toRouteError } from "~/lib/api.server";
import { siteOrigin } from "~/lib/config.server";
import { clip, plural } from "~/lib/format";
import { handleWriterIntent } from "~/lib/intents.server";
import { getSessionToken } from "~/lib/session.server";
import type { Comment, Entry, Item, ListDetail, ListPrices, Page, PriceObservation } from "~/lib/types";
import { getThemeView } from "~/themes/catalogue.server";
import { formatInfo, visibilityOf } from "~/lib/formats";

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
  const [{ comments, cursor: commentsCursor }, prices] = await Promise.all([loadComments(request, id), formatInfo(list).format === "shopping" ? loadPrices(request, id, items, isPrivate) : Promise.resolve({} as Record<string, PriceObservation[]>)]);
  // Only listed entries' histories reach the page.
  for (const key of Object.keys(prices)) if (!listedIds.has(key)) delete prices[key];

  const { items: _drop, ...summary } = list;
  const signedIn = Boolean(getSessionToken(request));
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
      // Only this list's theme is sent to the page: custom properties and motif, no theme code.
      // No theme picked: the format's default (Checklist for tasks, Doc for research).
      theme: getThemeView(summary.theme ?? formatInfo(summary).defaultTheme),
    },
    {
      headers: {
        // Anything a signed-in person sees may be private or personalised: never stored.
        // Public pages may be cached briefly by browsers, but shared caches must revalidate,
        // so a list switched to private stops being served at once.
        "Cache-Control": signedIn || isPrivate ? "private, no-store" : "public, max-age=30, s-maxage=0, must-revalidate",
        Vary: "Cookie",
        ...(isPrivate ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
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
