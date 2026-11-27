/**
 * /connect/key (SPEC 24.2): the rules for its two query values, kept apart so they can be tested. Both are only ever
 * shown or used to pick a list on this page; nothing from them is a return address.
 */

/** `app` is a label: 1–40 letters, digits, spaces and `.-_`. Anything else is null, shown as "this app". */
export function appLabel(raw: string | null): string | null {
  const v = (raw ?? "").trim().replace(/\s+/g, " ");
  return /^[A-Za-z0-9 ._-]{1,40}$/.test(v) && /[A-Za-z0-9]/.test(v) ? v : null;
}

/** A list id as the server writes them; anything else is ignored (the picker shows instead). */
export function listParam(raw: string | null): string | null {
  const v = (raw ?? "").trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : null;
}

/** This page's own address, rebuilt from the cleaned values only (for sign-in to come back to). */
export function connectKeyPath(app: string | null, list: string | null): string {
  const q = new URLSearchParams();
  if (app) q.set("app", app);
  if (list) q.set("list", list);
  const s = q.toString();
  return `/connect/key${s ? `?${s}` : ""}`;
}
