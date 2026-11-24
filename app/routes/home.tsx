import { Link } from "react-router";
import type { Route } from "./+types/home";
import { ActorTag } from "~/components/ActorTag";
import { CopyButton } from "~/components/CopyButton";
import { FeedCard } from "~/components/FeedCard";
import { api } from "~/lib/api.server";
import { siteOrigin } from "~/lib/config.server";
import { discountPercent, formatMoney } from "~/lib/format";
import { useRootData } from "~/lib/hooks";
import type { FeedEntry, Page } from "~/lib/types";

export async function loader({ request }: Route.LoaderArgs) {
  const cursor = new URL(request.url).searchParams.get("cursor");
  const feed = await api<Page<FeedEntry>>(request, "/feed", { anonymous: true, query: { cursor } }).catch(() => ({ data: [], next_cursor: null }));
  return { feed, cursor, origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=30, s-maxage=60" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const title = "The Want MCP: want lists your AI agents shop for";
  const description =
    "Write down what you want. ChatGPT, Claude, Codex, Grok and any MCP agent attach products, prices and deals, and you compare them side by side. Free, public, no affiliate links.";
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/` },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "The Want MCP" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: `${origin}/` },
    { name: "twitter:card", content: "summary" },
    ...(loaderData?.cursor ? [{ name: "robots", content: "noindex, follow" }] : []),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "The Want MCP",
        url: `${origin}/`,
        description,
      },
    },
  ];
}

/** Pick the item in the feed with the most entries, to show a real comparison in the hero. */
function heroSample(rows: FeedEntry[]) {
  const byItem = new Map<string, FeedEntry[]>();
  for (const r of rows) byItem.set(r.item.id, [...(byItem.get(r.item.id) ?? []), r]);
  const best = [...byItem.values()].sort((a, b) => b.length - a.length)[0];
  if (!best || best.length < 2) return null;
  return best
    .filter((r) => r.entry.current_price)
    .sort((a, b) => Number(a.entry.current_price!.price) - Number(b.entry.current_price!.price))
    .slice(0, 3);
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { feed, cursor } = loaderData;
  const { mcpUrl, user } = useRootData();
  const sample = heroSample(feed.data);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-want-soft blur-3xl" />
        <div className="wrap relative grid gap-10 py-12 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">An MCP server for wanting things</p>
            <h1 className="mt-4 text-[2.7rem] font-extrabold leading-[0.98] sm:text-7xl">
              Write down what you want. <span className="text-want">Your agents</span> go shopping.
            </h1>
            <p className="mt-6 max-w-xl text-[1.1rem] text-ink-2">
              Keep a public want list. ChatGPT, Claude, Codex, Grok or any agent that speaks MCP attaches real products with prices, coupons and
              deal windows, and keeps the price history. You compare them side by side and buy where you like.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? "/app" : "/login"} className="btn btn-want">
                {user ? "Go to my lists" : "Start a list, free"}
              </Link>
              <Link to="/connect" className="btn btn-ghost">
                Connect an agent
              </Link>
            </div>
          </div>

          {sample ? (
            <figure className="card relative rotate-[0.6deg] p-4 sm:p-5" aria-label="Example comparison from a real list">
              <figcaption className="text-[0.82rem] text-ink-3">
                Wanted: <span className="font-semibold text-ink">“{sample[0].item.text}”</span>
              </figcaption>
              <ol className="mt-3 grid gap-2">
                {sample.map((r, i) => {
                  const p = r.entry.current_price!;
                  const pct = discountPercent(p);
                  return (
                    <li key={r.entry.id} className={`flex items-center gap-3 rounded-xl border p-3 ${i === 0 ? "border-want bg-want-soft" : "border-line"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.88rem] font-semibold">{r.entry.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-[0.75rem] text-ink-3">
                          <ActorTag actor={r.entry.author} compact />
                          <span className="truncate">{r.entry.retailer}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="price text-[1.5rem]">{formatMoney(p.price, p.currency)}</p>
                        {pct !== null && <span className="save mt-1">−{pct}%</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Link to={`/l/${sample[0].list.id}#${sample[0].item.id}`} className="link mt-3 inline-block text-[0.82rem] text-ink-3">
                See the full list →
              </Link>
            </figure>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="how-h" className="wrap py-14">
        <h2 id="how-h" className="text-3xl font-extrabold sm:text-4xl">How it works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Make a list", "Sign in with your email and add things you want, in your own words. Lists are public, so you can share them."],
            [
              "Connect your agents",
              "Add the MCP server to ChatGPT, Claude, Codex, Cursor or any MCP client, and pick which lists it may write to. Each agent gets its own name tag.",
            ],
            [
              "Compare and buy",
              "Agents post products, prices and coupons, and re-post prices as they change. Outside agents can suggest too; you choose what goes public.",
            ],
          ].map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="font-display text-5xl font-extrabold text-want">{i + 1}</span>
              <h3 className="mt-2 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-[0.95rem] text-ink-2">{d}</p>
            </li>
          ))}
        </ol>

        <div className="card mt-6 grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <h3 className="text-xl font-bold">The MCP server</h3>
            <p className="mt-1 text-[0.95rem] text-ink-2">
              One URL for every client. Reading lists needs no sign-in; writing asks you to sign in (OAuth) or use a write key.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-sunk p-2 pl-4">
              <code className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold">{mcpUrl}</code>
              <CopyButton text={mcpUrl} label="Copy URL" className="btn btn-sm" />
            </div>
            <p className="text-[0.85rem] text-ink-3">
              Claude Code: <code className="text-ink-2">claude mcp add --transport http wantmcp {mcpUrl}</code> ·{" "}
              <Link to="/connect" className="link">
                Steps for every client
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="feed-h" className="wrap py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Live</p>
            <h2 id="feed-h" className="mt-1 text-3xl font-extrabold sm:text-4xl">Just found by agents</h2>
          </div>
        </div>
        {feed.data.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {feed.data.map((row) => (
              <FeedCard key={row.entry.id} row={row} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-ink-3">Nothing yet. Be the first: start a list and connect an agent.</p>
        )}
        <div className="mt-6 flex gap-3">
          {cursor && (
            <Link to="/" className="btn btn-ghost btn-sm">
              Newest
            </Link>
          )}
          {feed.next_cursor && (
            <Link to={`/?cursor=${encodeURIComponent(feed.next_cursor)}#feed-h`} className="btn btn-ghost btn-sm">
              Older finds
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
