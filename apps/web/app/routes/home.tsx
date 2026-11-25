import { Link } from "react-router";
import type { Route } from "./+types/home";
import { CopyButton } from "~/components/CopyButton";
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
    { label: "To buy", format: "shopping" as const, theme: getThemeView("sheet") },
    { label: "To get done", format: "tasks" as const, theme: getThemeView("board") },
    { label: "To find out", format: "research" as const, theme: getThemeView("doc") },
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
    "An MCP server for getting what you want. Write down something to buy, something to get done or something to find out, and ChatGPT, Claude, Codex or any MCP agent works on it. Free, no affiliate links.";
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
    { property: "og:image:alt", content: "The Want MCP: an MCP server for getting what you want." },
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
  const { mcpUrl, user } = useRootData();
  const shortUrl = mcpUrl.replace(/^https:\/\//, "");

  return (
    <div>
      {accountDeleted && (
        <div role="status" className="border-b border-line bg-deal-soft">
          <p className="wrap py-3 text-[0.92rem] text-deal">Your account and its lists have been deleted.</p>
        </div>
      )}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-want-soft blur-3xl" />
        <div className="wrap relative grid gap-8 py-12 sm:py-16">
          <div className="grid max-w-4xl gap-5">
            <h1 className="text-[2.3rem] font-extrabold leading-[1] tracking-[-0.03em] sm:text-[3.8rem]">
              AN MCP SERVER FOR <span className="text-want">GETTING WHAT YOU WANT</span>
            </h1>
            <p className="text-[1.15rem] text-ink-2">Your agents buy, do and find out what you want.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to={user ? "/app" : "/login"} className="btn btn-want btn-lg">
                {user ? "My lists" : "Start a list"}
              </Link>
              <span className="inline-flex min-h-[var(--ctl-lg)] items-center gap-2 rounded-full border border-line-strong bg-card py-1 pl-4 pr-1">
                <code className="text-[0.9rem] font-semibold">{shortUrl}</code>
                <CopyButton text={mcpUrl} label="Copy" ariaLabel="Copy the MCP server address" className="btn btn-sm" />
              </span>
            </div>
          </div>
          <WorksWith />
        </div>
      </section>

      <section aria-labelledby="kinds-h" className="wrap py-12">
        <h2 id="kinds-h" className="sr-only">
          Three kinds of list
        </h2>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
          {kinds.map((k) => (
            <li key={k.format} className="w-[78%] shrink-0 snap-start md:w-auto">
              <Link to={`/themes/${k.theme.slug}?format=${k.format}`} className="group grid gap-3 rounded-2xl">
                <span className="block overflow-hidden rounded-2xl border border-line shadow-[var(--shadow)] transition group-hover:border-line-strong">
                  <ThemeThumb theme={k.theme} sample={k.sample} origin={origin} className="h-56" />
                </span>
                <span className="text-xl font-extrabold">{k.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-h" className="wrap pb-12">
        <h2 id="how-h" className="sr-only">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(([label, icon], i) => (
            <li key={label} className="card flex items-center gap-4 p-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-want-soft text-want" aria-hidden="true">
                {icon}
              </span>
              <span className="text-lg font-bold">
                <span className="sr-only">{i + 1}. </span>
                {label}
              </span>
            </li>
          ))}
        </ol>
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
          <div className="mt-6 grid gap-4 rounded-2xl border border-dashed border-line-strong p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <p className="font-display text-xl font-bold">The first finds will appear here.</p>
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
              Older finds
            </Link>
          )}
        </div>
      </section>
      <p className="wrap pb-6 text-[0.78rem] text-ink-3">Logos are trademarks of their owners. The Want MCP is not affiliated with them.</p>
    </div>
  );
}

const icon = (d: string) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/** How it works, as pictograms: at most four words each. */
const STEPS: Array<[string, React.ReactNode]> = [
  ["Write a want", icon("M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4")],
  ["Connect an agent", icon("M9 7V3m6 4V3M7 7h10v4a5 5 0 01-10 0V7zm5 9v5")],
  ["See what it found", icon("M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16 16l5 5M7.5 10.5l2 2 4-4")],
];

/** "Works with": each client's mark, linking to its setup. */
function WorksWith() {
  return (
    <nav aria-labelledby="works-h" className="grid gap-3">
      <h2 id="works-h" className="eyebrow">
        Works with
      </h2>
      <ul className="flex flex-wrap gap-2">
        {BRANDS.map((b) => (
          <li key={b.id}>
            <BrandLink brand={b} />
          </li>
        ))}
        <li>
          <Link to="/connect#other" className="brand-tile" aria-label="Any MCP agent: set up" title="Any MCP agent">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 7V3m6 4V3M7 7h10v4a5 5 0 01-10 0V7zm5 9v5" />
            </svg>
            <span className="text-[0.85rem] font-semibold">Any MCP agent</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function BrandLink({ brand }: { brand: Brand }) {
  const l = brand.logo;
  return (
    <Link to={`/connect#${brand.id}`} className="brand-tile" aria-label={`${brand.name}: set up`} title={brand.name}>
      {l ? (
        <>
          <img src={l.light} alt="" width={l.width} height={l.height} className={`brand-logo ${l.nameBeside ? "brand-mark" : ""} ${l.dark ? "brand-logo-light" : ""}`} decoding="async" />
          {l.dark && <img src={l.dark} alt="" width={l.width} height={l.height} className={`brand-logo brand-logo-dark ${l.nameBeside ? "brand-mark" : ""}`} decoding="async" />}
          {/* A company mark or symbol doesn't spell the product's name, so it is set beside it in our type. */}
          {l.nameBeside && <span className="text-[0.95rem] font-bold">{brand.name}</span>}
        </>
      ) : (
        <span className="text-[0.95rem] font-bold">{brand.name}</span>
      )}
    </Link>
  );
}
