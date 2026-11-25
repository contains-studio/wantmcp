import type { Route } from "./+types/robots";
import { siteOrigin } from "~/lib/config.server";

export function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Allow: /llms.txt",
    "Allow: /agents.txt",
    "Disallow: /app",
    "Disallow: /login",
    "Disallow: /invite/",
    "Disallow: /claim",
    "Disallow: /unsubscribe/",
    "Disallow: /report",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
