/**
 * /recipient-asks/:token?answer=yes|no (SPEC 26.20 item 4): where the ask's links land for an address someone added
 * to their routine. Says who is asking (their handle, never their email), for which list and what, in the server's
 * words. Opening never acts: one button for the answer in the link (both without one); it posts. Signed out; noindex.
 */
import { data, Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/recipient-ask";
import { api, ApiError, formError } from "~/lib/api.server";
import { assertSameOrigin } from "~/lib/session.server";
import { TOKEN_PAGE_HEADERS as HEADERS, TokenShell, tokenPageMeta } from "~/lib/token-page";
import type { RecipientAskView } from "~/lib/types";

export function headers() {
  return HEADERS;
}

export function meta() {
  return tokenPageMeta("Emails from a routine");
}

type Answer = "yes" | "no";

export async function loader({ request, params }: Route.LoaderArgs) {
  const a = new URL(request.url).searchParams.get("answer");
  const answer: Answer | null = a === "yes" || a === "no" ? a : null;
  try {
    const view = await api<RecipientAskView>(request, `/recipient-asks/${encodeURIComponent(params.token)}`, { anonymous: true });
    return data({ view, answer }, { headers: HEADERS });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) return data({ view: null, answer }, { status: 404, headers: HEADERS });
    throw err;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const answer = String((await request.formData()).get("answer"));
  if (answer !== "yes" && answer !== "no") return data({ error: "Choose yes or no." }, { status: 400, headers: HEADERS });
  try {
    const view = await api<RecipientAskView>(request, `/recipient-asks/${encodeURIComponent(params.token)}`, { method: "POST", anonymous: true, body: { answer } });
    return data({ view }, { headers: HEADERS });
  } catch (err) {
    return data(formError(err), { status: 400, headers: HEADERS });
  }
}

export default function RecipientAsk({ loaderData, params }: Route.ComponentProps) {
  const result = useActionData<typeof action>() as { view?: RecipientAskView; error?: string } | undefined;
  const nav = useNavigation();
  const view = result?.view ?? loaderData.view;
  if (!view) {
    return (
      <TokenShell title="This link no longer works">
        <p className="text-ink-2">The person who added your address may have removed it, or stopped these. Nothing more will be sent from it.</p>
      </TokenShell>
    );
  }
  const offer: Answer[] = loaderData.answer ? [loaderData.answer] : ["yes", "no"];
  const intro = (
    <p className="text-ink-2">
      {view.from} would like to send you {view.what} for {view.list}.
    </p>
  );
  if (view.state === "yes") {
    return (
      <TokenShell title="You said yes">
        {intro}
        <p role="status">They'll come once a day at most, and only when there's something to tell. Every one has a link to stop them.</p>
        <Link to={`/recipient-stops/${params.token}`} className="link w-fit">
          Stop these
        </Link>
      </TokenShell>
    );
  }
  if (view.state === "no" || view.state === "stopped") {
    return (
      <TokenShell title={view.state === "no" ? "You said no" : "You stopped these"}>
        {intro}
        <p role="status">Nothing will be sent, and nobody can ask this address again for 90 days.</p>
      </TokenShell>
    );
  }
  return (
    <TokenShell title={offer.length === 1 ? (offer[0] === "yes" ? "Get these emails?" : "Say no to these emails?") : "Get these emails?"}>
      {intro}
      <p className="text-ink-2">You need no account. Until you say yes, nothing else is sent to you.</p>
      <Form method="post" className="flex flex-wrap items-center gap-3">
        {offer.map((a, i) => (
          <button key={a} name="answer" value={a} className={`btn ${i === 0 && a === "yes" ? "btn-want" : ""} w-full sm:w-fit`} disabled={nav.state !== "idle"}>
            {a === "yes" ? "Yes, send me these" : "No"}
          </button>
        ))}
      </Form>
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
    </TokenShell>
  );
}
