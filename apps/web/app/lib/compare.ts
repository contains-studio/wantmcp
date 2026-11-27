/**
 * /themes/compare (branch looks-impeccable): the current looks beside a redesign of each, in frames. A frame is an
 * ordinary page of this site shown inside the compare page, which the site otherwise forbids everywhere (no page may
 * be framed). The exceptions below apply to frame addresses only and allow this site alone to frame them.
 */
export const COMPARE_PATH = "/themes/compare";
export const FRAME_PREFIX = "/themes/compare/frame/";

export type FrameVersion = "current" | "next";
export type Appearance = "light" | "dark";

export function isCompareFrame(pathname: string): boolean {
  return pathname.startsWith(FRAME_PREFIX);
}

/** Who may frame a page: this site for a compare frame, nobody for every other page. */
export function frameAncestors(pathname: string): "'self'" | "'none'" {
  return isCompareFrame(pathname) ? "'self'" : "'none'";
}

/**
 * A frame is shown in the appearance the compare page asks for (`?mode=light|dark`), whatever the device or the
 * visitor's own setting says; both frames of a pair must match. Null for every other page and for no `mode`.
 */
export function frameAppearance(url: URL): Appearance | null {
  if (!isCompareFrame(url.pathname)) return null;
  const mode = url.searchParams.get("mode");
  return mode === "light" || mode === "dark" ? mode : null;
}

export function framePath(version: FrameVersion, slug: string, q: { format?: string | null; mode?: Appearance | null }): string {
  const p = new URLSearchParams();
  if (q.format) p.set("format", q.format);
  if (q.mode) p.set("mode", q.mode);
  const s = p.toString();
  return `${FRAME_PREFIX}${version}/${slug}${s ? `?${s}` : ""}`;
}
