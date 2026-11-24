import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

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
    return res;
  },
} satisfies ExportedHandler<Env>;
