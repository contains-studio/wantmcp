import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/** Pages that are always personal: never stored by any cache. */
const ALWAYS_PRIVATE = /^\/(app|login|logout|invite)(\/|\.data|$)/;
const SESSION_COOKIE = /(?:^|;\s*)wm_session=/;

/**
 * Caching rule for every page response: anything answered to a request that carries a session
 * cookie, every personal page and every 404 (a private list looks like a 404) is
 * `private, no-store`. Only responses to requests without a session may be public, and those vary
 * on Cookie. Browsers never keep an HTML page (`max-age=0`): a cached page can point at script
 * chunks a later deploy removed.
 */
function applyCachePolicy(request: Request, url: URL, res: Response) {
  const personal =
    SESSION_COOKIE.test(request.headers.get("cookie") ?? "") ||
    ALWAYS_PRIVATE.test(url.pathname) ||
    res.status === 404 ||
    (request.method !== "GET" && request.method !== "HEAD");
  if (personal) {
    res.headers.set("cache-control", "private, no-store");
    return;
  }
  const cc = res.headers.get("cache-control");
  if (cc && /\bpublic\b/.test(cc)) {
    const vary = res.headers.get("vary");
    if (!vary || !/\bcookie\b/i.test(vary)) res.headers.set("vary", vary ? `${vary}, Cookie` : "Cookie");
    if ((res.headers.get("content-type") ?? "").startsWith("text/html")) {
      res.headers.set("cache-control", cc.replace(/(^|[\s,])max-age=\d+/, "$1max-age=0"));
    }
  }
}

/** Pages that must never be indexed, whatever the route returns. */
const NOINDEX = /^\/(app|login|logout|invite|report|theme)(\/|$)/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // One canonical host: www.wantmcp.com -> wantmcp.com, keeping path and query.
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return new Response(null, { status: 301, headers: { location: url.toString(), "cache-control": "public, max-age=86400" } });
    }
    // Share images (rendered lazily so ordinary pages never load the renderer).
    if (url.pathname.startsWith("/og/")) {
      const og = await import("./og");
      if (og.isOgPath(url.pathname)) return og.handleOg(request, ctx);
    }
    // Domain discovery for AI clients lives on the MCP host.
    if (url.pathname === "/.well-known/ai-catalog.json") {
      const mcpOrigin = new URL(env.MCP_URL || "https://mcp.wantmcp.com/mcp").origin;
      return Response.redirect(`${mcpOrigin}/.well-known/ai-catalog.json`, 302);
    }
    const response = await requestHandler(request);
    const res = new Response(response.body, response);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!res.headers.has(k)) res.headers.set(k, v);
    if (NOINDEX.test(url.pathname) || res.status === 404) res.headers.set("X-Robots-Tag", "noindex");
    // Lets an open tab notice it is running an older build than the server (app/lib/build.ts).
    res.headers.set("X-Build-Id", __BUILD_ID__);
    applyCachePolicy(request, url, res);
    return res;
  },
} satisfies ExportedHandler<Env>;
