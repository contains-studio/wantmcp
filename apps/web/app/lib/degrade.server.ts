/**
 * A page should not fail because one of its secondary calls did (comments, prices, who has access, a preview). These
 * helpers run such a call, log one redacted line with the request's reference on failure, and hand back a fallback the
 * page can render, with the reference to show if it wants to.
 */
import { ApiError } from "./api.server";
import { errorLine } from "./telemetry";
import { currentTrace } from "./trace.server";

export function ref(): string {
  return currentTrace()?.ref ?? "unknown";
}

export async function orFallback<T>(work: Promise<T>, fallback: T, route: string): Promise<T> {
  try {
    return await work;
  } catch (err) {
    // Redirects and route errors are not failures to hide.
    if (err instanceof Response) throw err;
    console.error(
      errorLine({ kind: "server_error", ref: ref(), route, status: err instanceof ApiError ? err.status : 502, build: __BUILD_ID__, name: err instanceof Error ? err.name : null }),
    );
    return fallback;
  }
}

/** Like orFallback, but says whether it failed (so the page can show a retry line with the reference). */
export async function orUnavailable<T>(work: Promise<T>, route: string): Promise<{ value: T | null; unavailable: string | null }> {
  const marker = Symbol("failed");
  const value = await orFallback<T | typeof marker>(work, marker, route);
  return value === marker ? { value: null, unavailable: ref() } : { value: value as T, unavailable: null };
}
