/**
 * Content-Security-Policy for HTML documents. Scripts must carry this response's nonce.
 * Product images are hotlinked from arbitrary retailers, so img-src allows any https host.
 * Inline style attributes are allowed (agent tag colours, chart markers); style elements are not.
 */
export function contentSecurityPolicy(nonce: string, secure: boolean, frameAncestors: "'none'" | "'self'" = "'none'"): string {
  // Cloudflare Web Analytics (SPEC 23): the owner turns it on in the dashboard and Cloudflare injects its beacon (or
  // root.tsx adds it when a token is set), so its two hosts are always allowed, and nothing wider.
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com`,
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' https: data:",
    "font-src 'self' data:", // Vite inlines small font subsets as data: URIs
    "connect-src 'self' https://cloudflareinsights.com",
    "form-action 'self'",
    // No page may be framed. The one exception is a /themes/compare frame, which this site alone may frame (lib/compare.ts).
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
    ...(secure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
