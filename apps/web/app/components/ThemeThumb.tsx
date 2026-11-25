import { ListView, type ItemWithEntries } from "~/components/ListView";
import type { Comment, ListSummary, PriceObservation } from "~/lib/types";
import type { ThemeView } from "~/themes/view";

export type ThemeSample = { list: ListSummary; items: ItemWithEntries[]; prices: Record<string, PriceObservation[]>; comments: Comment[] };

/** A miniature of a whole list page in a theme (gallery tiles, the settings picker). Decorative. */
export function ThemeThumb({ theme, sample, origin, className = "h-64", items }: { theme: ThemeView; sample: ThemeSample; origin: string; className?: string; items?: number }) {
  const indexed = theme.layout === "board" || theme.layout === "heat" || theme.layout === "sections";
  return (
    <div className={`theme-thumb relative overflow-hidden ${className}`} aria-hidden="true" inert>
      {/* A soft fade at the bottom instead of a row sliced in half. */}
      <div className="theme-thumb-fade" />
      <div className="theme-thumb-inner">
        <ListView
          list={sample.list}
          items={sample.items}
          suggestions={[]}
          comments={[]}
          commentsCursor={null}
          prices={sample.prices}
          isWriter={false}
          role={null}
          origin={origin}
          theme={theme}
          preview
          thumbnail
          previewItems={items ?? (indexed ? 4 : 2)}
        />
      </div>
    </div>
  );
}
