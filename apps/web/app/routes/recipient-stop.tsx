/**
 * /recipient-stops/:token (SPEC 26.20 item 4): "Stop these" from an ask, or from a routine email someone added this
 * address to. Opening never acts; the one button posts. Afterwards nobody can ask this address for 90 days. Signed
 * out; noindex.
 */
import { data, Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/recipient-stop";
import { api, ApiError, formError } from "~/lib/api.server";
import { assertSameOrigin } from "~/lib/session.server";
import { TOKEN_PAGE_HEADERS as HEADERS, TokenShell, tokenPageMeta } from "~/lib/token-page";
import type { RecipientAskView } from "~/lib/types";

export function headers() {
  return HEADERS;
}

export function meta() {
  return tokenPageMeta("Stop these emails");
}

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const view = await api<RecipientAskView>(request, `/recipient-stops/${encodeURIComponent(params.token)}`, { anonymous: true });
    return data({ view }, { headers: HEADERS });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) return data({ view: null }, { status: 404, headers: HEADERS });
    throw err;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  try {
    const view = await api<RecipientAskView>(request, `/recipient-stops/${encodeURIComponent(params.token)}`, { method: "POST", anonymous: true });
    return data({ view }, { headers: HEADERS });
  } catch (err) {
    return data(formError(err), { status: 400, headers: HEADERS });
  }
}

export default function RecipientStop({ loaderData }: Route.ComponentProps) {
  const result = useActionData<typeof action>() as { view?: RecipientAskView; error?: string } | undefined;
  const nav = useNavigation();
  const view = result?.view ?? loaderData.view;
  if (!view) {
    return (
      <TokenShell title="This link no longer works">
        <p className="text-ink-2">Nothing more will be sent from it.</p>
      </TokenShell>
    );
  }
  const stopped = view.state === "stopped" || view.state === "no";
  return (
    <TokenShell title={stopped ? "Stopped" : "Stop these emails?"}>
      <p className="text-ink-2">
        {view.what[0].toUpperCase() + view.what.slice(1)} for {view.list}, from {view.from}.
      </p>
      {stopped ? (
        <p role="status">Nothing more will be sent, and nobody can ask this address again for 90 days.</p>
      ) : (
        <Form method="post">
          <button className="btn btn-want w-full sm:w-fit" disabled={nav.state !== "idle"}>
            Stop these
          </button>
        </Form>
      )}
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
    </TokenShell>
  );
}
