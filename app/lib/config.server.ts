import { env } from "cloudflare:workers";

const DEFAULT_API = "https://api.wantmcp.com/v1";

/** Base URL of the REST API, or the literal `mock` to use the in-process mock API. */
export function apiBaseUrl(): string {
  return ((env as unknown as Record<string, string | undefined>).API_BASE_URL || DEFAULT_API).replace(/\/$/, "");
}

/** Public origin of this site, used for canonical URLs, Open Graph and the sitemap. */
export function siteOrigin(request?: Request): string {
  const configured = (env as unknown as Record<string, string | undefined>).SITE_ORIGIN;
  if (configured) return configured.replace(/\/$/, "");
  return request ? new URL(request.url).origin : "https://wantmcp.com";
}

/** The MCP endpoint agents connect to. */
export function mcpUrl(): string {
  return (env as unknown as Record<string, string | undefined>).MCP_URL || "https://mcp.wantmcp.com/mcp";
}
