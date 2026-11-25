import { createContext, useContext } from "react";
import { useFetcher } from "react-router";

/** True inside theme previews (gallery, settings): no report links on sample content. */
export const PreviewContext = createContext(false);
import type { ReportTargetType } from "~/lib/types";

const REASONS = ["Spam or scam", "Misleading price or product", "Offensive or abusive", "Personal information", "Something else"];

/** "Report" disclosure on lists, entries and comments. Works without JavaScript. */
export function ReportLink({ type, id, label = "Report" }: { type: ReportTargetType; id: string; label?: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const preview = useContext(PreviewContext);
  if (preview) return null;
  const done = fetcher.data?.ok;
  return (
    <details className="relative inline-block text-[0.78rem]">
      <summary className="textlink-btn">
        {label}
        <span className="sr-only"> this {type}</span>
      </summary>
      <div className="card fixed inset-x-4 bottom-4 z-40 p-4 text-left sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:w-72 sm:p-3">
        {done ? (
          <div className="flex items-center justify-between gap-2">
            <p role="status" className="text-sm">
              Thanks. We'll take a look. Urgent? Email{" "}
              <a href="mailto:hello@wantmcp.com" className="link">
                hello@wantmcp.com
              </a>
              .
            </p>
            <button type="button" className="btn btn-ghost btn-xs" onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}>
              Close
            </button>
          </div>
        ) : (
          <fetcher.Form method="post" action="/report" className="grid gap-2">
            <input type="hidden" name="target_type" value={type} />
            <input type="hidden" name="target_id" value={id} />
            <fieldset className="grid gap-1">
              <legend className="label mb-1">What's wrong with this {type}?</legend>
              {REASONS.map((r, i) => (
                <label key={r} className="check text-[0.85rem]">
                  <input type="radio" name="reason" value={r} required defaultChecked={i === 0} />
                  {r}
                </label>
              ))}
            </fieldset>
            <label className="field">
              <span className="label">Details (optional)</span>
              <textarea name="details" maxLength={800} className="textarea min-h-14" />
            </label>
            {fetcher.data?.error && <p className="form-error">{fetcher.data.error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}>
                Cancel
              </button>
              <button className="btn btn-sm" disabled={fetcher.state !== "idle"}>
                {fetcher.state !== "idle" ? "Sending…" : "Send report"}
              </button>
            </div>
          </fetcher.Form>
        )}
      </div>
    </details>
  );
}
