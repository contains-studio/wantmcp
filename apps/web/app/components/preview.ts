import { createContext } from "react";

/** True inside theme previews (gallery, settings): no report links, menus or writes on sample content. */
export const PreviewContext = createContext(false);
