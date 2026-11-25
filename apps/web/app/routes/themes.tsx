import { Link } from "react-router";
import type { Route } from "./+types/themes";
import { ThemeThumb } from "~/components/ThemeThumb";
import { siteOrigin } from "~/lib/config.server";
import { allThemeViews } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";
import type { ThemeView } from "~/themes/view";

export function loader({ request }: Route.LoaderArgs) {
  const now = Date.now();
  const samples = { shopping: sampleList(now, "shopping"), tasks: sampleList(now, "tasks"), research: sampleList(now, "research") };
  return { themes: allThemeViews(), samples, origin: siteOrigin(request) };
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
    { property: "og:image", content: `${origin}/og/home.png?v=4` },
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

type Sample = ReturnType<typeof sampleList>;

function Tile({ theme, sample, origin }: { theme: ThemeView; sample: Sample; origin: string }) {
  return (
    <article className="card relative grid content-start overflow-hidden p-0" aria-labelledby={`th-${theme.slug}`}>
      <ThemeThumb theme={theme} sample={sample} origin={origin} className="h-64 border-b border-line" />
      <div className="grid gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 id={`th-${theme.slug}`} className="text-lg font-extrabold">
            <Link to={`/themes/${theme.slug}`} className="after:absolute after:inset-0">
              {theme.name}
            </Link>
          </h3>
          <Swatch theme={theme} />
        </div>
        <p className="text-[0.9rem] text-ink-2">{theme.idea}</p>
        <p className="text-[0.78rem] text-ink-3">
          Shown on a {theme.natural} list{theme.scheme === "dark" ? " · always dark" : " · light and dark"}
        </p>
      </div>
    </article>
  );
}

export default function Themes({ loaderData }: Route.ComponentProps) {
  const { themes, samples, origin } = loaderData;
  const groups: Array<[string, string, ThemeView[]]> = [
    ["workspace", "Workspace styles", themes.filter((t) => t.group !== "occasion")],
    ["occasions", "Occasions", themes.filter((t) => t.group === "occasion")],
  ];
  return (
    <div className="wrap grid gap-10 py-10">
      <header className="max-w-3xl">
        <p className="eyebrow">Themes</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Make a list look like its occasion</h1>
        <p className="mt-4 text-[1.05rem] text-ink-2">
          Every list can wear a theme: dress it for the occasion it's for, or in the style of the tools you already work in. Everyone who opens
          the list sees it, in their own light or dark mode. Each theme below is shown on a sample list of the kind it suits best; open one to try it with shopping, tasks or research.
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <Tile key={t.slug} theme={t} sample={samples[t.natural]} origin={origin} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
