const BASE = "https://same-origin.invalid";
// Control characters (including tab and newline), backslashes and whitespace are never part of a path we send people to.
const UNSAFE = /[\u0000-\u001f\u007f\\\s]/;

/**
 * Only allow a same-site path as a redirect target: one leading `/`, no `//`, no backslash, no control
 * characters or whitespace (raw or percent-encoded), no scheme. Anything else becomes `fallback`.
 */
export function safeNext(value: string | null | undefined, fallback = "/app"): string {
  if (!value || value.length > 512) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  for (const v of [value, decoded]) {
    if (!v.startsWith("/") || v.startsWith("//") || UNSAFE.test(v)) return fallback;
  }
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
