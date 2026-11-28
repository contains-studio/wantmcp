import { redirect } from "react-router";

/**
 * A form posted by the browser itself (JavaScript off or not yet loaded): a document navigation. React Router's own
 * submissions (fetchers, <Form> with JavaScript) are fetch requests, so they keep getting the action's data.
 */
export function isDocumentPost(request: Request): boolean {
  return request.headers.get("sec-fetch-mode") === "navigate" && (request.headers.get("sec-fetch-dest") ?? "document") === "document";
}

/** Results that carry something shown only once (a new key, a hand-over link): answered with the page, never redirected. */
const ONE_TIME = ["key", "handover", "devInvite", "secret"];

function okData(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object" || result instanceof Response) return null;
  // data(...) wraps its payload; a plain object is returned as is.
  const r = result as { type?: string; data?: unknown; init?: { status?: number } };
  const payload = (r.type === "DataWithResponseInit" ? r.data : result) as Record<string, unknown> | null;
  if (r.type === "DataWithResponseInit" && (r.init?.status ?? 200) >= 400) return null;
  return payload && typeof payload === "object" && payload.ok === true ? payload : null;
}

/**
 * Post/redirect/get for forms without JavaScript (bug audit, 27 Nov 2026: refreshing after adding an item without
 * JavaScript re-posted it, one item became three). After a change that worked, a document post is sent back to the page
 * it came from, so a reload or back/forward never repeats it. Errors still render on the page (nothing was changed),
 * and so do one-time results.
 */
export async function afterChange<T>(request: Request, result: T, anchor?: string | null): Promise<T> {
  if (!isDocumentPost(request)) return result;
  const ok = okData(result);
  if (!ok || ONE_TIME.some((k) => ok[k])) return result;
  const url = new URL(request.url);
  url.searchParams.delete("index");
  const at = anchor ?? (typeof ok.itemId === "string" ? ok.itemId : null);
  throw redirect(`${url.pathname}${url.search}${at ? `#${at}` : ""}`, 303);
}
