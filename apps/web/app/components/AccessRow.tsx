import { useFetcher } from "react-router";
import { agentMark } from "~/lib/brands";

/**
 * One row of who can work on a list, the same shape for a person and an agent (owner, 25 Nov 2026: agents "more visual
 * like we do with a human"): a mark, a name, one quiet line of facts, and at most one quiet action at the end.
 */
export function AccessRow({ mark, name, meta, action }: { mark: React.ReactNode; name: React.ReactNode; meta: React.ReactNode; action?: React.ReactNode }) {
  return (
    <li className="access-row">
      <span className="access-mark" aria-hidden="true">
        {mark}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-[0.8rem] text-ink-3">{meta}</p>
      </div>
      {action}
    </li>
  );
}

/** A person's mark: the same glyph people carry elsewhere (ActorTag). */
export function PersonMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="5.5" r="3" fill="currentColor" />
      <path d="M2.5 14c.6-3 2.9-4.5 5.5-4.5s4.9 1.5 5.5 4.5" fill="currentColor" />
    </svg>
  );
}

/** An agent's mark: its app's logo when we know it, else its initial. */
export function AgentMark({ name }: { name: string }) {
  const m = agentMark(name);
  if (!m) return <span className="text-[0.85rem] font-semibold">{name.slice(0, 1).toUpperCase()}</span>;
  return (
    <>
      <img src={m.light} alt="" width={20} height={20} className={m.dark ? "brand-logo-light" : ""} />
      {m.dark && <img src={m.dark} alt="" width={20} height={20} className="brand-logo-dark" />}
    </>
  );
}

/**
 * Remove, in two steps without a dialog: "Remove" opens "Remove Claude from this list?" with the button that does it.
 * A details element, so it works without JavaScript; the row goes when the page's data reloads after the action.
 */
export function RemoveInTwoSteps({
  question,
  label = "Remove",
  confirm = "Yes, remove",
  fields,
  who,
}: {
  question: string;
  label?: string;
  confirm?: string;
  fields: Record<string, string>;
  who: string;
}) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";
  return (
    <details className="row-remove">
      <summary className="hit textlink-btn text-[0.85rem]">
        <span className="rr-closed text-danger">
          {label}
          <span className="sr-only"> {who}</span>
        </span>
        <span className="rr-open text-ink-2">Cancel</span>
      </summary>
      <fetcher.Form method="post" className="row-remove-body">
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <span className="text-[0.85rem] text-ink-2">{question}</span>
        <button className="btn btn-danger btn-sm" disabled={busy}>
          {busy ? "Removing…" : confirm}
        </button>
        {fetcher.data?.error && (
          <span className="form-error w-full" role="alert">
            {fetcher.data.error}
          </span>
        )}
      </fetcher.Form>
    </details>
  );
}
