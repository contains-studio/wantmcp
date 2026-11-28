/**
 * /routine-email-stops/:token (SPEC 26.4): "Stop emailing me about this routine" from the daily routine email. Opening
 * never acts; the one button posts, and turns off email for that routine for that person (it still shows in the app).
 * Signed out; noindex.
 */
import { data, Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/routine-email-stop";
import { api, ApiError, formError } from "~/lib/api.server";
import { assertSameOrigin } from "~/lib/session.server";
import { TOKEN_PAGE_HEADERS as HEADERS, TokenShell, tokenPageMeta } from "~/lib/token-page";
import type { RoutineEmailStopView } from "~/lib/types";

export function headers() {
  return HEADERS;
}

export function meta() {
  return tokenPageMeta("Stop emails about a routine");
}

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const view = await api<RoutineEmailStopView>(request, `/routine-email-stops/${encodeURIComponent(params.token)}`, { anonymous: true });
    return data({ view }, { headers: HEADERS });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) return data({ view: null }, { status: 404, headers: HEADERS });
    throw err;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  try {
    const view = await api<RoutineEmailStopView>(request, `/routine-email-stops/${encodeURIComponent(params.token)}`, { method: "POST", anonymous: true });
    return data({ view }, { headers: HEADERS });
  } catch (err) {
    return data(formError(err), { status: 400, headers: HEADERS });
  }
}

export default function RoutineEmailStop({ loaderData }: Route.ComponentProps) {
  const result = useActionData<typeof action>() as { view?: RoutineEmailStopView; error?: string } | undefined;
  const nav = useNavigation();
  const view = result?.view ?? loaderData.view;
  if (!view) {
    return (
      <TokenShell title="This link no longer works">
        <p className="text-ink-2">You can choose which routines email you in Notifications.</p>
        <Link to="/app/account#notifications" className="btn btn-want w-full sm:w-fit">
          Open Notifications
        </Link>
      </TokenShell>
    );
  }
  const name = `“${view.routine.name}”`;
  return (
    <TokenShell title={view.done ? "No more emails about it" : `Stop emails about ${name}?`}>
      <p className="text-ink-2">
        Your routine {name}
        {view.routine.list_title ? <> on “{view.routine.list_title}”</> : null}. It still shows in the app, under For you.
      </p>
      {view.done ? (
        <p role="status">It won't email you any more. Your other routines' emails are as they were.</p>
      ) : (
        <Form method="post">
          <button className="btn btn-want w-full sm:w-fit" disabled={nav.state !== "idle"}>
            Stop emailing me about it
          </button>
        </Form>
      )}
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
      <p className="text-[0.9rem] text-ink-3">
        <Link to="/app/account#notifications" className="link">
          Notifications
        </Link>{" "}
        has the rest of your email choices.
      </p>
    </TokenShell>
  );
}
