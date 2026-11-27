/** Plain messages for API failures, shared by every form (and unit-tested without the Worker runtime). */
export const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";
export const INVALID_EMAIL = "That doesn't look like an email address. Check it and try again.";

/** One plain sentence for each kind of failure a form can meet; the API's own words where they are specific. */
export function friendlyError(err: { status: number; code: string; message: string; details?: unknown }): string {
  switch (err.code) {
    case "rate_limited": {
      const d = (err.details ?? {}) as { retry_after?: unknown; retry_at?: unknown };
      const secs = typeof d.retry_after === "number" ? d.retry_after : typeof d.retry_at === "string" ? (Date.parse(d.retry_at) - Date.now()) / 1000 : NaN;
      if (Number.isFinite(secs) && secs > 0) {
        const mins = Math.ceil(secs / 60);
        return `Too many tries for now. Try again in ${mins <= 1 ? "a minute" : `${mins} minutes`}.`;
      }
      return "Too many tries for now. Wait a few minutes, then try again.";
    }
    case "email_unavailable":
      return "We can't send email right now. Try again in a little while.";
    case "forbidden":
      return err.message && !/^API error/.test(err.message) ? err.message : "You don't have permission to do that on this list.";
    case "network":
      return NETWORK_MESSAGE;
  }
  if (err.status >= 500) return "Something went wrong on our side. Try again in a moment.";
  // The API's validator speaks in field names ("email is not valid"): say it as a person would (bug audit, 27 Nov 2026).
  if (err.status === 400 && /^email\b.*\b(valid|invalid|format)\b/i.test(err.message)) return INVALID_EMAIL;
  return err.message;
}
