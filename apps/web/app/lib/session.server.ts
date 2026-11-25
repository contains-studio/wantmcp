/**
 * The API session token lives in an httpOnly cookie on the web origin. Only server code
 * (loaders and actions) reads it, and forwards it to the API as `Authorization: Bearer`.
 */
const COOKIE = "wm_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function getSessionToken(request: Request): string | null {
  const t = readCookie(request, COOKIE);
  return t && /^[\x21-\x7e]{8,512}$/.test(t) ? t : null;
}

function secureFlag(request: Request) {
  // Always Secure in production. Plain-http localhost is allowed without it so Safari works in dev.
  const url = new URL(request.url);
  return url.protocol === "https:" || !["localhost", "127.0.0.1"].includes(url.hostname) ? "; Secure" : "";
}

export function sessionCookie(request: Request, token: string): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secureFlag(request)}`;
}

export function clearSessionCookie(request: Request): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

export { safeNext } from "./url";

/**
 * Reject cross-site form posts. SameSite=Lax already keeps the cookie off them;
 * this is a second check on the Origin header.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) {
    throw new Response("Cross-site request blocked", { status: 403 });
  }
}

/** A one-line notice for the next page (e.g. "Deleted 'X'."), read once. Kept out of URLs because it can name private things. */
const FLASH_COOKIE = "wm_flash";

export function flashCookie(request: Request, message: string): string {
  return `${FLASH_COOKIE}=${encodeURIComponent(message.slice(0, 200))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=60${secureFlag(request)}`;
}

export function readFlash(request: Request): string | null {
  return readCookie(request, FLASH_COOKIE);
}

/**
 * SPEC 16.6: the status link the API gave for the report just sent, for the thanks screen (and a reload of it). Path /,
 * because the page data is fetched from /feedback.data; ten minutes; the URL carries only the id.
 */
const FEEDBACK_SENT_COOKIE = "wm_fb_sent";

export function feedbackSentCookie(request: Request, statusUrl: string): string {
  return `${FEEDBACK_SENT_COOKIE}=${encodeURIComponent(statusUrl.slice(0, 300))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secureFlag(request)}`;
}

export function readFeedbackSent(request: Request): string | null {
  return readCookie(request, FEEDBACK_SENT_COOKIE);
}

export function clearFlashCookie(request: Request): string {
  return `${FLASH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

/**
 * The one-time line after keeping a list ("This list was started by Claude…"): which list, how it came, and who made
 * it. Read once by the list page, then cleared.
 */
const KEPT_COOKIE = "wm_kept";
export type Kept = { listId: string; kind: "unclaimed" | "handover"; by: string };

export function keptCookie(request: Request, kept: Kept): string {
  const by = kept.by.replace(/[^\p{L}\p{N} ._'-]/gu, "").slice(0, 60);
  return `${KEPT_COOKIE}=${encodeURIComponent(JSON.stringify({ ...kept, by }))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${secureFlag(request)}`;
}

export function readKept(request: Request): Kept | null {
  try {
    const v = JSON.parse(readCookie(request, KEPT_COOKIE) ?? "null") as Kept | null;
    return v && typeof v.listId === "string" && (v.kind === "unclaimed" || v.kind === "handover") && typeof v.by === "string" ? v : null;
  } catch {
    return null;
  }
}

export function clearKeptCookie(request: Request): string {
  return `${KEPT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

/**
 * Lists whose "Give this list to your agent" step the person dismissed, on this device. Only list ids, at most 50.
 */
const HANDOFF_COOKIE = "wm_handoff_off";

export function dismissedHandoffs(request: Request): string[] {
  const v = readCookie(request, HANDOFF_COOKIE) ?? "";
  return v.split(",").filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id));
}

export function dismissHandoffCookie(request: Request, listId: string): string {
  const ids = [listId, ...dismissedHandoffs(request).filter((id) => id !== listId)].slice(0, 50);
  return `${HANDOFF_COOKIE}=${ids.join(",")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secureFlag(request)}`;
}

/**
 * The sign-in attempt (SPEC: POST /auth/code returns { attempt_id }, sent back with the code). Kept in an
 * httpOnly cookie for the ten minutes a code lives, so it never appears in the page or a URL.
 */
const ATTEMPT_COOKIE = "wm_attempt";

export function attemptCookie(request: Request, attemptId: string): string {
  return `${ATTEMPT_COOKIE}=${encodeURIComponent(attemptId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900${secureFlag(request)}`;
}

export function clearAttemptCookie(request: Request): string {
  return `${ATTEMPT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

export function getAttemptId(request: Request): string | null {
  const t = readCookie(request, ATTEMPT_COOKIE);
  return t && /^[A-Za-z0-9_-]{1,200}$/.test(t) ? t : null;
}

/**
 * A claim link's token while its person signs in (SPEC 13.4). It stays out of the /login URL (and so out of
 * request logs and history) and is read only by the /claim pages. One hour is plenty for an emailed code.
 */
const CLAIM_COOKIE = "wm_claim";

export function claimCookie(request: Request, token: string): string {
  return `${CLAIM_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${secureFlag(request)}`;
}

export function clearClaimCookie(request: Request): string {
  return `${CLAIM_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

export function getClaimToken(request: Request): string | null {
  const t = readCookie(request, CLAIM_COOKIE);
  return t && /^[A-Za-z0-9_-]{8,200}$/.test(t) ? t : null;
}
