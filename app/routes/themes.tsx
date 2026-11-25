import { Link } from "react-router";
import type { Route } from "./+types/themes";
import { ListView } from "~/components/ListView";
import { siteOrigin } from "~/lib/config.server";
import { allThemeViews } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";
import type { ThemeView } from "~/themes/view";

export function loader({ request }: Route.LoaderArgs) {
  return { themes: allThemeViews(), sample: sampleList(), origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const description = "Every look a want list can have: occasion themes from Black Friday to birthdays, and workspace styles from Doc to Sheet.";
  return [
    { title: "Themes · The Want MCP" },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/themes` },
    { property: "og:title", content: "Want list themes" },
    { property: "og:description", content: description },
    { property: "og:image", content: `${origin}/og/home.png?v=3` },
  ];
}

export function Swatch({ theme }: { theme: ThemeView }) {
  const s = theme.swatch;
  return (
    <span className="inline-flex overflow-hidden rounded-full border border-line" aria-hidden="true">
      {[s.paper, s.card, s.ink, s.want, s.darkPaper, s.darkWant].map((c, i) => (
        <span key={i} className="h-5 w-5" style={{ background: c }} />
      ))}
    </span>
  );
}

function Tile({ theme, sample, origin }: { theme: ThemeView; sample: ReturnType<typeof sampleList>; origin: string }) {
  return (
    <article className="card grid overflow-hidden p-0" aria-labelledby={`th-${theme.slug}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 id={`th-${theme.slug}`} className="text-xl font-extrabold">
            {theme.name}
          </h3>
          <p className="mt-1 max-w-xl text-[0.92rem] text-ink-2">{theme.idea}</p>
          <p className="mt-2 text-[0.78rem] text-ink-3">
            Slug <code>{theme.slug}</code>
            {theme.layout !== "grid" && <> · layout: {theme.layout}</>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Swatch theme={theme} />
          <Link to={`/themes/${theme.slug}`} className="btn btn-sm">
            Full preview<span className="sr-only"> of {theme.name}</span>
          </Link>
        </div>
      </div>
      {/* A visual sample; the full preview page carries the accessible version. */}
      <div className="relative max-h-[30rem] overflow-hidden border-t border-line" aria-hidden="true" inert>
        <ListView
          list={sample.list}
          items={sample.items}
          suggestions={[]}
          comments={sample.comments}
          commentsCursor={null}
          prices={sample.prices}
          isWriter={false}
          role={null}
          origin={origin}
          theme={theme}
          preview
          previewItems={theme.layout === "board" ? 3 : 1}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
      </div>
    </article>
  );
}

export default function Themes({ loaderData }: Route.ComponentProps) {
  const { themes, sample, origin } = loaderData;
  const groups: Array<[string, string, ThemeView[]]> = [
    ["occasions", "Occasions", themes.filter((t) => t.group !== "workspace")],
    ["workspace", "Workspace styles", themes.filter((t) => t.group === "workspace")],
  ];
  return (
    <div className="wrap grid gap-10 py-10">
      <header className="max-w-3xl">
        <p className="eyebrow">Themes</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Make a list look like its occasion</h1>
        <p className="mt-4 text-[1.05rem] text-ink-2">
          Every list can wear a theme: dress it for the occasion it's for, or in the style of the tools you already work in. Everyone who opens
          the list sees it, in their own light or dark mode. Below, every theme is applied to the same sample list.
        </p>
        <p className="mt-3 text-[0.92rem] text-ink-3">
          List owners choose a theme in <Link to="/app" className="link">list settings</Link>.
        </p>
        <nav aria-label="Theme groups" className="mt-5 flex flex-wrap gap-2">
          {groups.map(([id, label, list]) => (
            <a key={id} href={`#${id}`} className="chip">
              {label} ({list.length})
            </a>
          ))}
        </nav>
      </header>
      {groups.map(([id, label, list]) => (
        <section key={id} id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-24 gap-5">
          <h2 id={`${id}-h`} className="text-3xl font-extrabold">
            {label}
          </h2>
          <div className="grid gap-6">
            {list.map((t) => (
              <Tile key={t.slug} theme={t} sample={sample} origin={origin} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
