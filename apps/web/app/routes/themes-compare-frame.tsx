import type { Route } from "./+types/themes-compare-frame";
import { ListView } from "~/components/ListView";
import { siteOrigin } from "~/lib/config.server";
import { formatOf } from "~/lib/formats";
import type { ListFormat } from "~/lib/types";
import { getThemeView, parseLook } from "~/themes/catalogue.server";
import { getNextThemeView } from "~/themes/next.server";
import { sampleList } from "~/themes/sample.server";

/**
 * One look in one version (`current` or `next`), on its own: what /themes/compare shows in each frame. The same sample
 * list as /themes/:slug, read as a visitor, without the site's header and footer (compare.css). `?format=` picks the
 * kind of list, `?mode=light|dark` the appearance (root loader, lib/compare.ts).
 */
export function loader({ request, params }: Route.LoaderArgs) {
  const version = params.version;
  if (version !== "current" && version !== "next") throw new Response("Not found", { status: 404 });
  const look = parseLook(params.slug);
  if (!look || look.slug !== params.slug) throw new Response("Not found", { status: 404 });
  const q = new URL(request.url).searchParams.get("format");
  const natural: ListFormat = look.template.natural ?? "shopping";
  const format = q ? formatOf({ format: q as ListFormat }) : natural;
  const theme = version === "next" ? getNextThemeView(look.slug) : getThemeView(look.slug);
  return { theme, version, sample: sampleList(Date.now(), format), origin: siteOrigin(request) };
}

/** This site may frame it (the Worker's DENY applies only where a page sets nothing); never indexed. */
export function headers() {
  return { "X-Frame-Options": "SAMEORIGIN", "X-Robots-Tag": "noindex", "Cache-Control": "private, no-store" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData ? `${loaderData.theme.name}, ${loaderData.version === "next" ? "redesigned" : "current"}` : "Look not found";
  return [{ title: `${name} · The Want MCP` }, { name: "robots", content: "noindex" }];
}

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: "/theme-css/next/compare.css" }];

export default function CompareFrame({ loaderData }: Route.ComponentProps) {
  const { theme, sample, origin } = loaderData;
  return (
    <div className="cmp-frame">
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
