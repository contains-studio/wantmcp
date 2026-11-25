import { useState } from "react";

/** Copies `text` to the clipboard. Announces the result to screen readers. */
export function CopyButton({ text, label = "Copy", className = "btn btn-ghost btn-xs" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  return (
    <button
      type="button"
      className={className}
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
      <span aria-live="polite">{state === "done" ? "Copied" : state === "fail" ? "Press ⌘C" : label}</span>
    </button>
  );
}
