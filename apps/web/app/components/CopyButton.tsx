import { useState } from "react";

/** Copies `text` to the clipboard. Announces the result to screen readers. */
export function CopyButton({
  text,
  label = "Copy",
  className = "btn btn-ghost btn-xs",
  ariaLabel,
  icon,
  iconOnly = false,
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
}) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  return (
    <button
      type="button"
      className={className}
      aria-label={iconOnly ? ariaLabel ?? label : state === "idle" ? ariaLabel : undefined}
      title={iconOnly ? ariaLabel ?? label : undefined}
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
      {iconOnly && state === "done" ? <span aria-hidden="true">✓</span> : icon}
      <span aria-live="polite" className={iconOnly ? "sr-only" : undefined}>
        {state === "done" ? "Copied" : state === "fail" ? "Press ⌘C" : iconOnly ? "" : label}
      </span>
    </button>
  );
}
