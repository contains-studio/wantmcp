import { createContext } from "react";

/** True inside theme previews (gallery, settings): no report links, menus or writes on sample content. */
export const PreviewContext = createContext(false);

/** The heading level a list's title takes (1 on a list page; deeper when a page shows several lists). */
export const HeadingBase = createContext(1);

/** The tag for a heading `offset` levels below the list title. */
export function headingTag(base: number, offset: number): "h1" | "h2" | "h3" | "h4" | "h5" | "h6" {
  return `h${Math.min(6, base + offset)}` as "h1";
}
