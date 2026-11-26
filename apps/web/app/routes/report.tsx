import { data, Link, useActionData } from "react-router";
import type { Route } from "./+types/report";
import { api, ApiError } from "~/lib/api.server";
import { assertSameOrigin } from "~/lib/session.server";

export function meta() {
  return [{ title: "Report · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const type = String(form.get("target_type") ?? "");
  const id = String(form.get("target_id") ?? "");
  const reason = [String(form.get("reason") ?? ""), String(form.get("details") ?? "").trim()].filter(Boolean).join(": ").slice(0, 1000);
  if (!["list", "item", "entry", "comment"].includes(type) || !id || !reason) return data({ error: "Pick a reason." }, 400);
  try {
    await api(request, "/reports", { method: "POST", body: { target_type: type, target_id: id, reason } });
  } catch (err) {
    if (err instanceof ApiError) return data({ error: err.message }, err.status);
    throw err;
  }
  return { ok: true as const };
}

export function loader() {
  return new Response("Not found", { status: 404 });
}

/** Shown only when the report form was posted without JavaScript. */
export default function Report() {
  const result = useActionData<typeof action>();
  return (
    <div className="wrap py-20">
      {result && "ok" in result ? (
        <>
          <h1 className="serif text-[2.25rem] leading-tight">Thanks for the report</h1>
          <p className="mt-3 text-ink-2">
            We'll take a look. You can also email{" "}
            <a href="mailto:hello@wantmcp.com" className="link">
              hello@wantmcp.com
            </a>
            .
          </p>
        </>
      ) : (
        // Nothing was sent (or the server said no): one message, not "not sent" above "we'll take a look".
        <>
          <h1 className="serif text-[2.25rem] leading-tight">Your report didn't go through</h1>
          <p className="mt-3 text-ink-2">
            {result && "error" in result && result.error !== "Pick a reason." ? `${result.error} ` : ""}Email{" "}
            <a href="mailto:hello@wantmcp.com" className="link">
              hello@wantmcp.com
            </a>{" "}
            and we'll take a look.
          </p>
        </>
      )}
      <Link to="/" className="btn mt-6">Back home</Link>
    </div>
  );
}
