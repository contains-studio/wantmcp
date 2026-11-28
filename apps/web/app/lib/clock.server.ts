/**
 * The time a request is answered at. Tests against the in-process mock may set it with an `x-wantmcp-now` header (an
 * ISO instant), so nothing in the suite depends on today's real date. Against the real API the header is ignored:
 * production always uses the real clock.
 */
import { apiBaseUrl } from "./config.server";

export function requestNow(request: Request): number {
  if (apiBaseUrl() === "mock") {
    const at = Date.parse(request.headers.get("x-wantmcp-now") ?? "");
    if (Number.isFinite(at)) return at;
  }
  return Date.now();
}
