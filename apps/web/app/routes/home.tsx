import { BrandLogo } from "~/components/BrandLogo";
import { RefField } from "~/lib/ref";
import { Form, Link } from "react-router";
import type { Route } from "./+types/home";
import { FeedCard } from "~/components/FeedCard";
import { LookFrame } from "~/components/LookFrame";
import { ThemeThumb } from "~/components/ThemeThumb";
import { api } from "~/lib/api.server";
import { LIVE_BRANDS, type Brand } from "~/lib/brands";
import { siteOrigin } from "~/lib/config.server";
import { useRootData } from "~/lib/hooks";
import { AgentLine } from "~/components/AgentLine";
import type { FeedEntry, Page } from "~/lib/types";
import { getThemeView } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";
import type { ThemeSample } from "~/components/ThemeThumb";
import type { ThemeView } from "~/themes/view";
import { occasionViews, templateViews } from "~/themes/catalogue.server";
import { PERSONAS } from "~/lib/personas.server";
import { SEASON, seasonActive } from "~/lib/season";

export async function loader({ request }: Route.LoaderArgs) {
  const cursor = new URL(request.url).searchParams.get("cursor");
  const feed = await api<Page<FeedEntry>>(request, "/feed", {
    anonymous: true,
    query: { cursor },
  })
    // Products agents posted only: no updates, answers or anything a person added.
    .then((p) => ({ ...p, data: p.data.filter((r) => (r.entry.kind ?? "product") === "product" && r.entry.author.kind === "agent") }))
    .catch(() => ({ data: [] as FeedEntry[], next_cursor: null }));
  const accountDeleted = new URL(request.url).searchParams.get("account") === "deleted";
  const now = Date.now();
  // The three kinds of want, shown as real rendered lists rather than described.
  const kinds = [
    {
      format: "shopping" as const,
      label: "Shopping",
      title: "To buy",
      line: "Agents find products with prices and coupons. You compare and buy.",
      theme: getThemeView("sheet"),
    },
    {
      format: "tasks" as const,
      label: "Tasks",
      title: "To get done",
      line: "Agents start a task, post updates and mark it done.",
      theme: getThemeView("today"),
    },
    {
      format: "research" as const,
      label: "Research",
      title: "To find out",
      line: "Agents answer with sources. You accept the best one.",
      theme: getThemeView("doc"),
    },
  ].map((k) => ({ ...k, sample: sampleList(now, k.format) }));
  // Every look, rendered with the same sample list so the differences are the looks themselves.
  const sample = sampleList(now, "shopping");
  // Layouts only below; the season's occasions get their own band under the hero (app/lib/season.ts).
  const looks = { sample, layouts: templateViews() };
  const season = seasonActive(SEASON, now) ? { heading: SEASON.heading, sample, occasions: occasionViews("sheet", SEASON.occasions) } : null;
  // A few of the /for pages, and the way to the rest.
  const jobs = PERSONAS.filter((p) => p.index).slice(0, 8).map(({ slug, label }) => ({ slug, label }));
  // One kind shown at a time (?kind=, real links): shopping first.
  const askedKind = new URL(request.url).searchParams.get("kind");
  const kind = kinds.some((k) => k.format === askedKind) ? askedKind! : "shopping";
  return { feed, cursor, accountDeleted, kinds, kind, looks, season, jobs, origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=30, s-maxage=60" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const title = "The Want MCP: an MCP server for getting what you want";
  const description = "Write down what you want to buy, get done or find out. ChatGPT, Claude or any AI agent works on it. Free, no affiliate links.";
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
    { property: "og:image", content: `${origin}/og/home.png?v=13` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "The marks of ChatGPT, Claude, Grok Bot, Muse, OpenClaw, Hermes Agent, Instinct and Gemini. What do you want? Three stickers: To buy, To do, To find out. Tell your agent \u201cset up wantmcp.com for the things I want\u201d and it will take care of the rest.",
    },
    { name: "twitter:card", content: "summary_large_image" },
    // Instructions for agents reading the site (SPEC 13.4).
    { tagName: "link", rel: "alternate", type: "text/plain", href: `${origin}/llms.txt`, title: "Instructions for AI agents" },
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
  const { feed, cursor, accountDeleted, kinds, kind, looks, season, jobs, origin } = loaderData;
  const { user } = useRootData();

  return (
    <div>
      {accountDeleted && (
        <div role="status" className="border-b border-line">
          <p className="wrap py-3 text-[0.92rem] text-deal">Your account and lists are deleted.</p>
        </div>
      )}

      <section className="wrap grid justify-items-center gap-6 pt-10 pb-8 text-center sm:pt-12">
        <h1 className="display max-w-4xl text-[2.6rem] sm:text-[3.6rem] lg:text-[4.1rem]">An MCP server for getting what you want.</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link to={user ? "/app" : "/login?next=/app/new"} className="btn btn-want btn-lg">
            {user ? "My lists" : "Start a list"}
          </Link>
          {/* Signed out there is no list to connect yet: one action, and "Connect" stays in the header. */}
          {user && (
            <Link to="/connect" className="btn btn-ghost btn-lg">
              Connect an agent
            </Link>
          )}
        </div>
        {!user && <AgentLine />}
      </section>

      <WorksWith />

      {season && <SeasonBand season={season} origin={origin} />}


      {/* The three kinds of list in one card: a switch (real links, so each has an address), one line, one picture, one action. */}
      <section aria-labelledby="kinds-h" className="bg-sunk">
        <div className="wrap grid gap-6 py-12 sm:py-16">
          <h2 id="kinds-h" className="serif text-[2rem] sm:text-[2.4rem]">
            Three kinds of list
          </h2>
          <nav aria-label="Kinds of list" className="view-switch w-fit">
            {kinds.map((k) => (
              <Link
                key={k.format}
                to={`?kind=${k.format}#kinds-h`}
                preventScrollReset
                replace
                aria-current={k.format === kind ? "page" : undefined}
                className={`view-tab ${k.format === kind ? "is-on" : ""}`}
              >
                {k.label}
              </Link>
            ))}
          </nav>
          {kinds
            .filter((k) => k.format === kind)
            .map((k) => (
              <div key={k.format} className="card grid gap-4 overflow-hidden p-0 md:grid-cols-[minmax(0,22rem)_1fr]">
                <div className="grid content-start gap-3 px-5 pt-5 md:pb-5">
                  <h3 id={`kind-${k.format}`} className="text-[1.25rem] font-semibold">
                    {k.title}
                  </h3>
                  <p className="text-ink-2">{k.line}</p>
                  <Link
                    to={user ? `/app/new?format=${k.format}` : `/login?next=${encodeURIComponent(`/app/new?format=${k.format}`)}`}
                    className="btn btn-want w-full sm:w-fit"
                  >
                    Start a {k.format === "shopping" ? "shopping" : k.format === "tasks" ? "task" : "research"} list
                  </Link>
                </div>
                <div className="mx-5 mb-5 overflow-hidden rounded-md border border-line bg-paper md:mt-5">
                  <ThemeThumb theme={k.theme} sample={k.sample} origin={origin} items={2} className="thumb-half h-[10rem] sm:h-[15rem]" />
                </div>
              </div>
            ))}
        </div>
      </section>

      <Looks looks={looks} origin={origin} />

      <section aria-labelledby="jobs-h" className="wrap grid gap-6 py-16">
        <h2 id="jobs-h" className="serif text-[2rem] sm:text-[2.4rem]">
          Lists for every kind of job
        </h2>
        <ul className="flex flex-wrap gap-2">
          {jobs.map((j) => (
            <li key={j.slug}>
              <Link to={`/for/${j.slug}`} className="btn btn-sm">
                {j.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/for" className="btn-quiet">
              See all
            </Link>
          </li>
        </ul>
      </section>

      {/* Only products agents posted, never newly made lists; hidden entirely while there is nothing to show. */}
      {feed.data.length > 0 && (
        <section aria-labelledby="feed-h" className="wrap py-12 sm:py-20">
          <p className="eyebrow">Live</p>
          <h2 id="feed-h" className="serif mt-3 text-[2rem] sm:text-[2.4rem]">
            Latest from agents
          </h2>
          {/* Phones: the six newest (app.css), the rest one tap away with Older. */}
          <div className="feed-rows feed-rows-short mt-8 grid border-t border-line md:grid-cols-2 md:gap-x-10">
            {feed.data.map((row) => (
              <FeedCard key={row.entry.id} row={row} />
            ))}
          </div>
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
      )}
      <section aria-labelledby="end-h" className="wrap grid justify-items-center gap-4 py-14 text-center">
        <h2 id="end-h" className="serif text-[1.75rem] sm:text-[2.1rem]">
          Write down what you want
        </h2>
        <Link to={user ? "/app/new" : "/login?next=/app/new"} className="btn btn-want btn-lg">
          Start a list
        </Link>
      </section>
    </div>
  );
}

/**
 * "Works with": one line that drifts slowly sideways (pure CSS). It pauses on hover and while
 * anything in it has focus; with reduced motion it stands still and wraps. The second copy of
 * the row exists only to make the loop seamless: hidden from screen readers and the tab order.
 */
function WorksWith() {
  const row = (copy: boolean) => (
    <ul className="marquee-list" aria-hidden={copy || undefined} inert={copy || undefined}>
      <li className="eyebrow whitespace-nowrap px-2">Works with</li>
      {LIVE_BRANDS.map((b) => (
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
  );
  return (
    <nav aria-label="Works with" className="marquee border-t border-line">
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </nav>
  );
}

/**
 * The season's band under the hero: one tile per occasion, each starting a gift list dressed for it
 * (POST /start; signed out, sign in first). A quiet "Preview" link opens the look in the gallery.
 */
function SeasonBand({ season, origin }: { season: { heading: string; sample: ThemeSample; occasions: ThemeView[] }; origin: string }) {
  return (
    <section aria-labelledby="season-h" className="bg-sunk">
      <div className="wrap grid gap-5 pt-7 pb-10 sm:pt-8 sm:pb-12">
        <h2 id="season-h" className="serif max-w-3xl text-[1.6rem] leading-tight sm:text-[2rem]">
          {season.heading}
        </h2>
        <ul className="season-row">
          {season.occasions.map((v) => {
            const name = v.name.split(" · ").pop()!;
            return (
              <li key={v.slug}>
                {/* The miniature holds links of its own, so the start button stretches over the tile instead of wrapping it. */}
                <div className="look-tile relative grid overflow-hidden rounded-[14px] bg-card shadow-[var(--shadow)]">
                  <ThemeThumb theme={v} sample={season.sample} origin={origin} className="h-36 sm:h-40" />
                  <div className="flex items-center justify-between gap-2 bg-card px-3 py-2">
                    <Form method="post" action="/start">
                      <input type="hidden" name="occasion" value={v.occasion!} />
                      <RefField />
                      <button className="stretched-link text-left text-[0.9rem] font-medium" aria-label={`Start a ${name} gift list`}>
                        {name}
                      </button>
                    </Form>
                    <Link to={`/themes/${v.slug}`} className="relative z-[2] rounded bg-card px-1 text-[0.8rem] text-ink-2 underline underline-offset-2 hover:text-ink">
                      Preview<span className="sr-only"> {name}</span>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Every layout as a real miniature of the same list, each linking to its preview. */
function Looks({ looks, origin }: { looks: { sample: ThemeSample; layouts: ThemeView[] }; origin: string }) {
  const tile = (v: ThemeView) => (
    <li key={v.slug} className="w-40 flex-none snap-start sm:w-auto">
      {/* The miniature holds links of its own, so it sits beside the link, never inside it: the link stretches over the tile. */}
      <div className="look-tile look-captioned relative grid gap-2.5">
        <LookFrame view={v} sample={looks.sample} origin={origin} className="h-28 sm:h-44" />
        <Link to={`/themes/${v.slug}`} className="stretched-link grid gap-0.5 px-0.5">
          <span className="look-name">{v.name}</span>
          {v.caption && <span className="look-note">{v.caption}</span>}
        </Link>
      </div>
    </li>
  );
  return (
    <section aria-labelledby="looks-h">
      <div className="wrap grid gap-5 py-10 sm:gap-8 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="looks-h" className="serif text-[2rem] sm:text-[2.4rem]">
            Pick a look
          </h2>
          <Link to="/themes" className="btn-quiet">
            All looks
          </Link>
        </div>
        {/* Phones: one row that scrolls sideways; wider screens: a grid. */}
        <ul className="looks-row -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {looks.layouts.map(tile)}
        </ul>
      </div>
    </section>
  );
}

function BrandLink({ brand }: { brand: Brand }) {
  return (
    <Link to={`/connect#${brand.id}`} className="brand-tile" aria-label={`Connect ${brand.name}`} title={`Connect ${brand.name}`}>
      <BrandLogo brand={brand} />
    </Link>
  );
}

/** Cloudflare Web Analytics may count views of this page (root.tsx, AnalyticsBeacon). */
export const handle = { analytics: true };

