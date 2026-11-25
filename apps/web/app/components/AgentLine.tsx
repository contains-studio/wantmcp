import { useState } from "react";

/**
 * The other way in, under the home page's button (owner, 25 Nov 2026: they said this to Muse and it
 * set the list up by itself). The words are the owner's, written as the person would say them, so
 * they can be pasted to an agent as they are. Tapping copies them and says what to do next.
 */
export const AGENT_LINE = "set up wantmcp.com for keeping track of the things I want";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and in-app web views: the selection-based copy.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function AgentLine() {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  return (
    <div className="-mt-2 grid max-w-full justify-items-center gap-1.5">
      <p className="text-[0.92rem] text-ink-3" aria-live="polite">
        {state === "done" ? (
          <span className="font-medium text-ink">Copied. Now share with your agent.</span>
        ) : state === "fail" ? (
          "Could not copy. Type it to your agent as written."
        ) : (
          "Or just tell your agent:"
        )}
      </p>
      <button
        type="button"
        className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2.5 rounded-2xl bg-sunk px-4 py-2.5 text-left text-[0.98rem] text-ink transition-colors hover:bg-line"
        onClick={async () => {
          setState((await copyText(AGENT_LINE)) ? "done" : "fail");
          setTimeout(() => setState("idle"), 4000);
        }}
      >
        <span className="sr-only">Copy: </span>
        <span className="italic">“{AGENT_LINE}”</span>
        {state === "done" ? (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 text-ink-2">
            <path d="M3.5 9.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          // The copy convention: two overlapping sheets.
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 text-ink-2">
            <rect x="6.25" y="6.25" width="9" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11.75 3.75v-.5a1.5 1.5 0 0 0-1.5-1.5h-6a1.5 1.5 0 0 0-1.5 1.5v6a1.5 1.5 0 0 0 1.5 1.5h.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
