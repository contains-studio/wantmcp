import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";

export const streamTimeout = 5_000;

function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Content-Security-Policy for HTML documents. Scripts must carry this response's nonce.
 * Product images are hotlinked from arbitrary retailers, so img-src allows any https host.
 * Inline style attributes are allowed (agent tag colours, chart markers); style elements are not.
 */
function contentSecurityPolicy(nonce: string, secure: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' https: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
    ...(secure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  const nonce = makeNonce();
  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} nonce={nonce} />, {
    nonce,
    signal: AbortSignal.timeout(streamTimeout + 1000),
    onError(error: unknown) {
      responseStatusCode = 500;
      // Errors during the initial shell render are logged by handleDocumentRequest.
      if (shellRendered) {
        console.error(error);
      }
    },
  });
  shellRendered = true;

  // Crawlers get the complete document in one go.
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  // The Vite dev server injects un-nonced inline scripts for hot reload, so the policy
  // is only enforced on production builds.
  if (!import.meta.env.DEV) {
    responseHeaders.set("Content-Security-Policy", contentSecurityPolicy(nonce, new URL(request.url).protocol === "https:"));
  }
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
