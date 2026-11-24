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
  async fetch(request) {
    const response = await requestHandler(request);
    const url = new URL(request.url);
    const res = new Response(response.body, response);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!res.headers.has(k)) res.headers.set(k, v);
    if (NOINDEX.test(url.pathname) || res.status === 404) res.headers.set("X-Robots-Tag", "noindex");
    return res;
  },
} satisfies ExportedHandler<Env>;
