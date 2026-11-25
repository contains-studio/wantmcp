/**
 * Calls that carry a claim or invite token. The token goes in the request body (POST …/lookup and
 * …/claim or …/accept), never in an API path, so it stays out of every request log. An API without
 * those routes yet answers 404, and only then is the older path form tried, so this web build can
 * ship before or after the server.
 */
import { api, ApiError, apiOptional } from "./api.server";
import type { ClaimPreview, InvitePreview, ListSummary } from "./types";

async function bodyThenPath<T>(request: Request, body: () => Promise<T>, path: () => Promise<T>): Promise<T> {
  try {
    return await body();
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) return path();
    throw err;
  }
}

/** The claim preview, or null when the link is unknown, used or expired. */
export async function lookupClaim(request: Request, token: string): Promise<ClaimPreview | null> {
  const viaBody = await apiOptional<ClaimPreview>(request, "/claims/lookup", { method: "POST", anonymous: true, body: { token } });
  return viaBody ?? apiOptional<ClaimPreview>(request, `/claims/${encodeURIComponent(token)}`, { anonymous: true });
}

/** Keep the list behind a claim link (web session). */
export function claimList(request: Request, token: string): Promise<ListSummary> {
  return bodyThenPath(
    request,
    () => api<ListSummary>(request, "/claims/claim", { method: "POST", body: { token } }),
    () => api<ListSummary>(request, `/claims/${encodeURIComponent(token)}`, { method: "POST" }),
  );
}

/** The invite preview, or null when the link is unknown. */
export async function lookupInvite(request: Request, token: string): Promise<InvitePreview | null> {
  const viaBody = await apiOptional<InvitePreview>(request, "/invites/lookup", { method: "POST", anonymous: true, body: { token } });
  return viaBody ?? apiOptional<InvitePreview>(request, `/invites/${encodeURIComponent(token)}`, { anonymous: true });
}

/** Accept an invite (web session). */
export function acceptInvite(request: Request, token: string): Promise<ListSummary> {
  return bodyThenPath(
    request,
    () => api<ListSummary>(request, "/invites/accept", { method: "POST", body: { token } }),
    () => api<ListSummary>(request, `/invites/${encodeURIComponent(token)}/accept`, { method: "POST" }),
  );
}
