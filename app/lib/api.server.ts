import { redirect } from "react-router";
import { apiBaseUrl } from "./config.server";
import { getSessionToken } from "./session.server";
import type { ApiError as ApiErrorBody, ErrorCode } from "./types";

export class ApiError extends Error {
  status: number;
  code: ErrorCode | "network" | "internal";
  constructor(status: number, code: ApiError["code"], message: string) {
    super(message);
    this.status = status;
    this.code = code;
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
}

let mockModule: Promise<typeof import("../../mock/api")> | null = null;

async function send(req: Request): Promise<Response> {
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
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers.set("x-forwarded-for", ip);

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
    console.error("API unreachable", url.pathname, err);
    throw new ApiError(503, "network", "We couldn't reach the Want MCP API. Try again in a moment.");
  }
  init.onHeaders?.(res.headers);
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
    throw new ApiError(res.status, err?.code ?? "internal", err?.message ?? `API error ${res.status}`);
  }
  return data as T;
}

/** Turn an ApiError into something a form can show; rethrow anything else. */
export function formError(err: unknown): { error: string; code?: string } {
  if (err instanceof ApiError) {
    if (err.status === 401) throw redirect("/login");
    return { error: err.message, code: err.code };
  }
  throw err;
}

/** Map API 404/403 to a Response the route ErrorBoundary understands. */
export function toRouteError(err: unknown): never {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.status === 403) throw new Response("Not found", { status: 404 });
    throw new Response(err.message, { status: err.status >= 500 ? 503 : err.status });
  }
  throw err;
}
