import type { FeedbackKind } from "./types";

/** The three kinds, in the person's words (SPEC 16.5). */
export const FEEDBACK_KINDS: Array<{ kind: FeedbackKind; label: string }> = [
  { kind: "bug", label: "Something broke" },
  { kind: "expectation", label: "It didn't do what I expected" },
  { kind: "request", label: "I wish it could…" },
];

export const FEEDBACK_LIMITS = { text: 2000, expected: 1000 } as const;

/** A feedback id as the API issues it (SPEC 16.6: the handle for following one report). */
export const FEEDBACK_ID = /^fbk_[A-Za-z0-9_-]{1,100}$/;

/** Where a report stands, in one plain line (SPEC 16.6). */
export const FEEDBACK_STATUS_LINE: Record<string, string> = {
  received: "We have it. Nobody has looked yet.",
  accepted: "Accepted: it's on our list.",
  in_progress: "Being worked on.",
  done: "Done.",
  closed: "Closed.",
};

/** Pages whose second path segment is a fixed name (never a token, id or handle), and which names are allowed. */
const NAMED_CHILDREN: Record<string, RegExp> = {
  app: /^(new|activity|skills|account)$/,
  themes: /^[a-z][a-z-]{0,23}$/,
  for: /^[a-z][a-z-]{0,23}$/,
};
const KNOWN = new Set(["", "app", "l", "login", "invite", "claim", "unsubscribe", "connect", "themes", "for", "start", "privacy", "terms"]);

/**
 * Where the person came from, as `about` (SPEC 16.1): the page, never a token, id or query string. "/claim/clm_…" is
 * "/claim", "/l/lst_…" is "/l", "/app/skills" stays. Anything else is dropped.
 */
export function feedbackAbout(path: string | null | undefined): string | undefined {
  if (!path || !path.startsWith("/")) return undefined;
  const [first = "", second] = path.split(/[?#]/)[0]!.split("/").slice(1);
  if (!KNOWN.has(first)) return undefined;
  if (!first) return "/";
  if (second && NAMED_CHILDREN[first]?.test(second)) return `/${first}/${second}`;
  return `/${first}`;
}
