/**
 * Lists an agent starts for a person (SPEC 13). The server's setting decides how long an unclaimed
 * list lasts and every page reads `expires_at`; this constant is only for copy that can't
 * (the home page, /llms.txt) and for the mock, so they all say the same thing.
 */
export const UNCLAIMED_TTL_HOURS = 24;
/** Hand-over links (SPEC 13.6 `handover.ttl_days`): the mock's default. */
export const HANDOVER_TTL_DAYS = 7;

/** Whole hours left until `expiresAt`, at least 1 while it's still in the future; 0 once it has passed. */
export function hoursLeft(expiresAt: string, now = Date.now()): number {
  const ms = Date.parse(expiresAt) - now;
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 3_600_000));
}

/** "in 1 hour", "in 23 hours", "in less than an hour". */
export function inHours(expiresAt: string, now = Date.now()): string {
  const ms = Date.parse(expiresAt) - now;
  if (ms < 3_600_000) return "in less than an hour";
  const h = hoursLeft(expiresAt, now);
  return `in ${h} ${h === 1 ? "hour" : "hours"}`;
}
