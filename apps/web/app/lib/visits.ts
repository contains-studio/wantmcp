/**
 * SPEC 23: counting where visitors come from. Pure rules, so they can be tested: which page a request is (as a route
 * pattern, never a real id), where it came from (the referrer's host), its ?ref= tag, and which requests are skipped.
 */

/** Every page the site serves, in the server's accepted list (server c261c45). Order matters: exact before :params. */
const PATTERNS: Array<[RegExp, string]> = [
  [/^\/$/, "/"],
  [/^\/connect$/, "/connect"],
  [/^\/login$/, "/login"],
  [/^\/for$/, "/for"],
  [/^\/for\/[^/]+$/, "/for/:slug"],
  [/^\/themes$/, "/themes"],
  [/^\/themes\/[^/]+$/, "/themes/:slug"],
  [/^\/start$/, "/start"],
  [/^\/l\/[^/]+$/, "/l/:id"],
  [/^\/claim$/, "/claim"],
  [/^\/claim\/[^/]+$/, "/claim/:token"],
  [/^\/invite\/[^/]+$/, "/invite/:token"],
  [/^\/feedback$/, "/feedback"],
  [/^\/feedback\/[^/]+$/, "/feedback/:id"],
  [/^\/unsubscribe\/[^/]+$/, "/unsubscribe/:token"],
  [/^\/report$/, "/report"],
  [/^\/privacy$/, "/privacy"],
  [/^\/terms$/, "/terms"],
  [/^\/app$/, "/app"],
  [/^\/app\/new$/, "/app/new"],
  [/^\/app\/activity$/, "/app/activity"],
  [/^\/app\/skills$/, "/app/skills"],
  [/^\/app\/account$/, "/app/account"],
  [/^\/app\/traffic$/, "/app/traffic"],
  [/^\/app\/lists\/[^/]+\/settings$/, "/app/lists/:id/settings"],
  [/^\/llms\.txt$/, "/llms.txt"],
  [/^\/agents\.txt$/, "/agents.txt"],
  [/^\/skill\.md$/, "/skill.md"],
];

/** The page's route pattern, or null for anything else (assets, data requests, redirects' sources, unknown paths). */
export function visitPath(pathname: string): string | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const [re, pattern] of PATTERNS) if (re.test(p)) return pattern;
  return null;
}

/**
 * The referrer's host, lowercased, without "www.": "direct" with none. A click within the site sends our own host: the
 * server counts the page but never our host as a source, so in-site clicks don't read as direct visits.
 */
export function refHost(referer: string | null, ownHost: string): string {
  if (!referer) return "direct";
  let host: string;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  host = host.replace(/^www\./, "");
  const own = ownHost.toLowerCase().replace(/^www\./, "");
  if (!host) return "direct";
  return host === own ? own : host;
}

/** ?ref= when it is a plain tag ([a-z0-9_-]{1,32}), else null. */
export function visitTag(url: URL): string | null {
  const t = url.searchParams.get("ref");
  return t && /^[a-z0-9_-]{1,32}$/.test(t) ? t : null;
}

const BOT = /bot|crawler|spider|preview|curl|python|node-fetch|go-http|HeadlessChrome|Playwright/i;

/** Our own checks (x-wantmcp-check: 1), headless browsers and obvious bots are never counted. */
export function skipVisit(headers: Headers): boolean {
  if (headers.get("x-wantmcp-check") === "1") return true;
  const ua = headers.get("user-agent") ?? "";
  return !ua || BOT.test(ua);
}

/** What the first visit came from, for the sign-up source cookie (wm_src): the tag, else the referrer's host. */
export function sourceOf(url: URL, headers: Headers): string | null {
  const tag = visitTag(url);
  if (tag) return tag;
  const host = refHost(headers.get("referer"), url.hostname);
  const own = url.hostname.toLowerCase().replace(/^www\./, "");
  return host !== "direct" && host !== own ? host.slice(0, 64) : null;
}
