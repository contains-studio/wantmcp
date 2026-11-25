import { useState } from "react";

/** Copies `text` to the clipboard. Announces the result to screen readers. */
export function CopyButton({
  text,
  label = "Copy",
  className = "btn btn-ghost btn-xs",
  ariaLabel,
  icon,
  iconOnly = false,
  labelClass,
  doneText = "Copied",
  tooltip,
}: {
  text: string;
  label?: string;
  className?: string;
  /** A fuller name for screen readers when the visible label is short. */
  ariaLabel?: string;
  /** Shown before the label (quiet toolbar controls). */
  icon?: React.ReactNode;
  /** Icon only: the label becomes the accessible name and tooltip; the state is announced. */
  iconOnly?: boolean;
  /** A class for the visible label (e.g. shown only from 640px up, screen-reader text below). */
  labelClass?: string;
  /** What the button says once copied. */
  doneText?: string;
  /** A tooltip (and long-press title on phones). */
  tooltip?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  return (
    <button
      type="button"
      className={className}
      aria-label={iconOnly ? ariaLabel ?? label : state === "idle" ? ariaLabel : undefined}
      title={tooltip ?? (iconOnly ? ariaLabel ?? label : undefined)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("done");
        } catch {
          setState("fail");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
    >
      {(iconOnly || labelClass) && state === "done" ? <span aria-hidden="true">✓</span> : icon}
      <span aria-live="polite" className={iconOnly ? "sr-only" : labelClass}>
        {state === "done" ? doneText : state === "fail" ? "Press ⌘C" : iconOnly ? "" : label}
      </span>
    </button>
  );
}
