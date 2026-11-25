import { ApiError } from "./api.server";
import { claimList, lookupClaim } from "./tokens.server";
import { keptCookie } from "./session.server";
import type { ListSummary } from "./types";

/** POST the claim; the list on success, or an error to show (empty when the link can't be used). A 409 means someone else kept it. */
export async function keep(request: Request, token: string): Promise<{ list: ListSummary } | { error: string }> {
  try {
    const list = await claimList(request, token);
    return { list };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "conflict") return { error: "Someone else has already kept this list." };
      if (err.status === 404) return { error: "" };
      return { error: "That didn't work. Try again in a moment." };
    }
    throw err;
  }
}

/**
 * Keep the list and land on it, with the one-time "who started it" line (a short-lived cookie the list page reads).
 * Returns the redirect, or the error keep() gave.
 */
export async function keepAndLand(request: Request, token: string, headers: Record<string, string> = {}): Promise<Response | { error: string }> {
  const preview = await lookupClaim(request, token).catch(() => null);
  const kept = await keep(request, token);
  if (!("list" in kept)) return kept;
  const h = new Headers(headers);
  if (preview) {
    const by = preview.agent_name || preview.from?.handle || "";
    if (by) h.append("Set-Cookie", keptCookie(request, { listId: kept.list.id, kind: preview.kind, by }));
  }
  h.set("Location", `/l/${kept.list.id}`);
  return new Response(null, { status: 302, headers: h });
}
