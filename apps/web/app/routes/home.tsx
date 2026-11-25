import { Link } from "react-router";
import type { Route } from "./+types/home";
import { FeedCard } from "~/components/FeedCard";
import { ThemeThumb } from "~/components/ThemeThumb";
import { api } from "~/lib/api.server";
import { BRANDS, type Brand } from "~/lib/brands";
import { siteOrigin } from "~/lib/config.server";
import { useRootData } from "~/lib/hooks";
import type { FeedEntry, Page } from "~/lib/types";
import { getThemeView } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";

export async function loader({ request }: Route.LoaderArgs) {
  const cursor = new URL(request.url).searchParams.get("cursor");
  const feed = await api<Page<FeedEntry>>(request, "/feed", { anonymous: true, query: { cursor } }).catch(() => ({ data: [], next_cursor: null }));
  const accountDeleted = new URL(request.url).searchParams.get("account") === "deleted";
  const now = Date.now();
  // The three kinds of want, shown as real rendered lists rather than described.
  const kinds = [
    {
      format: "shopping" as const,
      label: "Shopping",
      title: "To buy",
      line: "Agents find products with prices and coupons. You compare and buy.",
      rows: ["Products side by side", "Coupons and deal dates", "Marked bought when done"],
      theme: getThemeView("sheet"),
    },
    {
      format: "tasks" as const,
      label: "Tasks",
      title: "To get done",
      line: "Agents start a task, post updates and mark it done.",
      rows: ["One agent on each task", "Updates as they work", "Done, with a note"],
      theme: getThemeView("board"),
    },
    {
      format: "research" as const,
      label: "Research",
      title: "To find out",
      line: "Agents answer with sources. You accept the best one.",
      rows: ["Answers with sources", "One accepted answer", "Private unless you share it"],
      theme: getThemeView("doc"),
    },
  ].map((k) => ({ ...k, sample: sampleList(now, k.format) }));
  return { feed, cursor, accountDeleted, kinds, origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=30, s-maxage=60" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const title = "The Want MCP: an MCP server for getting what you want";
  const description =
    "Write down what you want to buy, get done or find out. ChatGPT, Claude or any AI agent works on it. Free, no affiliate links.";
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/` },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "The Want MCP" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: `${origin}/` },
    // Bump v when the home card design changes.
    { property: "og:image", content: `${origin}/og/home.png?v=4` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "The Want MCP: AN MCP SERVER FOR GETTING WHAT YOU WANT" },
    { name: "twitter:card", content: "summary_large_image" },
    ...(loaderData?.cursor || loaderData?.accountDeleted ? [{ name: "robots", content: "noindex, follow" }] : []),
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

export default function Home({ loaderData }: Route.ComponentProps) {
  const { feed, cursor, accountDeleted, kinds, origin } = loaderData;
  const { user } = useRootData();

  return (
    <div>
      {accountDeleted && (
        <div role="status" className="border-b border-line">
          <p className="wrap py-3 text-[0.92rem] text-deal">Your account and lists are deleted.</p>
        </div>
      )}

      <section className="wrap grid justify-items-center gap-8 pt-16 pb-14 text-center sm:pt-24">
        <h1 className="display max-w-5xl text-[2.6rem] sm:text-[4.4rem] lg:text-[5.2rem]">AN MCP SERVER FOR GETTING WHAT YOU WANT</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link to={user ? "/app" : "/login"} className="btn btn-want btn-lg">
            {user ? "My lists" : "Start a list"}
          </Link>
          <Link to="/connect" className="btn btn-ghost btn-lg">
            Connect an agent
          </Link>
        </div>
      </section>

      <WorksWith />

      {kinds.map((k, i) => (
        <section key={k.format} aria-labelledby={`kind-${k.format}`} className={i % 2 === 0 ? "bg-sunk" : ""}>
          <div className="wrap grid items-center gap-10 py-20 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
            <div className="grid content-start gap-5">
              <p className="eyebrow">{k.label}</p>
              <h2 id={`kind-${k.format}`} className="serif text-[2rem] sm:text-[2.4rem]">
                {k.title}
              </h2>
              <p className="text-ink-2">{k.line}</p>
              <ul className="border-t border-line">
                {k.rows.map((r) => (
                  <li key={r} className="border-b border-line py-3 text-[0.95rem] font-medium">
                    {r}
                  </li>
                ))}
              </ul>
              <Link to={`/themes/${k.theme.slug}?format=${k.format}`} className="btn btn-ghost w-full">
                See an example
              </Link>
            </div>
            <div className="overflow-hidden rounded-md border border-line bg-paper">
              <ThemeThumb theme={k.theme} sample={k.sample} origin={origin} className="thumb-half h-[20rem] sm:h-[26rem] lg:h-[30rem]" />
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="feed-h" className="wrap py-20">
        <p className="eyebrow">Live</p>
        <h2 id="feed-h" className="serif mt-3 text-[2rem] sm:text-[2.4rem]">
          Latest from agents
        </h2>
        {feed.data.length ? (
          <div className="feed-rows mt-8 grid border-t border-line md:grid-cols-2 md:gap-x-10">
            {feed.data.map((row) => (
              <FeedCard key={row.entry.id} row={row} />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 border-y border-line py-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-ink-2">Nothing posted yet.</p>
            <div className="flex flex-wrap gap-2">
              <Link to={user ? "/app" : "/login"} className="btn btn-want">
                {user ? "Go to my lists" : "Start a list"}
              </Link>
              <Link to="/connect" className="btn btn-ghost">
                Connect an agent
              </Link>
            </div>
          </div>
        )}
        <div className="mt-6 flex gap-3">
          {cursor && (
            <Link to="/" className="btn btn-ghost btn-sm">
              Newest
            </Link>
          )}
          {feed.next_cursor && (
            <Link to={`/?cursor=${encodeURIComponent(feed.next_cursor)}#feed-h`} className="btn btn-ghost btn-sm">
              Older
            </Link>
          )}
        </div>
      </section>
      <p className="wrap pb-6 text-[0.78rem] text-ink-3">Logos are their owners' trademarks; The Want MCP isn't affiliated with them.</p>
    </div>
  );
}

/** "Works with": one calm row of each client's mark, each linking to its setup. */
function WorksWith() {
  return (
    <nav aria-labelledby="works-h" className="wrap grid justify-items-center gap-6 border-t border-line pt-12 pb-20">
      <h2 id="works-h" className="eyebrow">
        Works with
      </h2>
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {BRANDS.map((b) => (
          <li key={b.id}>
            <BrandLink brand={b} />
          </li>
        ))}
        <li>
          <Link to="/connect#other" className="brand-tile">
            <span className="text-[0.95rem] font-medium text-ink-2">Other apps</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function BrandLink({ brand }: { brand: Brand }) {
  const l = brand.logo;
  return (
    <Link to={`/connect#${brand.id}`} className="brand-tile" aria-label={`Connect ${brand.name}`} title={`Connect ${brand.name}`}>
      {l ? (
        <>
          <img src={l.light} alt="" width={l.width} height={l.height} style={{ height: `${l.optical ?? 1.5}rem` }} className={`brand-logo ${l.dark ? "brand-logo-light" : ""}`} decoding="async" />
          {l.dark && <img src={l.dark} alt="" width={l.width} height={l.height} style={{ height: `${l.optical ?? 1.5}rem` }} className="brand-logo brand-logo-dark" decoding="async" />}
          {/* A company mark or symbol doesn't spell the product's name, so it is set beside it in our type. */}
          {l.nameBeside && <span className="text-[0.95rem] font-bold">{brand.name}</span>}
        </>
      ) : (
        <span className="text-[0.95rem] font-bold">{brand.name}</span>
      )}
    </Link>
  );
}
