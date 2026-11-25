import { useState } from "react";

/** Copies `text` to the clipboard. Announces the result to screen readers. */
export function CopyButton({
  text,
  label = "Copy",
  className = "btn btn-ghost btn-xs",
  ariaLabel,
  icon,
}: {
  text: string;
  label?: string;
  className?: string;
  /** A fuller name for screen readers when the visible label is short. */
  ariaLabel?: string;
  /** Shown before the label (quiet toolbar controls). */
  icon?: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  return (
    <button
      type="button"
      className={className}
      aria-label={state === "idle" ? ariaLabel : undefined}
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
      {icon}
      <span aria-live="polite">{state === "done" ? "Copied" : state === "fail" ? "Press ⌘C" : label}</span>
    </button>
  );
}
