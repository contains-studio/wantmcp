import { useFetcher } from "react-router";
import type { ReportTargetType } from "~/lib/types";

const REASONS = ["Spam or scam", "Misleading price or product", "Offensive or abusive", "Personal information", "Something else"];

/** "Report" disclosure on lists, entries and comments. Works without JavaScript. */
export function ReportLink({ type, id, label = "Report" }: { type: ReportTargetType; id: string; label?: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const done = fetcher.data?.ok;
  return (
    <details className="relative inline-block text-[0.78rem]">
      <summary className="textlink-btn">
        {label}
        <span className="sr-only"> this {type}</span>
      </summary>
      <div className="card absolute right-0 z-20 mt-2 w-[min(18rem,80vw)] p-3 text-left">
        {done ? (
          <p role="status" className="text-sm">Thanks. We'll take a look.</p>
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
              <span className="hint">Details (optional)</span>
              <textarea name="details" maxLength={800} className="textarea min-h-14 text-sm" />
            </label>
            {fetcher.data?.error && <p className="form-error">{fetcher.data.error}</p>}
            <button className="btn btn-sm" disabled={fetcher.state !== "idle"}>
              {fetcher.state !== "idle" ? "Sending…" : "Send report"}
            </button>
          </fetcher.Form>
        )}
      </div>
    </details>
  );
}
