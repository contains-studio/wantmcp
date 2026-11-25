/**
 * SPEC 16.6: where one report stands, for whoever holds its id (the sender, or anyone they passed the link to). It
 * shows only what FeedbackStatus carries: the kind, when it arrived, its status, and our note once done. Never the
 * report's own text (the server doesn't send it, and nothing here remembers it).
 */
import { Link } from "react-router";
import type { Route } from "./+types/feedback-status";
import { Time } from "~/components/Time";
import { api, toRouteError } from "~/lib/api.server";
import { FEEDBACK_ID, FEEDBACK_KINDS, FEEDBACK_STATUS_LINE } from "~/lib/feedback";
import type { FeedbackStatus } from "~/lib/types";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };

export function headers() {
  return PRIVATE_HEADERS;
}

export function meta() {
  return [{ title: "Your feedback · The Want MCP" }, { name: "robots", content: "noindex" }, { name: "referrer", content: "no-referrer" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!FEEDBACK_ID.test(params.id)) throw new Response("Not found", { status: 404 });
  try {
    const status = await api<FeedbackStatus>(request, `/feedback/${encodeURIComponent(params.id)}`);
    return { status };
  } catch (err) {
    toRouteError(err);
  }
}

export default function FeedbackStatusPage({ loaderData }: Route.ComponentProps) {
  const s = loaderData.status;
  const kind = FEEDBACK_KINDS.find((k) => k.kind === s.kind)?.label ?? "Feedback";
  return (
    <div className="wrap grid max-w-xl gap-5 py-10 sm:py-14">
      <header className="grid gap-2">
        <p className="text-ink-3">
          {kind} · sent <Time ts={s.received_at} />
        </p>
        <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em]">{FEEDBACK_STATUS_LINE[s.status] ?? s.status}</h1>
      </header>
      {s.status === "done" && s.note && (
        <figure className="grid gap-1 rounded-[14px] bg-card p-4">
          <figcaption className="text-[0.85rem] font-medium text-ink-3">From us</figcaption>
          <blockquote className="whitespace-pre-line break-words">{s.note}</blockquote>
        </figure>
      )}
      <p>
        <Link to="/feedback" className="link text-[0.92rem] text-ink-2">
          Send more feedback
        </Link>
      </p>
    </div>
  );
}
