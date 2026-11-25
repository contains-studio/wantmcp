import { useContext } from "react";
import { useFetcher } from "react-router";
import type { ReportTargetType } from "~/lib/types";
import { Icon, Menu, MenuSub } from "./Actions";
import { PreviewContext } from "./preview";

export { PreviewContext };

const REASONS = ["Spam or scam", "Misleading price or product", "Offensive or abusive", "Personal information", "Something else"];

/** The report form. Posts to /report, so it also works without JavaScript. */
function ReportForm({ type, id }: { type: ReportTargetType; id: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  if (fetcher.data?.ok) {
    return (
      <p role="status" className="text-[0.85rem]">
        Thanks. We'll take a look. Urgent? Email{" "}
        <a href="mailto:hello@wantmcp.com" className="link">
          hello@wantmcp.com
        </a>
        .
      </p>
    );
  }
  return (
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
      <button className="btn btn-ghost btn-sm w-fit" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Sending…" : "Send report"}
      </button>
    </fetcher.Form>
  );
}

/** "Report" as an entry in a row's "⋯" menu. */
export function ReportMenuItem({ type, id }: { type: ReportTargetType; id: string }) {
  const preview = useContext(PreviewContext);
  if (preview) return null;
  return (
    <MenuSub label={<>Report<span className="sr-only"> this {type}</span></>}>
      <ReportForm type={type} id={id} />
    </MenuSub>
  );
}

/** "Report" as a quiet control of its own (the list toolbar, for visitors). */
export function ReportLink({ type, id, label = "Report" }: { type: ReportTargetType; id: string; label?: string }) {
  const preview = useContext(PreviewContext);
  if (preview) return null;
  return (
    <Menu
      label={`${label} this ${type}`}
      wide
      iconTrigger
      triggerClass="btn-icon"
      trigger={<Icon name="flag" />}
    >
      <div className="p-3">
        <ReportForm type={type} id={id} />
      </div>
    </Menu>
  );
}
