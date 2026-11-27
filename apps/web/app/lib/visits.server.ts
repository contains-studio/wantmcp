import { apiBaseUrl, proxySecret } from "./config.server";
import { send } from "./api.server";
import { refHost, skipVisit, sourceOf, visitPath, visitTag } from "./visits";

const SESSION_COOKIE = /(?:^|;\s*)wm_session=/;
const SRC_COOKIE = /(?:^|;\s*)wm_src=/;
const TEXT_PAGES = new Set(["/llms.txt", "/agents.txt", "/skill.md", "/developers.md"]);

/** The visit to record for this request and response, or null when it isn't a page view we count. */
export function visitFor(request: Request, url: URL, res: Response): Record<string, unknown> | null {
  if (request.method !== "GET" || res.status !== 200) return null;
  const path = visitPath(url.pathname);
  if (!path) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!(type.startsWith("text/html") || (TEXT_PAGES.has(path) && (type.startsWith("text/plain") || type.startsWith("text/markdown"))))) return null;
  if (skipVisit(request.headers)) return null;
  const ref = refHost(request.headers.get("referer"), url.hostname);
  const tag = visitTag(url);
  return {
    path,
    ref_host: ref,
    ...(tag ? { tag } : {}),
    signed_in: SESSION_COOKIE.test(request.headers.get("cookie") ?? ""),
  };
}

/**
 * SPEC 23: send the page view after the response has gone (the caller hands this to ctx.waitUntil). It never throws
 * and never delays the page. Without the proxy secret (and not on the mock) nothing is sent.
 */
export async function recordVisit(visit: Record<string, unknown>): Promise<void> {
  const base = apiBaseUrl();
  const secret = proxySecret();
  if (base !== "mock" && !secret) return;
  try {
    await send(
      new Request(`${base === "mock" ? "http://mock/v1" : base}/internal/visit`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(secret ? { "x-wantmcp-proxy-secret": secret } : {}) },
        body: JSON.stringify(visit),
      }),
    );
  } catch {
    // Counting is best effort.
  }
}

/** wm_src: a tag or the referring host, set once (30 days) on a page view from outside, when not already set. */
export function sourceCookie(request: Request, url: URL): string | null {
  if (SRC_COOKIE.test(request.headers.get("cookie") ?? "")) return null;
  const src = sourceOf(url, request.headers);
  if (!src) return null;
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `wm_src=${encodeURIComponent(src)}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${secure}`;
}
