import { formatDateTime, timeAgo } from "~/lib/format";
import { useNow } from "~/lib/hooks";
import type { Timestamp } from "~/lib/types";

/** Relative time with the exact UTC time in the title and datetime attribute. */
export function Time({ ts, className }: { ts: Timestamp; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={ts} title={formatDateTime(ts)} className={className}>
      {timeAgo(ts, now)}
    </time>
  );
}
