/** Hosts served over plain HTTP in development only. */
const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The one canonical address for a request, or null when it is already canonical: always HTTPS, never `www.`.
 * http://www.wantmcp.com/x and http://wantmcp.com/x both go to https://wantmcp.com/x, keeping path and query.
 * Local development keeps plain HTTP.
 */
export function canonicalRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  let changed = false;
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
    changed = true;
  }
  if (url.protocol === "http:" && !LOCAL.has(url.hostname)) {
    url.protocol = "https:";
    url.port = "";
    changed = true;
  }
  return changed ? url.toString() : null;
}
