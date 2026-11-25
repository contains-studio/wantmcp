/**
 * Error telemetry without personal data. Every line is built here, from an allowlist of fields,
 * each checked against a strict pattern: no emails, tokens, list or item ids, query strings or
 * free text ever reach a log. See telemetry.test.ts.
 */

/** Route patterns, in the order of app/routes.ts. A path is only ever logged as one of these. */
const ROUTES: Array<[RegExp, string]> = [
  [/^\/$/, "/"],
  [/^\/l\/[^/]+$/, "/l/:id"],
  [/^\/l\/[^/]+\/comments$/, "/l/:id/comments"],
  [/^\/login$/, "/login"],
  [/^\/logout$/, "/logout"],
  [/^\/app$/, "/app"],
  [/^\/app\/account$/, "/app/account"],
  [/^\/app\/lists\/[^/]+\/settings$/, "/app/lists/:id/settings"],
  [/^\/invite\/[^/]+$/, "/invite/:token"],
  [/^\/connect$/, "/connect"],
  [/^\/themes$/, "/themes"],
  [/^\/themes\/[^/]+$/, "/themes/:slug"],
  [/^\/for$/, "/for"],
  [/^\/for\/[^/]+$/, "/for/:slug"],
  [/^\/(privacy|terms|report|theme|live|waiting|sitemap\.xml|robots\.txt)$/, "/$1"],
  [/^\/og\/l\/[^/]+$/, "/og/l/:id"],
  [/^\/og\/home\.png$/, "/og/home.png"],
  [/^\/og\/for\/[^/]+$/, "/og/for/:slug"],
  [/^\/telemetry\/error$/, "/telemetry/error"],
];

/** The route pattern for a request path (query string ignored, single-fetch `.data` suffix removed). */
export function routePattern(pathname: string): string {
  const p = (pathname.split("?")[0] || "/").replace(/\.data$/, "").replace(/\/+$/, "") || "/";
  const clean = p === "/_root" ? "/" : p;
  for (const [re, pattern] of ROUTES) {
    if (re.test(clean)) return clean.replace(re, pattern);
  }
  return "(other)";
}

/** An API path with every id-like segment replaced: /lists/lst_x/items -> /lists/:id/items. */
export function apiPathPattern(path: string): string {
  return (path.split("?")[0] || "/")
    .split("/")
    .map((seg, i) => (i === 0 ? seg : /^(v1|me|lists|items|entries|questions|comments|agents|members|invites|auth|feed|reports|prices|events|status|purchase|promote|reject|summary|suggestions|updates|context|whoami|answer|accept|code|verify|logout)$/.test(seg) ? seg : ":id"))
    .join("/");
}

const REF = /^[a-z0-9]{6,16}$/;
const UPSTREAM = /^[A-Za-z0-9_-]{1,64}$/;
const BUILD = /^[A-Za-z0-9._-]{1,40}$/;
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,59}$/;
const CODE = /^[a-z_]{1,40}$/;

export interface ErrorFields {
  kind: "server_error" | "client_error" | "upstream_error";
  ref: string;
  route: string;
  status: number;
  build: string;
  upstream_request_id?: string | null;
  /** Error class name (client), e.g. TypeError. */
  name?: string | null;
  /** Upstream error code, e.g. internal. */
  code?: string | null;
}

/** The one JSON line logged per error. Anything that doesn't match its pattern is dropped. */
export function errorLine(f: ErrorFields): string {
  const out: Record<string, string | number> = { event: f.kind };
  if (REF.test(f.ref)) out.ref = f.ref;
  // Accept only known patterns (a raw path never passes: it is re-mapped, which turns ids into :id).
  out.route = f.route.startsWith("/") || f.route === "(other)" ? (f.kind === "upstream_error" ? apiPathPattern(f.route) : routePattern(f.route)) : "(other)";
  if (Number.isInteger(f.status) && f.status >= 100 && f.status <= 599) out.status = f.status;
  if (BUILD.test(f.build)) out.build = f.build;
  if (f.upstream_request_id && UPSTREAM.test(f.upstream_request_id)) out.upstream_request_id = f.upstream_request_id;
  if (f.name && NAME.test(f.name)) out.name = f.name;
  if (f.code && CODE.test(f.code)) out.code = f.code;
  return JSON.stringify(out);
}

/** A short reference a person can read out or screenshot: 8 lowercase letters and digits. */
export function newRef(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}
