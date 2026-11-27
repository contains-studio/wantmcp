import { redirect } from "react-router";
import { apiBaseUrl, proxySecret } from "./config.server";
import { getSessionToken } from "./session.server";
import type { ApiError as ApiErrorBody, ErrorCode } from "./types";
import { errorLine } from "./telemetry";
import { currentTrace } from "./trace.server";

export class ApiError extends Error {
  status: number;
  /** An ErrorCode, or a newer code such as `email_unavailable`, or `network` / `internal`. */
  code: ErrorCode | "network" | "internal" | (string & {});
  details?: unknown;
  constructor(status: number, code: ApiError["code"], message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface ApiInit {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Override the token (used right after sign-in, before the cookie exists). */
  token?: string | null;
  /** Send no credential even if signed in. */
  anonymous?: boolean;
  /** Read response headers (e.g. local-dev-only headers). */
  onHeaders?: (headers: Headers) => void;
  /** A source tag (`?ref=`), sent as X-Want-Ref; the API trusts it only beside the proxy secret. */
  ref?: string | null;
}

let mockModule: Promise<typeof import("../../mock/api")> | null = null;

/** One request to the API (or the in-process mock), as is. */
export async function send(req: Request): Promise<Response> {
  const base = apiBaseUrl();
  if (base === "mock") {
    mockModule ??= import("../../mock/api");
    return (await mockModule).handleMockRequest(req);
  }
  return fetch(req);
}

/**
 * Call the REST API from a loader or action. The caller's session cookie is forwarded
 * as a bearer token. Throws ApiError on non-2xx responses.
 */
export async function api<T>(request: Request, path: string, init: ApiInit = {}): Promise<T> {
  const base = apiBaseUrl();
  const url = new URL((base === "mock" ? "http://mock/v1" : base) + path);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers = new Headers({ accept: "application/json" });
  const token = init.anonymous ? null : init.token !== undefined ? init.token : getSessionToken(request);
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  // The API trusts the forwarded client address (for rate limits) only alongside the
  // proxy secret, which is a Worker secret and never reaches the browser.
  const ip = request.headers.get("cf-connecting-ip");
  const secret = proxySecret();
  if (ip && secret) {
    headers.set("x-forwarded-for", ip);
    headers.set("x-wantmcp-proxy-secret", secret);
    if (init.ref && /^[a-z0-9-]{1,24}$/.test(init.ref)) headers.set("x-want-ref", init.ref);
  }

  let res: Response;
  try {
    res = await send(
      new Request(url, {
        method: init.method ?? "GET",
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      }),
    );
  } catch (err) {
    console.error(errorLine({ kind: "upstream_error", ref: currentTrace()?.ref ?? "", route: url.pathname, status: 503, build: __BUILD_ID__, code: "network" }));
    throw new ApiError(503, "network", "We couldn't reach the Want MCP API. Try again in a moment.");
  }
  // A stale session cookie (expired, signed out elsewhere, account deleted) must not break
  // public pages: retry reads anonymously. The root loader clears the dead cookie.
  const cookieToken = !init.anonymous && init.token === undefined && token;
  if (res.status === 401 && cookieToken && (init.method ?? "GET") === "GET") {
    return api<T>(request, path, { ...init, anonymous: true });
  }
  init.onHeaders?.(res.headers);
  if (!res.ok && res.status !== 401) {
    // One line per upstream failure, with the API's own request id so the two logs can be joined.
    const trace = currentTrace();
    const upstream = res.headers.get("x-request-id");
    if (trace && upstream) trace.upstreamRequestId = upstream;
    if (res.status >= 500 || res.status === 429) {
      console.error(
        errorLine({ kind: "upstream_error", ref: trace?.ref ?? "", route: url.pathname, status: res.status, build: __BUILD_ID__, upstream_request_id: upstream }),
      );
    }
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // fall through
  }
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, (err?.code as string | undefined) ?? "internal", err?.message ?? `API error ${res.status}`, err?.details);
  }
  return data as T;
}

/**
 * Call an endpoint that an older API server may not have yet. Returns `null` on 404
 * (or 405/501) so the caller can fall back; other errors still throw.
 */
export async function apiOptional<T>(request: Request, path: string, init: ApiInit = {}): Promise<T | null> {
  try {
    return await api<T>(request, path, init);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405 || err.status === 501)) return null;
    throw err;
  }
}

/** Turn an ApiError into something a form can show; rethrow anything else. */
export function formError(err: unknown): { error: string; code?: string; details?: unknown } {
  if (err instanceof ApiError) {
    if (err.status === 401) throw redirect("/login");
    return { error: friendlyError(err), code: err.code, details: err.details };
  }
  // fetch itself failed (offline, DNS, a dropped connection): say so instead of an error page.
  if (err instanceof TypeError) return { error: NETWORK_MESSAGE, code: "network" };
  throw err;
}

export { friendlyError } from "./errors";
import { friendlyError, NETWORK_MESSAGE } from "./errors";

/** Map API 404/403 to a Response the route ErrorBoundary understands. */
export function toRouteError(err: unknown): never {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.status === 403) throw new Response("Not found", { status: 404 });
    throw new Response(err.message, { status: err.status >= 500 ? 503 : err.status });
  }
  throw err;
}
