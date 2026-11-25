/**
 * Items on task and research lists (SPEC 11): status (open, in progress, done), details and due
 * dates, text entries (updates and answers with links) and accepted answers.
 */
import { useContext, useEffect, useId, useRef } from "react";
import { HeadingBase, headingTag } from "./preview";
import { useFetcher } from "react-router";
import { formatDate } from "~/lib/format";
import type { FormatInfo } from "~/lib/formats";
import { useNow, useRootData } from "~/lib/hooks";
import type { ActorRef, Comment, Entry, ItemStatus, Question } from "~/lib/types";
import { ActorTag } from "./ActorTag";
import { CommentForm, CommentList } from "./Comments";
import { ExtLink, Linkify } from "./ExtLink";
import { Menu, MenuRemove, MenuSub, useCloseOnDone } from "./Actions";
import { ReportMenuItem } from "./Report";
import { Time } from "./Time";
import type { IntentResult } from "./WriteTools";

export const actorLabel = (a: ActorRef | null | undefined) =>
  !a ? "someone" : a.kind === "user" ? a.handle : a.kind === "agent" ? a.name : a.name ?? "an outside agent";

/** Like actorLabel, but "you" for the person looking (never their own generated handle). */
export function useActorLabel() {
  const me = useRootData().user?.handle ?? null;
  return (a: ActorRef | null | undefined) => (a?.kind === "user" && me !== null && a.handle === me ? "you" : actorLabel(a));
}

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

/**
 * Status line for task and research items: who claimed it, when it was done, and the
 * controls to move it along (writers only).
 */
/** How long a claim has been held: "4 min", "3 h", "2 days". */
export function claimAge(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const ms = Math.max(0, now - Date.parse(iso));
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "1 day" : `${d} days`;
}

const STALE_CLAIM = 24 * 3600_000;

export function ItemStatusBar({
  itemId,
  status,
  claimedBy,
  claimedAt,
  completion,
  statusNote,
  statusNoteAt,
  fi,
  canWrite,
}: {
  itemId: string;
  /** What the agent said it is doing (with in_progress, or a release back to open). */
  statusNote?: string | null;
  statusNoteAt?: string | null;
  status: ItemStatus;
  claimedBy: ActorRef | null | undefined;
  claimedAt?: string | null;
  completion: { completed_at: string; completed_by: ActorRef; note: string | null; entry_id: string | null } | null | undefined;
  fi: FormatInfo;
  canWrite: boolean;
}) {
  const now = useNow();
  const actorLabel = useActorLabel();
  const research = fi.format === "research";
  const shopping = fi.format === "shopping";
  const age = claimAge(claimedAt, now);
  const stale = !!claimedAt && now - Date.parse(claimedAt) > STALE_CLAIM;
  const doneWord = research ? "Answered" : "Done";
  let text: React.ReactNode;
  let tone = "";
  if (status === "open") text = "Open";
  else if (status === "waiting_on_owner") {
    text = canWrite ? "Waiting on you" : "Waiting on the owner";
    tone = "chip-warn";
  } else if (status === "in_progress") {
    text = (
      <>
        In progress
        {claimedBy ? ` · ${actorLabel(claimedBy)}${age ? `, ${age}` : ""}` : ""}
      </>
    );
    if (stale) tone = "chip-warn";
  } else {
    text = completion ? (
      <>
        {doneWord} · {actorLabel(completion.completed_by)}, <Time ts={completion.completed_at} />
      </>
    ) : (
      doneWord
    );
    tone = "chip-live";
  }
  // Shopping lists finish items by marking them bought, so their status is shown, not changed here.
  const control = canWrite && !shopping;
  // A visitor already sees a dot for an open item; a chip saying "Open" would repeat it.
  if (!canWrite && status === "open" && !statusNote) return null;
  return (
    <div className="item-status item-indent flex flex-wrap items-center gap-2 text-[0.88rem] sm:pl-11">
      {control ? (
        <Menu
          label={`Status: ${typeof text === "string" ? text : status.replace(/_/g, " ")}. Change status`}
          triggerClass={`chip chip-btn ${tone}`}
          trigger={
            <>
              {text}
              <span className="sr-only">. Change status</span>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="ml-0.5 shrink-0">
                <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          }
        >
          <StatusOptions itemId={itemId} status={status} doneWord={doneWord} claimed={!!claimedBy} canTakeOver={stale && claimedBy?.kind !== "user"} />
        </Menu>
      ) : (
        <span className={`chip ${tone}`}>{text}</span>
      )}
      {status !== "done" && statusNote && (
        <p className="item-status-note w-full whitespace-pre-line break-words text-ink-2">
          <span className="text-ink-3">
            {claimedBy ? actorLabel(claimedBy) : "Note"}
            {statusNoteAt && (
              <>
                , <Time ts={statusNoteAt} />
              </>
            )}
            :{" "}
          </span>
          “{statusNote}”
        </p>
      )}
      {status === "done" && completion?.note && (
        <p className="w-full whitespace-pre-line break-words text-ink-2">
          <span className="font-semibold text-ink">Note: </span>
          {completion.note}
        </p>
      )}
    </div>
  );
}

/** The status menu: one form, one button per state, plus Release and Take over for claims. */
function StatusOptions({ itemId, status, doneWord, claimed, canTakeOver }: { itemId: string; status: ItemStatus; doneWord: string; claimed: boolean; canTakeOver: boolean }) {
  const fetcher = useFetcher<IntentResult>();
  const note = useFetcher<IntentResult>();
  const ref = useCloseOnDone(fetcher);
  const noteRef = useCloseOnDone(note);
  const busy = fetcher.state !== "idle";
  const options: Array<[ItemStatus, string]> = [
    ["open", "Open"],
    ["in_progress", "In progress"],
    ["done", doneWord],
  ];
  const current = status === "waiting_on_owner" ? null : status;
  return (
    <>
      <fetcher.Form method="post" ref={ref} className="grid">
        <input type="hidden" name="intent" value="set-status" />
        <input type="hidden" name="item_id" value={itemId} />
        {options.map(([value, label]) => (
          <button key={value} name="status" value={value} className="menu-item" aria-current={current === value ? "true" : undefined} disabled={busy || current === value}>
            <span aria-hidden="true" className="w-4 text-ink-2">
              {current === value ? "✓" : ""}
            </span>
            {label}
          </button>
        ))}
        {status === "in_progress" && claimed && (
          <>
            <hr className="menu-sep" />
            <button name="status" value="open" className="menu-item" disabled={busy}>
              <span className="w-4" />
              Release
            </button>
            {canTakeOver && (
              <button name="status" value="in_progress" className="menu-item" disabled={busy}>
                <span className="w-4" />
                Take over
              </button>
            )}
          </>
        )}
        {fetcher.data?.error && (
          <p className="form-error px-3 py-2" role="alert">
            {fetcher.data.error}
          </p>
        )}
      </fetcher.Form>
      {status !== "done" && (
        <>
          <hr className="menu-sep" />
          <MenuSub label={`${doneWord}, with a note`}>
            <note.Form method="post" ref={noteRef} className="grid gap-2">
              <input type="hidden" name="intent" value="set-status" />
              <input type="hidden" name="item_id" value={itemId} />
              <input type="hidden" name="status" value="done" />
              <label className="field">
                <span className="label">Note</span>
                <textarea name="note" maxLength={1000} className="textarea textarea-grow" placeholder="What was done, anything to know…" />
              </label>
              <button className="btn btn-ghost btn-sm w-fit" disabled={note.state !== "idle"}>
                {note.state !== "idle" ? "Saving…" : `Mark ${doneWord.toLowerCase()}`}
              </button>
              {note.data?.error && (
                <p className="form-error" role="alert">
                  {note.data.error}
                </p>
              )}
            </note.Form>
          </MenuSub>
        </>
      )}
    </>
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
  const H3 = headingTag(useContext(HeadingBase), 2);
  const research = fi.format === "research";
  const links = entry.links?.length ? entry.links : entry.product_url ? [entry.product_url] : [];
  return (
    <article id={entry.id} aria-labelledby={titleId} className={`text-entry card grid scroll-mt-24 gap-3 p-4 sm:p-5 ${accepted ? "ring-2 ring-deal" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <H3 id={titleId} className="min-w-0 font-sans text-[1.02rem] font-semibold leading-snug tracking-normal">
          {entry.title}
        </H3>
        {accepted && <span className="stamp shrink-0">Accepted</span>}
      </div>
      {entry.description && (
        <div className="entry-body whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-ink-2">{entry.description}</div>
      )}
      <Links links={links} />
      <div className="entry-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] text-ink-3">
        <ActorTag actor={entry.author} />
        <Time ts={entry.created_at} />
        <span className="ml-auto flex items-center gap-1">
          {canWrite && research && !accepted && <AcceptAnswer itemId={entry.item_id} entryId={entry.id} />}
          {canWrite && !research && !itemDone && <DoneWith itemId={entry.item_id} entryId={entry.id} />}
          <Menu label={`More actions for “${entry.title}”`}>
            {canWrite && (
              <MenuSub label="Comment">
                <CommentForm targetType="entry" targetId={entry.id} label={`Comment on this ${fi.entry}`} />
              </MenuSub>
            )}
            {canEdit && (
              <MenuSub label={`Edit ${fi.entry}`}>
                <TextEntryForm itemId={entry.item_id} fi={fi} entry={entry} />
              </MenuSub>
            )}
            <ReportMenuItem type="entry" id={entry.id} />
            {canEdit && (
              <MenuRemove intent="delete-entry" fields={{ entry_id: entry.id }} label={`Remove ${fi.entry}`} confirmText={`Remove “${entry.title}” and its comments?`} />
            )}
          </Menu>
        </span>
      </div>
      {comments.length > 0 && (
        <details className="group border-t border-line pt-2">
          <summary className="textlink-btn text-[0.8rem]">
            {comments.length === 1 ? "1 comment" : `${comments.length} comments`}{" "}
            <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
          </summary>
          <div className="mt-2 grid gap-3">
            <CommentList comments={comments} canDelete={canDeleteComment} />
            {canWrite && <CommentForm targetType="entry" targetId={entry.id} label={`Comment on this ${fi.entry}`} />}
          </div>
        </details>
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
      <button className="btn-quiet" disabled={fetcher.state !== "idle"}>
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
      <button className="btn-quiet" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving…" : "Use this and mark done"}
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
        <button className="btn btn-ghost btn-sm w-fit" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Saving…" : editing ? "Save changes" : fi.addEntryLabel}
        </button>
        {done && <span className="text-[0.85rem] text-deal">{editing ? "Saved." : "Posted."}</span>}
      </div>
    </fetcher.Form>
  );
}

/**
 * SPEC 12.1: an agent's question for the owner, with one-tap options when it gave some and a
 * box for anything else. Only rendered for people who can write the list: questions and answers
 * are never public. `compact` is the /app version (no history).
 */
export function OwnerQuestion({ question, history = [], compact = false }: { question: Question | null; history?: Question[]; compact?: boolean }) {
  const answered = history.filter((q) => q.answer);
  // "You" for the viewer's own answers, never their handle.
  const label = useActorLabel();
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const now = useNow();
  const latest = answered.at(-1);
  const lastAnswer = latest && now - Date.parse(latest.answer!.answered_at) < 24 * 3600_000 ? latest : null;
  if (!question && !answered.length) return null;
  return (
    <div className={`owner-question grid gap-3 ${compact ? "" : "item-indent sm:pl-11"}`}>
      {question && <QuestionForm question={question} compact={compact} />}
      {/* Just answered: say so on the item until the agent moves on (no open question, the latest answer within a day). */}
      {!question && !compact && lastAnswer && (
        <p className="text-[0.92rem] text-ink-2">
          {cap(label(lastAnswer.answer!.answered_by))} answered: “{lastAnswer.answer!.text}”.{" "}
          {lastAnswer.asked_by.kind === "agent" ? `${lastAnswer.asked_by.name} can carry on.` : ""}
        </p>
      )}
      {!compact && answered.length > 0 && (
        <details className="group">
          <summary className="textlink-btn text-[0.85rem]">
            {answered.length === 1 ? "1 earlier question" : `${answered.length} earlier questions`}{" "}
            <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
          </summary>
          <ul className="mt-2 grid border-t border-line">
            {answered.map((q) => (
              <li key={q.id} className="grid gap-1 border-b border-line py-2 text-[0.9rem]">
                <p className="whitespace-pre-line break-words">
                  <span className="text-ink-3">{cap(label(q.asked_by))}: </span>
                  {q.text}
                </p>
                <p className="whitespace-pre-line break-words text-ink-2">
                  <span className="text-ink-3">{cap(label(q.answer!.answered_by))}: </span>
                  {q.answer!.text}
                  {q.answer!.via === "agent_form" && q.answer!.via_agent && (
                    <span className="text-[0.85em] text-ink-3"> · answered in {q.answer!.via_agent.name}'s form</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function QuestionForm({ question, compact = false }: { question: Question; compact?: boolean }) {
  const fetcher = useFetcher<IntentResult>();
  const uid = useId();
  const busy = fetcher.state !== "idle";
  const pending = fetcher.formData?.get("text");
  return (
    <div role="group" aria-labelledby={`${uid}-h`} className="grid gap-3 rounded-[14px] bg-sunk p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* The item's status already says "Waiting on you"; this names the box for screen readers only. */}
        <h3 id={`${uid}-h`} className="sr-only">
          Question for you
        </h3>
        <ActorTag actor={question.asked_by} compact />
        <span className="text-[0.8rem] text-ink-3">
          <Time ts={question.asked_at} />
        </span>
      </div>
      <p className="whitespace-pre-line break-words text-[1.02rem]">{question.text}</p>
      {question.options.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Answers">
          {question.options.map((o) => (
            <fetcher.Form method="post" key={o}>
              <input type="hidden" name="intent" value="answer-question" />
              <input type="hidden" name="question_id" value={question.id} />
              <input type="hidden" name="text" value={o} />
              <button className="btn btn-ghost btn-sm" disabled={busy} aria-pressed={pending === o ? true : undefined}>
                {o}
              </button>
            </fetcher.Form>
          ))}
        </div>
      )}
      {/* With options, they answer in one tap; anything else is one more tap away. */}
      {question.options.length > 0 ? (
        <details>
          <summary className="add-link">Something else…</summary>
          <AnswerBox fetcher={fetcher} questionId={question.id} uid={uid} busy={busy} placeholder="Your answer" />
        </details>
      ) : (
        <AnswerBox fetcher={fetcher} questionId={question.id} uid={uid} busy={busy} placeholder="Your answer" />
      )}
      {fetcher.data?.error && (
        <p className="form-error" role="alert">
          {fetcher.data.error}
        </p>
      )}
    </div>
  );
}

function AnswerBox({
  fetcher,
  questionId,
  uid,
  busy,
  placeholder,
}: {
  fetcher: ReturnType<typeof useFetcher<IntentResult>>;
  questionId: string;
  uid: string;
  busy: boolean;
  placeholder: string;
}) {
  return (
    <fetcher.Form method="post" className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="intent" value="answer-question" />
      <input type="hidden" name="question_id" value={questionId} />
      <label htmlFor={`${uid}-a`} className="sr-only">
        Your answer
      </label>
      <textarea id={`${uid}-a`} name="text" required maxLength={2000} rows={1} placeholder={placeholder} className="textarea textarea-line flex-1" />
      <button className="btn btn-ghost" disabled={busy}>
        {busy ? "Sending…" : "Answer"}
      </button>
    </fetcher.Form>
  );
}
