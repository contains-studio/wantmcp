/**
 * Exhibit frames of the interactive essay at /explorations/redesigning-the-looks. An exhibit is a real list page of this
 * site, shown inside the essay in a frame, which the site otherwise forbids everywhere (no page may be framed). The two
 * exceptions below apply to frame addresses only: this site alone may frame them, and `?mode=` sets their appearance.
 */
export const ESSAY_PATH = "/explorations/redesigning-the-looks";
export const FRAME_PREFIX = `${ESSAY_PATH}/frame/`;

/** before: as it was · after: as it runs today · proposed: redrawn and not adopted (Doc, Heat) · first-drawn: Sections' bug. */
export type FrameVersion = "before" | "after" | "proposed" | "first-drawn";
export const FRAME_VERSIONS: readonly FrameVersion[] = ["before", "after", "proposed", "first-drawn"];
export type Appearance = "light" | "dark";

export function isExhibitFrame(pathname: string): boolean {
  return pathname.startsWith(FRAME_PREFIX);
}

/** Who may frame a page: this site for an exhibit frame, nobody for every other page. */
export function frameAncestors(pathname: string): "'self'" | "'none'" {
  return isExhibitFrame(pathname) ? "'self'" : "'none'";
}

/**
 * A frame is shown in the appearance the essay asks for (`?mode=light|dark`), whatever the device or the visitor's own
 * setting says; both sides of a pair must match. Null for every other page and for no `mode`.
 */
export function frameAppearance(url: URL): Appearance | null {
  if (!isExhibitFrame(url.pathname)) return null;
  const mode = url.searchParams.get("mode");
  return mode === "light" || mode === "dark" ? mode : null;
}

export function framePath(version: FrameVersion, slug: string, q: { format?: string | null; mode?: Appearance | null; head?: boolean } = {}): string {
  const p = new URLSearchParams();
  if (q.format) p.set("format", q.format);
  if (q.mode) p.set("mode", q.mode);
  if (q.head) p.set("head", "1");
  const s = p.toString();
  return `${FRAME_PREFIX}${version}/${slug}${s ? `?${s}` : ""}`;
}

/**
 * Ticking in an exhibit saves nothing: the items a reader has flipped travel in the frame's own address (`?flip=`), and
 * the sample list is drawn with those flipped. Flipping one again takes it back out.
 */
export function flipped(search: URLSearchParams): string[] {
  return (search.get("flip") ?? "").split(",").filter((id) => /^itm_[A-Za-z0-9_]+$/.test(id)).slice(0, 20);
}
export function withFlip(url: URL, itemId: string): string {
  const now = flipped(url.searchParams);
  const next = now.includes(itemId) ? now.filter((id) => id !== itemId) : [...now, itemId];
  const p = new URLSearchParams(url.searchParams);
  if (next.length) p.set("flip", next.join(","));
  else p.delete("flip");
  const s = p.toString();
  return `${url.pathname}${s ? `?${s}` : ""}`;
}
