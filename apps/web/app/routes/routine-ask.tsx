/**
 * /routine-asks/:token?action=keep|pause (SPEC 20.7, 20.14 item 7): where the "nobody has looked" email's two links
 * land. Opening never acts (mail scanners open links): the page names the routine and the list and shows one button
 * for that action, or both when the action is missing or unknown; the button posts. Afterwards it says what happened
 * and offers the other choice. Works signed out; noindex; the token is never sent to another site.
 */
import { data, Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/routine-ask";
import { api, ApiError, formError } from "~/lib/api.server";
import { assertSameOrigin } from "~/lib/session.server";
import type { RoutineAskView } from "~/lib/types";

// same-origin, not no-referrer: no-referrer makes a form post send `Origin: null`, which React Router refuses. The
// token never leaves for another site either way.
const HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "same-origin", "X-Robots-Tag": "noindex" };

/** The page and every answer to its form carry these (React Router sends a route's own headers from here only). */
export function headers() {
  return HEADERS;
}

export function meta() {
  return [{ title: "Your routine · The Want MCP" }, { name: "robots", content: "noindex" }, { name: "referrer", content: "same-origin" }];
}

type Action = "keep" | "pause";
const asked = (url: URL): Action | null => {
  const a = url.searchParams.get("action");
  return a === "keep" || a === "pause" ? a : null;
};

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const view = await api<RoutineAskView>(request, `/routine-asks/${encodeURIComponent(params.token)}`, { anonymous: true });
    return data({ view, action: asked(new URL(request.url)), expired: false }, { headers: HEADERS });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) return data({ view: null, action: null, expired: true }, { status: 404, headers: HEADERS });
    throw err;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const action = String(form.get("action"));
  if (action !== "keep" && action !== "pause") return data({ error: "Choose keep or pause." }, { status: 400, headers: HEADERS });
  try {
    await api<RoutineAskView>(request, `/routine-asks/${encodeURIComponent(params.token)}`, { method: "POST", anonymous: true, body: { action } });
    return data({ done: action as Action }, { headers: HEADERS });
  } catch (err) {
    return data(formError(err), { status: 400, headers: HEADERS });
  }
}

const BUTTON: Record<Action, string> = { keep: "Keep it running", pause: "Pause it" };
const DONE: Record<Action, string> = {
  keep: "Its next round comes on its schedule.",
  pause: "It won't run until someone on the list resumes it.",
};

export default function RoutineAsk({ loaderData }: Route.ComponentProps) {
  const result = useActionData<typeof action>() as { done?: Action; error?: string } | undefined;
  const nav = useNavigation();
  const { view, action: wanted } = loaderData;
  if (!view) {
    return (
      <Shell title="This link has expired">
        <p className="text-ink-2">It worked until the routine's next run. You can still keep or pause it from its list.</p>
        <Link to="/app/routines" className="btn btn-want w-full sm:w-fit">
          Open your routines
        </Link>
      </Shell>
    );
  }
  const name = `“${view.routine.name}”`;
  // What was chosen: just now, or earlier with this link (each choice works once; the other stays open).
  const done = result?.done ?? view.answered ?? null;
  // After an answer, the other choice; before one, the asked one (or both).
  const offer: Action[] = done ? [done === "keep" ? "pause" : "keep"] : wanted ? [wanted] : ["keep", "pause"];
  return (
    <Shell title={done ? (done === "keep" ? "Kept running" : "Paused") : wanted === "pause" ? `Pause ${name}?` : wanted === "keep" ? `Keep ${name} running?` : `${name}`}>
      <p className="text-ink-2">
        Your routine {name} on “{view.routine.list_title}” found things nobody has looked at yet.
      </p>
      {done && (
        <p className="font-medium" role="status">
          {DONE[done]}
        </p>
      )}
      <Form method="post" className="flex flex-wrap items-center gap-3">
        {offer.map((a, i) => (
          <button key={a} name="action" value={a} className={`btn ${i === 0 && !done ? "btn-want" : ""} w-full sm:w-fit`} disabled={nav.state !== "idle"}>
            {done ? (a === "keep" ? "Keep it running after all" : "Pause it instead") : BUTTON[a]}
          </button>
        ))}
      </Form>
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
      <p className="text-[0.9rem] text-ink-3">
        To see what it found, open the list.{" "}
        <Link to="/app/routines" className="link">
          Your routines
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap grid place-items-center py-12">
      <div className="card grid w-full max-w-md gap-4 p-6 sm:p-8">
        <h1 className="text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] break-words">{title}</h1>
        {children}
      </div>
    </div>
  );
}
