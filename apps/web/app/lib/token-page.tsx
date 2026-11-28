/**
 * Shared by the signed-out pages an email's link opens (SPEC 20.7, 26.4, 26.20 item 4): their headers, and their
 * frame. Opening such a page never acts (mail scanners open links); its one button posts. noindex, no-store, and the
 * token never leaves for another site.
 */

// same-origin, not no-referrer: no-referrer makes a form post send `Origin: null`, which React Router refuses. The
// token never leaves for another site either way.
export const TOKEN_PAGE_HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "same-origin", "X-Robots-Tag": "noindex" };

export function tokenPageMeta(title: string) {
  return [{ title: `${title} · The Want MCP` }, { name: "robots", content: "noindex" }, { name: "referrer", content: "same-origin" }];
}

export function TokenShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap grid place-items-center py-12">
      <div className="card grid w-full max-w-md gap-4 p-6 sm:p-8">
        <h1 className="text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] break-words">{title}</h1>
        {children}
      </div>
    </div>
  );
}
