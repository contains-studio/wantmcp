import type { Route } from "./+types/llms";
import { agentsText } from "~/lib/agents-text";
import { apiBaseUrl, mcpUrl, siteOrigin } from "~/lib/config.server";

/** /llms.txt and /agents.txt: the same plain-text instructions for agents. */
export function loader({ request }: Route.LoaderArgs) {
  const base = apiBaseUrl();
  const api = base === "mock" ? "https://api.wantmcp.com/v1" : base;
  const body = agentsText({ origin: siteOrigin(request), mcp: mcpUrl(), api });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
