import { Link } from "react-router";
import type { Route } from "./+types/themes";
import { ListView } from "~/components/ListView";
import { ThemeThumb, type ThemeSample } from "~/components/ThemeThumb";
import { siteOrigin } from "~/lib/config.server";
import { getThemeView, lookSlug, occasionViews, resolveLook, templateViews } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";
import type { ThemeView } from "~/themes/view";

/**
 * The look gallery: pick a template (how a list is laid out) and an occasion (how it is dressed),
 * see the result, and link to it. ?template=board&occasion=christmas; every combination also has
 * its own full preview at /themes/{slug}.
 */
export function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams;
  const template = resolveLook(q.get("template") ?? "default").template.slug;
  const occasion = q.get("occasion") ? (resolveLook(q.get("occasion")).occasion?.slug ?? null) : null;
  const slug = lookSlug(template, occasion);
  const chosen = getThemeView(slug);
  const now = Date.now();
  const samples = { shopping: sampleList(now, "shopping"), tasks: sampleList(now, "tasks"), research: sampleList(now, "research") };
  return { templates: templateViews(), occasions: occasionViews(template), chosen, template, occasion, samples, origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const description = "Every look a list can have: a template for how it's laid out, from cards to a board, and an occasion to dress it, from Black Friday to birthdays.";
  return [
    { title: "Themes · The Want MCP" },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/themes` },
    ...(location.search ? [{ name: "robots", content: "noindex, follow" }] : []),
    { property: "og:title", content: "List themes" },
    { property: "og:description", content: description },
    { property: "og:image", content: `${origin}/og/home.png?v=4` },
  ];
}

export function Swatch({ theme }: { theme: ThemeView }) {
  const s = theme.swatch;
  return (
    <span className="inline-flex overflow-hidden rounded-full border border-line" aria-hidden="true">
      {[s.paper, s.card, s.ink, s.want, s.darkPaper, s.darkWant].map((c, i) => (
        <span key={i} className="h-4 w-4" style={{ background: c }} />
      ))}
    </span>
  );
}

function Choice({ to, current, view, sample, origin, label, note }: { to: string; current: boolean; view: ThemeView; sample: ThemeSample; origin: string; label: string; note?: string }) {
  return (
    <li>
      <Link
        to={to}
        preventScrollReset
        replace
        aria-current={current ? "true" : undefined}
        className={`grid overflow-hidden rounded-xl border-2 bg-card ${current ? "border-want" : "border-line hover:border-line-strong"}`}
      >
        <ThemeThumb theme={view} sample={sample} origin={origin} className="h-28 border-b border-line" />
        <span className="grid gap-0.5 p-2.5">
          <span className="font-semibold leading-tight">{label}</span>
          {note && <span className="text-[0.75rem] text-ink-3">{note}</span>}
        </span>
      </Link>
    </li>
  );
}

export default function Themes({ loaderData }: Route.ComponentProps) {
  const { templates, occasions, chosen, template, occasion, samples, origin } = loaderData;
  const sample = samples[chosen.natural];
  const q = (t: string, o: string | null) => `?template=${t}${o ? `&occasion=${o}` : ""}`;
  return (
    <div className="wrap grid gap-10 py-10">
      <header className="max-w-3xl">
        <p className="eyebrow">Themes</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Lay it out. Dress it up.</h1>
        <p className="mt-3 text-[1.05rem] text-ink-2">Pick a template, then an occasion. Any pair works.</p>
      </header>

      <section aria-labelledby="tpl-h" className="grid gap-3">
        <h2 id="tpl-h" className="text-2xl font-extrabold">
          Template
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {templates.map((t) => (
            <Choice
              key={t.slug}
              to={q(t.template, occasion)}
              current={t.template === template}
              view={t}
              sample={samples[t.natural]}
              origin={origin}
              label={t.name}
              note={t.scheme === "dark" ? "Always dark" : undefined}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="occ-h" className="grid gap-3">
        <h2 id="occ-h" className="text-2xl font-extrabold">
          Occasion
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <li>
            <Link
              to={q(template, null)}
              preventScrollReset
              replace
              aria-current={occasion === null ? "true" : undefined}
              className={`grid h-full min-h-[9.5rem] place-items-center rounded-xl border-2 bg-card p-3 font-semibold ${occasion === null ? "border-want" : "border-line hover:border-line-strong"}`}
            >
              None
            </Link>
          </li>
          {occasions.map((o) => (
            <Choice
              key={o.slug}
              to={q(template, o.occasion)}
              current={o.occasion === occasion}
              view={o}
              sample={samples[o.natural]}
              origin={origin}
              label={o.name.split(" · ").pop()!}
              note={o.scheme === "dark" ? "Always dark" : undefined}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="preview-h" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="preview-h" className="text-2xl font-extrabold">
            {chosen.name}
          </h2>
          <div className="flex items-center gap-3">
            <Swatch theme={chosen} />
            <Link to={`/themes/${chosen.slug}`} className="btn btn-want">
              Open the full preview
            </Link>
          </div>
        </div>
        <p className="text-[0.92rem] text-ink-2">{chosen.idea}</p>
        <div className="overflow-hidden rounded-2xl border border-line" aria-hidden="true" inert>
          <div className="max-h-[34rem] overflow-hidden">
            <ListView
              list={sample.list}
              items={sample.items}
              suggestions={[]}
              comments={[]}
              commentsCursor={null}
              prices={sample.prices}
              isWriter={false}
              role={null}
              origin={origin}
              theme={chosen}
              preview
              previewItems={chosen.layout === "board" || chosen.layout === "heat" || chosen.layout === "sections" ? 4 : 1}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
