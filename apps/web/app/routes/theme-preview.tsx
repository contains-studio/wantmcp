import { Link, redirect } from "react-router";
import type { Route } from "./+types/theme-preview";
import { ListView } from "~/components/ListView";
import { siteOrigin } from "~/lib/config.server";
import { FORMATS, formatOf } from "~/lib/formats";
import type { ListFormat } from "~/lib/types";
import { getThemeView, parseLook } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";

export function loader({ request, params }: Route.LoaderArgs) {
  const look = parseLook(params.slug);
  if (!look) throw new Response("Not found", { status: 404 });
  // Old names (hanukkah, checklist) and spellings like default--christmas go to the canonical page.
  if (look.slug !== params.slug) throw redirect(`/themes/${look.slug}${new URL(request.url).search}`, 301);
  const theme = getThemeView(look.slug);
  const q = new URL(request.url).searchParams.get("format");
  const natural: ListFormat = theme.natural;
  const format = q ? formatOf({ format: q as ListFormat }) : natural;
  const sample = sampleList(Date.now(), format);
  // ?items=0 or ?items=1 previews an empty or one-item list.
  const n = new URL(request.url).searchParams.get("items");
  if (n !== null && /^\d+$/.test(n)) sample.items = sample.items.slice(0, Number(n));
  return { theme, sample, format, origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Theme not found · The Want MCP" }, { name: "robots", content: "noindex" }];
  return [
    { title: `${loaderData.theme.name} theme · The Want MCP` },
    { name: "description", content: loaderData.theme.idea },
    { tagName: "link", rel: "canonical", href: `${loaderData.origin}/themes/${loaderData.theme.slug}` },
  ];
}

export default function ThemePreview({ loaderData }: Route.ComponentProps) {
  const { theme, sample, format, origin } = loaderData;
  return (
    <div>
      <div className="wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-[0.9rem]">
        <Link to="/themes" className="link text-ink-3">
          ← All themes
        </Link>
        <span className="text-ink-2">
          Previewing <strong className="text-ink">{theme.name}</strong> on a sample list. {theme.idea}
        </span>
        <nav aria-label="Sample list format" className="flex gap-1">
          {Object.values(FORMATS).map((f) => (
            <Link
              key={f.format}
              to={`?format=${f.format}`}
              replace
              preventScrollReset
              aria-current={f.format === format ? "page" : undefined}
              className={`btn btn-sm ${f.format === format ? "" : "btn-ghost"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>
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
      />
    </div>
  );
}
