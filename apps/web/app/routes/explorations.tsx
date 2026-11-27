import { Link } from "react-router";
import type { Route } from "./+types/explorations";
import { ESSAY } from "~/explorations/looks-essay";
import { siteOrigin } from "~/lib/config.server";
import { ESSAY_PATH } from "~/lib/exhibits";

/** /explorations: what explorations are, and the list of them (one so far). */
export function loader({ request }: Route.LoaderArgs) {
  return { origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

const DESCRIPTION = "Interactive essays about how The Want MCP is made: one part taken apart, another way tried, and what we kept.";

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  return [
    { title: "Explorations · The Want MCP" },
    { name: "description", content: DESCRIPTION },
    { tagName: "link", rel: "canonical", href: `${origin}/explorations` },
    { property: "og:title", content: "Explorations" },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:url", content: `${origin}/explorations` },
    { property: "og:image", content: `${origin}/og/explorations/redesigning-the-looks.png?v=1` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: "/theme-css/explorations/essay.css" }];

/** Cloudflare Web Analytics may count views of this page (root.tsx, AnalyticsBeacon). */
export const handle = { analytics: true };

export default function Explorations() {
  return (
    <div className="wrap expl">
      <h1 className="expl-h1">Explorations</h1>
      <p className="expl-lede">
        Now and then we take one part of The Want MCP apart, try another way of making it, and write down what happened, including what we kept as it was. Each is an
        interactive essay: the examples in it are the real thing, and you can use them as you read.
      </p>
      <ul className="expl-list">
        <li className="expl-entry">
          <p className="expl-meta">
            {ESSAY.kicker} · {ESSAY.published}
          </p>
          <h2 className="expl-title">
            <Link to={ESSAY_PATH} className="link">
              {ESSAY.title}
            </Link>
          </h2>
          <p>{ESSAY.standfirst}</p>
          <p>
            {ESSAY.credit[0]}
            <a href={ESSAY.creditHref} className="link">
              {ESSAY.credit[1]}
            </a>
            {ESSAY.credit[2]}
          </p>
        </li>
      </ul>
    </div>
  );
}
