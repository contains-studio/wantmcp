/**
 * The exhibits of /explorations/redesigning-the-looks. The essay shows each look before and after November 2026, live,
 * so the versions that left the product are kept here as exhibits: their definitions (./looks-before) and stylesheets
 * (public/theme-css/explorations), under wrapper classes of their own (`was-<slug>`, `prop-<slug>`). Only the essay's
 * frames load them; no list, preview or picker does.
 */
import type { ItemWithEntries } from "~/components/ListView";
import type { BuiltSample } from "~/lib/samples";
import type { FrameVersion } from "~/lib/exhibits";
import { getThemeView, resolveLook } from "~/themes/catalogue.server";
import type { Theme } from "~/themes/types";
import { lookView, type ThemeView } from "~/themes/view";
import { board } from "./looks-before/board";
import { doc } from "./looks-before/doc";
import { gallery } from "./looks-before/gallery";
import { heat } from "./looks-before/heat";
import { sections } from "./looks-before/sections";
import { sheet } from "./looks-before/sheet";
import { today } from "./looks-before/today";
import { tracker } from "./looks-before/tracker";

/** The eight looks as they were before the redesign. */
export const BEFORE_TEMPLATES: Theme[] = [sheet, today, doc, board, sections, heat, tracker, gallery];
const BEFORE = new Map(BEFORE_TEMPLATES.map((t) => [t.slug, t]));

/**
 * Doc and Heat as they were redrawn and not adopted (the owner preferred the old ones). Fonts and shapes come from their
 * stylesheets; Heat followed the device instead of being always dark.
 */
const PROPOSED = new Map<string, Theme>([
  ["doc", { ...doc, fonts: undefined, traits: ["common"], accents: undefined, contrast: undefined, radius: { card: "10px", image: "6px" }, card: "flat" }],
  ["heat", { ...heat, fonts: undefined, traits: ["common"], scheme: undefined, radius: { card: "14px", image: "6px" }, card: "flat" }],
]);
export const PROPOSED_SLUGS = [...PROPOSED.keys()];

/** Whether a look has this version to show. */
export function hasVersion(version: FrameVersion, template: string): boolean {
  if (version === "proposed") return PROPOSED.has(template);
  if (version === "first-drawn") return template === "sections";
  return BEFORE.has(template);
}

/** A look in one of the essay's versions; `after` is the look as the product draws it today. */
export function exhibitView(version: FrameVersion, slug: string): ThemeView {
  const look = resolveLook(slug);
  const tpl = look.template.slug;
  const occasion = look.occasion?.stylesheet ? [`/theme-css/${look.occasion.slug}.css`] : [];
  if (version === "after") return getThemeView(look.slug);
  if (version === "first-drawn") {
    const view = getThemeView(look.slug);
    return { ...view, stylesheets: [...view.stylesheets, "/theme-css/explorations/looks-before/sections-as-first-drawn.css"] };
  }
  if (version === "proposed") {
    const view = lookView(PROPOSED.get(tpl)!, look.occasion, look.slug);
    return {
      ...view,
      className: view.className.replace(`tpl-${tpl}`, `prop prop-${tpl}`),
      stylesheets: ["/theme-css/common.css", `/theme-css/explorations/looks-proposed/${tpl}.css`, ...occasion],
    };
  }
  const was = BEFORE.get(tpl)!;
  const view = lookView(was, look.occasion, look.slug);
  return {
    ...view,
    className: view.className.replace(`tpl-${tpl}`, `was was-${tpl}`),
    // Gallery had no stylesheet of its own before: its rules were, and are, the shared ones.
    stylesheets: [...(was.stylesheet ? [`/theme-css/explorations/looks-before/${tpl}.css`] : []), ...occasion],
  };
}

/**
 * The sample list with some items flipped (ticked, or unticked if they came finished). Nothing is stored: the flipped
 * ids are whatever the frame's address carries.
 */
export function flipSample(sample: BuiltSample, ids: string[], now: number): BuiltSample {
  if (!ids.length) return sample;
  const shopping = sample.list.format === "shopping";
  const me = { kind: "user" as const, handle: sample.list.owner_handle };
  const at = new Date(now).toISOString().replace(/\.\d{3}Z$/, "Z");
  const items = sample.items.map((it): ItemWithEntries => {
    if (!ids.includes(it.id)) return it;
    const done = shopping ? !!it.purchase : it.status === "done";
    if (done) return { ...it, status: "open", purchase: null, completion: null } as ItemWithEntries;
    return shopping
      ? ({ ...it, purchase: { purchased_at: at, purchased_by: me, retailer: null, price: null, currency: "USD", entry_id: null } } as unknown as ItemWithEntries)
      : ({ ...it, status: "done", claimed_by: null, claimed_at: null, completion: { completed_at: at, completed_by: me, note: null, entry_id: null } } as unknown as ItemWithEntries);
  });
  return { ...sample, items };
}
