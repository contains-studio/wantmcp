import { memo } from "react";
import { ThemeThumb, type ThemeSample } from "./ThemeThumb";
import type { ThemeView } from "~/themes/view";

/**
 * A look drawn the same way everywhere (home "Pick a look", list settings › Look): a miniature of the list page in its
 * own hairline frame. Callers put the name (.look-name) and a note (.look-note) under it. Memoised: changing one
 * look's occasion re-dresses only the frames whose view changed.
 */
export const LookFrame = memo(function LookFrame({
  view,
  sample,
  origin,
  className,
  items,
}: {
  view: ThemeView;
  sample: ThemeSample;
  origin: string;
  className: string;
  items?: number;
}) {
  return (
    <div className="look-frame">
      <ThemeThumb theme={view} sample={sample} origin={origin} className={className} items={items} />
    </div>
  );
});
