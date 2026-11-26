import { Link, redirect } from "react-router";
import { useRootData } from "~/lib/hooks";
import type { Route } from "./+types/theme-preview";
import { ListView } from "~/components/ListView";
import { siteOrigin } from "~/lib/config.server";
import { FORMATS, formatOf } from "~/lib/formats";
import type { ListFormat } from "~/lib/types";
import { getThemeView, isOffered, parseLook } from "~/themes/catalogue.server";
import { SEASON } from "~/lib/season";
import { sampleList } from "~/themes/sample.server";

export function loader({ request, params }: Route.LoaderArgs) {
  // The retired Cards layout: its page goes to the gallery; its occasion pages use Sheet.
  const slug = params.slug.toLowerCase();
  if (slug === "default") throw redirect("/themes", 301);
  if (slug.startsWith("default--")) throw redirect(`/themes/sheet--${slug.slice("default--".length)}${new URL(request.url).search}`, 301);
  const look = parseLook(params.slug);
  if (!look) throw new Response("Not found", { status: 404 });
  // Occasions out of season (not offered) go to the gallery.
  if (!isOffered(look)) throw redirect("/themes", 302);
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
  // A season's occasion on the Sheet layout (the home page's holiday tiles open these): its shopping preview starts that
  // occasion's gift list (/start), named for it.
  const season = look.occasion && look.template.slug === "sheet" && format === "shopping" && SEASON.occasions.includes(look.occasion.slug) ? { slug: look.occasion.slug, name: look.occasion.name } : null;
  return { theme, sample, format, season, origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Look not found · The Want MCP" }, { name: "robots", content: "noindex" }];
  const { theme, origin } = loaderData;
  const title = `${theme.name} look`;
  const url = `${origin}/themes/${theme.slug}`;
  // The same share tags as the other public pages; looks have no card of their own, so the site's card.
  return [
    { title: `${title} · The Want MCP` },
    { name: "description", content: theme.idea },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: title },
    { property: "og:description", content: theme.idea },
    { property: "og:url", content: url },
    { property: "og:image", content: `${origin}/og/home.png?v=13` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function ThemePreview({ loaderData }: Route.ComponentProps) {
  const { theme, sample, format, season, origin } = loaderData;
  const { user } = useRootData();
  // Not a dead end: start a list in this look (sign-in first when needed). An occasion's own preview starts its gift list.
  const startHref = season ? `/start?occasion=${season.slug}` : `/app/new?${new URLSearchParams({ format, look: theme.slug })}`;
  return (
    <div>
      <div className="wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-[0.9rem]">
        <Link to="/themes" className="link text-ink-3">
          ← All looks
        </Link>
        <span className="text-ink-2">
          <strong className="text-ink">{theme.name}</strong>
        </span>
        <nav aria-label="Sample list format" className="flex gap-1">
          {Object.values(FORMATS).map((f) => (
            <Link
              key={f.format}
              to={`?format=${f.format}`}
              replace
              preventScrollReset
              aria-current={f.format === format ? "page" : undefined}
              className={`btn btn-sm hit ${f.format === format ? "" : "btn-ghost"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <StartWithLook href={user ? startHref : `/login?next=${encodeURIComponent(startHref)}`} label={season ? `Start a ${season.name} list` : "Start a list with this look"} />
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

/** Cloudflare Web Analytics may count views of this page (root.tsx, AnalyticsBeacon). */
export const handle = { analytics: true };

/**
 * The one way out of a look's preview, the same for a layout and for a holiday (owner, 26 Nov 2026: the small one "seems
 * off"): a full-size primary, the width of the screen on a phone, at the end of the tabs row from 640px.
 */
function StartWithLook({ href, label }: { href: string; label: string }) {
  return (
    <Link to={href} className="btn btn-want ml-auto max-sm:w-full">
      {label}
    </Link>
  );
}
