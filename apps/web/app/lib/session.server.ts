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
