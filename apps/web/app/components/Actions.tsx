/**
 * The action system (docs/design-standards.md, "Actions"): quiet controls, one "⋯" menu per row
 * and a status control. Menus are native popovers: they open without JavaScript (popovertarget),
 * close on Escape or a click outside, and render above clipped containers.
 */
import { useContext, useEffect, useId, useRef, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { PreviewContext } from "./preview";
import type { IntentResult } from "./WriteTools";

/** A dashed-ident-safe version of a React id, for ids and anchor names. */
function useSafeId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** Only glyphs people already know (docs/design-standards.md): share, a cog, a flag, a plus. */
const ICONS = {
  // The share convention: a tray with an arrow leaving it upward.
  share: { d: "M5.5 6.5H4.5A1.5 1.5 0 0 0 3 8v5.5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5V8a1.5 1.5 0 0 0-1.5-1.5h-1M8 10V1.5M5.25 4.25 8 1.5l2.75 2.75", fill: false },
  // A cog with eight square teeth and a centre hole, drawn solid so it can't read as a sun.
  gear: {
    d: "M13.05 6.10 L15.06 6.57 L15.06 9.43 L13.05 9.90 L12.92 10.23 L14.00 11.98 L11.98 14.00 L10.23 12.92 L9.90 13.05 L9.43 15.06 L6.57 15.06 L6.10 13.05 L5.77 12.92 L4.02 14.00 L2.00 11.98 L3.08 10.23 L2.95 9.90 L0.94 9.43 L0.94 6.57 L2.95 6.10 L3.08 5.77 L2.00 4.02 L4.02 2.00 L5.77 3.08 L6.10 2.95 L6.57 0.94 L9.43 0.94 L9.90 2.95 L10.23 3.08 L11.98 2.00 L14.00 4.02 L12.92 5.77Z M10.20 8 A2.2 2.2 0 1 0 5.80 8 A2.2 2.2 0 1 0 10.20 8Z",
    fill: true,
  },
  flag: { d: "M3.5 14V2.5M3.5 3h8l-1.8 3 1.8 3h-8", fill: false },
  plus: { d: "M8 3v10M3 8h10", fill: false },
} as const;

export function Icon({ name }: { name: keyof typeof ICONS }) {
  const { d, fill } = ICONS[name];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      {fill ? (
        <path d={d} fill="currentColor" fillRule="evenodd" />
      ) : (
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** Closes the popover menu that holds `el`, if any. */
export function closeMenuOf(el: Element | null | undefined) {
  const pop = el?.closest("[popover]") as (HTMLElement & { hidePopover?: () => void }) | null;
  try {
    pop?.hidePopover?.();
  } catch {
    // already closed
  }
}

/**
 * A popover menu. `label` names it for screen readers ("More actions for …"); `trigger` is what
 * the button shows (the "⋯" glyph by default, or text for a quiet action like "Mark bought").
 */
export function Menu({
  label,
  trigger,
  triggerClass,
  children,
  wide = false,
  iconTrigger = false,
  sheetTitle,
}: {
  label: string;
  /** On a phone the menu is a sheet at the bottom of the screen: this names what it is for (a list's title). */
  sheetTitle?: string;
  /** The trigger shows only an icon: `label` becomes its accessible name and tooltip. */
  iconTrigger?: boolean;
  trigger?: ReactNode;
  triggerClass?: string;
  children: ReactNode;
  /** Holds a form rather than a list of actions. */
  wide?: boolean;
}) {
  const id = useSafeId("m");
  const preview = useContext(PreviewContext);
  const anchor = `--${id}`;
  // Previews (gallery, persona pages) are read-only: no menu, just whatever the trigger shows.
  if (preview) return trigger && !iconTrigger ? <span className={triggerClass}>{trigger}</span> : null;
  return (
    <span className="menu-wrap">
      <button
        type="button"
        popoverTarget={id}
        className={triggerClass ?? "menu-trigger"}
        aria-label={trigger && !iconTrigger ? undefined : label}
        title={trigger && !iconTrigger ? undefined : label}
        style={{ anchorName: anchor } as React.CSSProperties}
      >
        {trigger ?? <span aria-hidden="true">⋯</span>}
      </button>
      {(
        <div id={id} popover="auto" role="group" aria-label={label} className={`menu-panel ${wide ? "menu-wide" : ""}`} style={{ positionAnchor: anchor } as React.CSSProperties}>
          {sheetTitle && (
            <p className="menu-sheet-title" aria-hidden="true">
              {sheetTitle}
            </p>
          )}
          {children}
        </div>
      )}
    </span>
  );
}

/** A menu entry that reveals a small form or a confirmation in place. */
export function MenuSub({ label, danger = false, id, children }: { label: ReactNode; danger?: boolean; id?: string; children: ReactNode }) {
  return (
    <details className="menu-sub group" id={id}>
      <summary className={`menu-item ${danger ? "is-danger" : ""}`}>
        <span className="flex-1">{label}</span>
        <span aria-hidden="true" className="text-ink-3 transition group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="menu-sub-body">{children}</div>
    </details>
  );
}

/** "Remove": red, inside a menu, and it asks once more before it acts (no JavaScript needed). */
export function MenuRemove({ intent, fields, label, confirmText }: { intent: string; fields: Record<string, string>; label: string; confirmText: string }) {
  const fetcher = useFetcher<IntentResult>();
  return (
    <MenuSub label={label} danger>
      <fetcher.Form method="post" className="grid gap-2">
        <input type="hidden" name="intent" value={intent} />
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <p className="text-[0.85rem] text-ink-2">{confirmText}</p>
        <button className="btn btn-danger btn-sm w-fit" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Removing…" : `Yes, ${label.toLowerCase()}`}
        </button>
        {fetcher.data?.error && (
          <p className="form-error" role="alert">
            {fetcher.data.error}
          </p>
        )}
      </fetcher.Form>
    </MenuSub>
  );
}

/** Closes the surrounding menu once a fetcher has finished successfully. */
export function useCloseOnDone(fetcher: { state: string; data?: IntentResult | unknown }) {
  const ref = useRef<HTMLFormElement>(null);
  const ok = fetcher.state === "idle" && (fetcher.data as IntentResult | undefined)?.ok;
  useEffect(() => {
    if (ok) closeMenuOf(ref.current);
  }, [ok]);
  return ref;
}
