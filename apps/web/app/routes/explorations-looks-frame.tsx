import { data, redirect } from "react-router";
import type { Route } from "./+types/explorations-looks-frame";
import { ListView } from "~/components/ListView";
import { exhibitView, flipSample, hasVersion } from "~/explorations/looks.server";
import { siteOrigin } from "~/lib/config.server";
import { FRAME_VERSIONS, flipped, withFlip, type FrameVersion } from "~/lib/exhibits";
import { formatOf } from "~/lib/formats";
import type { ListFormat } from "~/lib/types";
import { parseLook } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";

/**
 * One look in one version, on its own: an exhibit of /explorations/redesigning-the-looks, shown there in a frame. The
 * sample list of /themes/:slug, without the site's header and footer. `?format=` picks the kind of list, `?mode=` the
 * appearance (root loader), `?head=1` shows only the top of the page (the row of eight headers).
 *
 * Checklist is shown as its owner sees it, so its ticks tick. Nothing is saved: a tick puts the item's id in this
 * frame's address (`?flip=`) and the list is drawn with it flipped. Every other action answers that this is a sample.
 */
function read(request: Request, params: { version: string; slug: string }) {
  const version = params.version as FrameVersion;
  const look = parseLook(params.slug);
  if (!FRAME_VERSIONS.includes(version) || !look || look.slug !== params.slug || !hasVersion(version, look.template.slug)) throw new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  // A script's request for this page's data comes to `<path>.data`; the address a tick redirects to is the page's own.
  url.pathname = url.pathname.replace(/\.data$/, "");
  return { version, look, url };
}

export function loader({ request, params }: Route.LoaderArgs) {
  const { version, look, url } = read(request, params);
  const q = url.searchParams.get("format");
  const format = q ? formatOf({ format: q as ListFormat }) : ((look.template.natural ?? "shopping") as ListFormat);
  const now = Date.now();
  return {
    theme: exhibitView(version, look.slug),
    version,
    owner: look.template.slug === "today",
    head: url.searchParams.get("head") === "1",
    sample: flipSample(sampleList(now, format), flipped(url.searchParams), now),
    origin: siteOrigin(request),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { url } = read(request, params);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const item = String(form.get("item_id") ?? "");
  if (["purchase", "unpurchase", "set-status"].includes(intent) && /^itm_[A-Za-z0-9_]+$/.test(item)) throw redirect(withFlip(url, item));
  return data({ ok: false, error: "This is a sample list. Nothing is saved." });
}

/** This site may frame it (the Worker's DENY applies only where a page sets nothing); never indexed, never stored. */
export function headers() {
  return { "X-Frame-Options": "SAMEORIGIN", "X-Robots-Tag": "noindex", "Cache-Control": "private, no-store" };
}

const LABEL: Record<FrameVersion, string> = { before: "before", after: "after", proposed: "as proposed", "first-drawn": "as first drawn" };

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData ? `${loaderData.theme.name}, ${LABEL[loaderData.version]}` : "Exhibit not found";
  return [{ title: `${name} · The Want MCP` }, { name: "robots", content: "noindex" }];
}

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: "/theme-css/explorations/essay.css" }];

export default function ExhibitFrame({ loaderData }: Route.ComponentProps) {
  const { theme, sample, origin, owner, head } = loaderData;
  return (
    <div className={`ex-frame ${head ? "is-head" : ""}`}>
      <ListView
        list={sample.list}
        items={sample.items}
        suggestions={[]}
        comments={sample.comments}
        commentsCursor={null}
        prices={sample.prices}
        isWriter={owner}
        role={owner ? "owner" : null}
        origin={origin}
        theme={theme}
        preview
      />
    </div>
  );
}
