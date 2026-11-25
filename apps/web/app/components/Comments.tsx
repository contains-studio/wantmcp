import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { Comment } from "~/lib/types";
import { Menu, MenuRemove } from "./Actions";
import { ActorTag } from "./ActorTag";
import { Linkify } from "./ExtLink";
import { ReportMenuItem } from "./Report";
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
            <span className="ml-auto">
              <Menu label="More actions for this comment">
                <ReportMenuItem type="comment" id={c.id} />
                {canDelete?.(c) && <MenuRemove intent="delete-comment" fields={{ comment_id: c.id }} label="Delete" confirmText="Delete this comment?" />}
              </Menu>
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

/** One line that grows as you type, with a small plain Post button. */
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
        <textarea id={inputId} name="body" required maxLength={1000} rows={1} placeholder={label} className="textarea textarea-grow flex-1" />
        <button className="btn btn-ghost btn-sm" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Posting…" : "Post"}
        </button>
      </div>
      {fetcher.data?.error && <p className="form-error" role="alert">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}
