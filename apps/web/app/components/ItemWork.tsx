/**
 * Items on task and research lists (SPEC 11): status (open, in progress, done), details and due
 * dates, text entries (updates and answers with links) and accepted answers.
 */
import { useEffect, useId, useRef } from "react";
import { useFetcher } from "react-router";
import { formatDate } from "~/lib/format";
import type { FormatInfo } from "~/lib/formats";
import { useNow } from "~/lib/hooks";
import type { ActorRef, Comment, Entry, ItemStatus } from "~/lib/types";
import { ActorTag } from "./ActorTag";
import { CommentForm, CommentList } from "./Comments";
import { ExtLink, Linkify } from "./ExtLink";
import { ReportLink } from "./Report";
import { Time } from "./Time";
import { RemoveButton, type IntentResult } from "./WriteTools";

export const actorLabel = (a: ActorRef | null | undefined) =>
  !a ? "someone" : a.kind === "user" ? a.handle : a.kind === "agent" ? a.name : a.name ?? "an outside agent";

/** "Due Fri 28 Nov", flagged when overdue and not done. */
export function DueChip({ due, done }: { due: string | null | undefined; done: boolean }) {
  const now = useNow();
  if (!due) return null;
  const overdue = !done && Date.parse(due) < now;
  return (
    <span className={`chip ${overdue ? "chip-warn" : ""}`}>
      {overdue ? "Overdue: " : "Due "}
      <time dateTime={due}>{formatDate(due)}</time>
    </span>
  );
}

/** The item's longer description, written by a list writer. */
export function ItemDetails({ details }: { details: string | undefined }) {
  if (!details) return null;
  return (
    <p className="item-details item-indent max-w-3xl whitespace-pre-line break-words text-[0.95rem] text-ink-2 sm:pl-11">
      <Linkify text={details} />
    </p>
  );
}

function StatusButton({ itemId, status, label, kind = "ghost", note }: { itemId: string; status: ItemStatus; label: string; kind?: "ghost" | "solid"; note?: boolean }) {
  const fetcher = useFetcher<IntentResult>();
  const uid = useId();
  const busy = fetcher.state !== "idle";
  if (note) {
    return (
      <details className="relative">
        <summary className={`btn btn-xs ${kind === "solid" ? "" : "btn-ghost"} w-fit`}>{label}</summary>
        <fetcher.Form method="post" className="card absolute left-0 z-20 mt-2 grid w-[min(20rem,80vw)] gap-2 p-3">
          <input type="hidden" name="intent" value="set-status" />
          <input type="hidden" name="item_id" value={itemId} />
          <input type="hidden" name="status" value={status} />
          <label className="field" htmlFor={`${uid}-n`}>
            <span className="label">Note (optional)</span>
            <textarea id={`${uid}-n`} name="note" maxLength={1000} className="textarea min-h-14" placeholder="What was done, anything to know…" />
          </label>
          <button className="btn btn-sm" disabled={busy}>
            {busy ? "Saving…" : label}
          </button>
          {fetcher.data?.error && <p className="form-error">{fetcher.data.error}</p>}
        </fetcher.Form>
      </details>
    );
  }
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="set-status" />
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="status" value={status} />
      <button className={`btn btn-xs ${kind === "solid" ? "" : "btn-ghost"}`} disabled={busy}>
        {busy ? "Saving…" : label}
      </button>
      {fetcher.data?.error && <span className="ml-2 text-[0.8rem] text-danger">{fetcher.data.error}</span>}
    </fetcher.Form>
  );
}

/**
 * Status line for task and research items: who claimed it, when it was done, and the
 * controls to move it along (writers only).
 */
export function ItemStatusBar({
  itemId,
  status,
  claimedBy,
  completion,
  fi,
  canWrite,
}: {
  itemId: string;
  status: ItemStatus;
  claimedBy: ActorRef | null | undefined;
  completion: { completed_at: string; completed_by: ActorRef; note: string | null; entry_id: string | null } | null | undefined;
  fi: FormatInfo;
  canWrite: boolean;
}) {
  const research = fi.format === "research";
  return (
    <div className="item-status item-indent flex flex-wrap items-center gap-2 text-[0.88rem] sm:pl-11">
      {status === "open" && <span className="chip">Open</span>}
      {status === "in_progress" && (
        <span className="chip chip-warn">
          In progress{claimedBy ? <> · {actorLabel(claimedBy)} is on it</> : null}
        </span>
      )}
      {status === "done" && completion && (
        <span className="chip chip-live">
          {research ? "Answered" : "Done"} · {actorLabel(completion.completed_by)}, <Time ts={completion.completed_at} />
        </span>
      )}
      {status === "done" && !completion && <span className="chip chip-live">{research ? "Answered" : "Done"}</span>}
      {canWrite && status === "open" && <StatusButton itemId={itemId} status="in_progress" label={research ? "Start researching" : "Start"} />}
      {canWrite && status === "in_progress" && <StatusButton itemId={itemId} status="open" label="Stop" />}
      {canWrite && status !== "done" && !research && <StatusButton itemId={itemId} status="done" label="Mark done" kind="solid" note />}
      {canWrite && status !== "done" && research && <StatusButton itemId={itemId} status="done" label="Mark answered" note />}
      {canWrite && status === "done" && <StatusButton itemId={itemId} status="open" label="Reopen" />}
      {status === "done" && completion?.note && (
        <p className="w-full whitespace-pre-line break-words text-ink-2">
          <span className="font-semibold text-ink">Note: </span>
          {completion.note}
        </p>
      )}
    </div>
  );
}

function Links({ links }: { links: string[] | undefined }) {
  if (!links?.length) return null;
  return (
    <ul className="grid gap-1 text-[0.85rem]">
      {links.map((u) => (
        <li key={u} className="flex min-w-0 items-start gap-1.5">
          <span aria-hidden="true" className="text-ink-3">↗</span>
          <ExtLink href={u} className="link min-w-0 break-all">
            {u.replace(/^https:\/\/(www\.)?/, "")}
            <span className="sr-only"> (opens in a new tab)</span>
          </ExtLink>
        </li>
      ))}
    </ul>
  );
}

/** An update (tasks) or answer (research): a title, a body and links, no price. */
export function TextEntryCard({
  entry,
  fi,
  comments,
  canWrite,
  canEdit,
  canDeleteComment,
  accepted,
  itemDone,
}: {
  entry: Entry;
  fi: FormatInfo;
  comments: Comment[];
  canWrite: boolean;
  canEdit: boolean;
  canDeleteComment: (c: Comment) => boolean;
  accepted: boolean;
  itemDone: boolean;
}) {
  const titleId = `${entry.id}-title`;
  const research = fi.format === "research";
  const links = entry.links?.length ? entry.links : entry.product_url ? [entry.product_url] : [];
  return (
    <article id={entry.id} aria-labelledby={titleId} className={`text-entry card grid scroll-mt-24 gap-3 p-4 sm:p-5 ${accepted ? "ring-2 ring-deal" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={titleId} className="min-w-0 font-sans text-[1.02rem] font-semibold leading-snug tracking-normal">
          {entry.title}
        </h3>
        {accepted && <span className="stamp shrink-0">Accepted</span>}
      </div>
      {entry.description && (
        <div className="entry-body whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-ink-2">{entry.description}</div>
      )}
      <Links links={links} />
      <div className="entry-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] text-ink-3">
        <ActorTag actor={entry.author} />
        <Time ts={entry.created_at} />
        <span className="ml-auto">
          <ReportLink type="entry" id={entry.id} />
        </span>
      </div>
      {(canWrite || comments.length > 0) && (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-t border-line pt-2">
          {canWrite && research && !accepted && <AcceptAnswer itemId={entry.item_id} entryId={entry.id} />}
          {canWrite && !research && !itemDone && <DoneWith itemId={entry.item_id} entryId={entry.id} />}
          <details className="group w-full">
            <summary className="textlink-btn text-[0.8rem]">
              {comments.length ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Comment"}{" "}
              <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
            </summary>
            <div className="mt-2 grid gap-3">
              <CommentList comments={comments} canDelete={canDeleteComment} />
              {canWrite && <CommentForm targetType="entry" targetId={entry.id} label={`Comment on this ${fi.entry}`} />}
            </div>
          </details>
          {canEdit && (
            <>
              <details className="group w-full">
                <summary className="textlink-btn text-[0.8rem]">
                  Edit {fi.entry} <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
                </summary>
                <TextEntryForm itemId={entry.item_id} fi={fi} entry={entry} />
              </details>
              <RemoveButton
                intent="delete-entry"
                fields={{ entry_id: entry.id }}
                label={`Remove ${fi.entry}`}
                confirmText={`Remove “${entry.title}” and its comments?`}
              />
            </>
          )}
        </div>
      )}
    </article>
  );
}

function AcceptAnswer({ itemId, entryId }: { itemId: string; entryId: string }) {
  const fetcher = useFetcher<IntentResult>();
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="set-status" />
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="status" value="done" />
      <input type="hidden" name="entry_id" value={entryId} />
      <button className="btn btn-xs" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving…" : "Accept this answer"}
      </button>
    </fetcher.Form>
  );
}

function DoneWith({ itemId, entryId }: { itemId: string; entryId: string }) {
  const fetcher = useFetcher<IntentResult>();
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="set-status" />
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="status" value="done" />
      <input type="hidden" name="entry_id" value={entryId} />
      <button className="btn btn-ghost btn-xs" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving…" : "Done with this"}
      </button>
    </fetcher.Form>
  );
}

/** The accepted answer, shown above the other answers on a research item. */
export function AcceptedAnswer({ entry }: { entry: Entry }) {
  const links = entry.links?.length ? entry.links : entry.product_url ? [entry.product_url] : [];
  return (
    <section aria-label="Accepted answer" className="accepted-answer item-indent sm:ml-11">
      <div className="grid gap-3 rounded-[var(--r-card,1.1rem)] border-2 border-deal bg-deal-soft p-4 sm:p-5">
        <p className="eyebrow text-deal">Accepted answer</p>
        <p className="font-display text-[1.3rem] font-bold leading-snug text-ink">{entry.title}</p>
        {entry.description && <div className="whitespace-pre-line break-words text-[1rem] leading-relaxed text-ink">{entry.description}</div>}
        <Links links={links} />
        <p className="flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-2">
          <ActorTag actor={entry.author} compact /> <Time ts={entry.created_at} />
          <a href={`#${entry.id}`} className="link ml-auto">
            See it with comments
          </a>
        </p>
      </div>
    </section>
  );
}

/** Add or edit an update or answer: title, body and up to eight links. */
export function TextEntryForm({ itemId, fi, entry }: { itemId: string; fi: FormatInfo; entry?: Entry }) {
  const fetcher = useFetcher<IntentResult>();
  const ref = useRef<HTMLFormElement>(null);
  const uid = useId();
  const editing = Boolean(entry);
  const done = fetcher.state === "idle" && fetcher.data?.ok;
  useEffect(() => {
    if (done && !editing) ref.current?.reset();
  }, [done, editing]);
  const links = entry ? (entry.links?.length ? entry.links : entry.product_url ? [entry.product_url] : []) : [];
  return (
    <fetcher.Form method="post" ref={ref} className="mt-3 grid gap-3">
      <input type="hidden" name="intent" value={editing ? "edit-text-entry" : "add-text-entry"} />
      <input type="hidden" name="item_id" value={itemId} />
      {entry && <input type="hidden" name="entry_id" value={entry.id} />}
      <label className="field" htmlFor={`${uid}-t`}>
        <span className="label">{fi.format === "research" ? "Answer in a sentence" : "Title"}</span>
        <input id={`${uid}-t`} name="title" required maxLength={140} defaultValue={entry?.title} className="input" />
      </label>
      <label className="field" htmlFor={`${uid}-b`}>
        <span className="label">{fi.format === "research" ? "The answer in full" : "Details"}</span>
        <textarea id={`${uid}-b`} name="description" maxLength={4000} defaultValue={entry?.description} className="textarea min-h-32" />
      </label>
      <label className="field" htmlFor={`${uid}-l`}>
        <span className="label">
          Links <span className="font-normal text-ink-3">(optional, one per line, up to 8)</span>
        </span>
        <textarea id={`${uid}-l`} name="links" defaultValue={links.join("\n")} className="textarea min-h-16 font-mono text-[0.85rem]" placeholder="https://" />
      </label>
      {fetcher.data?.error && (
        <p className="form-error" role="alert">
          {fetcher.data.error}
        </p>
      )}
      <div className="flex items-center gap-3" aria-live="polite">
        <button className="btn btn-sm w-fit" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Saving…" : editing ? "Save changes" : fi.addEntryLabel}
        </button>
        {done && <span className="text-[0.85rem] text-deal">{editing ? "Saved." : "Posted."}</span>}
      </div>
    </fetcher.Form>
  );
}
