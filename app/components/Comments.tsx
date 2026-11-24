import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { Comment } from "~/lib/types";
import { ActorTag } from "./ActorTag";
import { Linkify } from "./ExtLink";
import { ReportLink } from "./Report";
import { Time } from "./Time";

export function CommentList({
  comments,
  canDelete,
}: {
  comments: Comment[];
  canDelete?: (c: Comment) => boolean;
}) {
  if (!comments.length) return null;
  return (
    <ol className="grid gap-3">
      {comments.map((c) => (
        <li key={c.id} id={c.id} className="scroll-mt-24">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ActorTag actor={c.author} compact />
            <Time ts={c.created_at} className="text-[0.78rem] text-ink-3" />
            <span className="ml-auto flex items-center gap-3">
              {canDelete?.(c) && <DeleteComment id={c.id} />}
              <ReportLink type="comment" id={c.id} />
            </span>
          </div>
          <p className="mt-1 whitespace-pre-line break-words text-[0.92rem] text-ink-2">
            <Linkify text={c.body} />
          </p>
        </li>
      ))}
    </ol>
  );
}

function DeleteComment({ id }: { id: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  return (
    <fetcher.Form method="post" onSubmit={(e) => !confirm("Delete this comment?") && e.preventDefault()}>
      <input type="hidden" name="intent" value="delete-comment" />
      <input type="hidden" name="comment_id" value={id} />
      <button className="textlink-btn text-[0.78rem]" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Deleting…" : "Delete"}
        <span className="sr-only"> comment</span>
      </button>
      {fetcher.data?.error && (
        <span className="ml-2 text-[0.78rem] text-danger" role="alert">
          {fetcher.data.error}
        </span>
      )}
    </fetcher.Form>
  );
}

export function CommentForm({ targetType, targetId, label }: { targetType: "item" | "entry"; targetId: string; label: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) ref.current?.reset();
  }, [fetcher.state, fetcher.data]);
  const inputId = `c-${targetId}`;
  return (
    <fetcher.Form method="post" ref={ref} className="grid gap-2">
      <input type="hidden" name="intent" value="comment" />
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="flex items-end gap-2">
        <textarea id={inputId} name="body" required maxLength={1000} rows={1} placeholder={label} className="textarea min-h-11 flex-1 py-2 text-[0.92rem]" />
        <button className="btn btn-sm" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Posting…" : "Post"}
        </button>
      </div>
      {fetcher.data?.error && <p className="form-error" role="alert">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}
