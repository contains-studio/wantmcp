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

const ICONS = {
  link: "M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1",
  gear: "M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zM8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1",
  flag: "M3.5 14V2.5M3.5 3h8l-1.8 3 1.8 3h-8",
  plus: "M8 3v10M3 8h10",
} as const;

export function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
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
}: {
  label: string;
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
  return (
    <span className="menu-wrap">
      <button
        type="button"
        popoverTarget={preview ? undefined : id}
        className={triggerClass ?? "menu-trigger"}
        aria-label={trigger && !iconTrigger ? undefined : label}
        title={trigger && !iconTrigger ? undefined : label}
        style={{ anchorName: anchor } as React.CSSProperties}
      >
        {trigger ?? <span aria-hidden="true">⋯</span>}
      </button>
      {!preview && (
        <div id={id} popover="auto" role="group" aria-label={label} className={`menu-panel ${wide ? "menu-wide" : ""}`} style={{ positionAnchor: anchor } as React.CSSProperties}>
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
