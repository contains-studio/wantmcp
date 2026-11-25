import { data, Form, useNavigation } from "react-router";
import type { Route } from "./+types/unsubscribe";
import { api, apiOptional } from "~/lib/api.server";
import { assertSameOrigin } from "~/lib/session.server";
import type { UnsubscribeState } from "~/lib/types";

/**
 * The link at the bottom of a feature email. No sign-in. Like a claim link, the token is a secret: never indexed,
 * cached, counted or sent as a referrer, and logged only as /unsubscribe/:token.
 */
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };

export function headers() {
  return PRIVATE_HEADERS;
}

export function meta() {
  return [{ title: "Feature emails · The Want MCP" }, { name: "robots", content: "noindex" }, { name: "referrer", content: "no-referrer" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const state = await apiOptional<UnsubscribeState>(request, `/unsubscribe/${encodeURIComponent(params.token)}`, { anonymous: true }).catch(() => null);
  return data({ state: state ?? { valid: false, unsubscribed: false } }, { headers: PRIVATE_HEADERS });
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  try {
    await api(request, "/unsubscribe", { method: "POST", anonymous: true, body: { token: params.token } });
    return data({ done: true as const }, { headers: PRIVATE_HEADERS });
  } catch {
    return data({ error: "That didn't work. Try again in a moment." }, { status: 502, headers: PRIVATE_HEADERS });
  }
}

export default function Unsubscribe({ loaderData, actionData }: Route.ComponentProps) {
  const { state } = loaderData;
  const nav = useNavigation();
  const done = (actionData && "done" in actionData) || state.unsubscribed;
  return (
    <div className="wrap grid place-items-center py-12">
      <div className="card grid w-full max-w-md justify-items-center gap-3 p-6 text-center sm:p-8">
        {!state.valid && !done ? (
          <>
            <h1 className="text-[1.6rem] leading-tight font-semibold">This link doesn't work</h1>
            <p className="text-ink-2">
              To stop feature emails, write to{" "}
              <a href="mailto:hello@wantmcp.com" className="link">
                hello@wantmcp.com
              </a>{" "}
              from the address that gets them.
            </p>
          </>
        ) : done ? (
          <>
            <h1 className="text-[1.6rem] leading-tight font-semibold">Done</h1>
            <p role="status" className="text-ink-2">
              You won't get feature emails. You can still sign in as usual.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[1.6rem] leading-tight font-semibold">Feature emails</h1>
            <p className="text-ink-2">Sign-in codes still come by email; this only stops news about new features.</p>
            <Form method="post">
              <button className="btn btn-want" disabled={nav.state !== "idle"}>
                {nav.state !== "idle" ? "Stopping…" : "Stop feature emails"}
              </button>
            </Form>
            {actionData && "error" in actionData && (
              <p className="form-error" role="alert">
                {actionData.error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
