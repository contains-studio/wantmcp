import { data, Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { api, ApiError } from "~/lib/api.server";
import { getUser } from "~/lib/auth.server";
import { assertSameOrigin, sessionCookie } from "~/lib/session.server";
import { safeNext } from "~/lib/url";
import type { UserSelf } from "~/lib/types";

export function meta() {
  return [
    { title: "Sign in · The Want MCP" },
    { name: "description", content: "Sign in with a code sent to your email." },
    { name: "robots", content: "noindex" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  if (await getUser(request)) throw redirect(next);
  return null;
}

type ActionResult = { step: "code"; email: string; optIn: boolean; error?: string } | { step: "email"; email?: string; error: string };

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const optIn = form.get("updates_opt_in") === "on";
  const next = safeNext(String(form.get("next") ?? ""));

  if (form.get("intent") === "verify") {
    const code = String(form.get("code") ?? "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) return data<ActionResult>({ step: "code", email, optIn, error: "Enter the 6-digit code from the email." }, 400);
    try {
      const res = await api<{ token: string; user: UserSelf }>(request, "/auth/verify", {
        method: "POST",
        anonymous: true,
        body: { email, code, updates_opt_in: optIn },
      });
      return redirect(next, { headers: { "set-cookie": sessionCookie(request, res.token) } });
    } catch (err) {
      if (err instanceof ApiError) return data<ActionResult>({ step: "code", email, optIn, error: err.message }, err.status);
      throw err;
    }
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return data<ActionResult>({ step: "email", email, error: "Enter a valid email address." }, 400);
  try {
    await api(request, "/auth/code", { method: "POST", anonymous: true, body: { email } });
  } catch (err) {
    if (err instanceof ApiError) return data<ActionResult>({ step: "email", email, error: err.message }, err.status);
    throw err;
  }
  return { step: "code", email, optIn } satisfies ActionResult;
}

export default function Login() {
  const result = useActionData<typeof action>() as ActionResult | undefined;
  const nav = useNavigation();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const busy = nav.state !== "idle";
  const onCode = result?.step === "code";

  return (
    <div className="wrap grid min-h-[70dvh] place-items-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <p className="eyebrow">{onCode ? "Step 2 of 2" : "Sign in or sign up"}</p>
        <h1 className="mt-2 text-3xl font-extrabold">{onCode ? "Check your email" : "Your want lists"}</h1>

        {onCode ? (
          <Form method="post" className="mt-6 grid gap-4" key="code">
            <p className="text-ink-2">
              We sent a 6-digit code to <strong className="break-all text-ink">{result.email}</strong>. It works for 10 minutes.
            </p>
            <input type="hidden" name="intent" value="verify" />
            <input type="hidden" name="email" value={result.email} />
            <input type="hidden" name="next" value={next} />
            {result.optIn && <input type="hidden" name="updates_opt_in" value="on" />}
            <label className="field">
              <span className="label">Code</span>
              <input
                name="code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\s*(\d\s*){6}"
                maxLength={9}
                placeholder="123456"
                aria-invalid={result.error ? true : undefined}
                aria-describedby={result.error ? "code-error" : undefined}
                className="input text-center font-mono text-2xl tracking-[0.4em]"
              />
            </label>
            {result.error && (
              <p id="code-error" className="form-error" role="alert">
                {result.error}
              </p>
            )}
            <button className="btn btn-want" disabled={busy}>
              {busy ? "Checking…" : "Sign in"}
            </button>
            <p className="text-[0.85rem] text-ink-3">
              Wrong address or no email? <Link to={`/login?next=${encodeURIComponent(next)}`} reloadDocument className="link">Start again</Link>
            </p>
          </Form>
        ) : (
          <Form method="post" className="mt-6 grid gap-4" key="email">
            <p className="text-ink-2">No password. We'll email you a code. A new address creates an account.</p>
            <input type="hidden" name="next" value={next} />
            <label className="field">
              <span className="label">Email address</span>
              <input
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                defaultValue={result?.email}
                aria-invalid={result?.error ? true : undefined}
                aria-describedby={result?.error ? "email-error" : undefined}
                className="input"
              />
            </label>
            <label className="check">
              <input type="checkbox" name="updates_opt_in" />
              <span>Tell me about new features. Occasional emails, unsubscribe any time.</span>
            </label>
            {result?.error && (
              <p id="email-error" className="form-error" role="alert">
                {result.error}
              </p>
            )}
            <button className="btn btn-want" disabled={busy}>
              {busy ? "Sending…" : "Email me a code"}
            </button>
            <p className="text-[0.8rem] text-ink-3">
              By signing in you agree to the <Link to="/terms" className="link">terms</Link>. We use your email to sign you in, and for feature news
              only if you tick the box. <Link to="/privacy" className="link">Privacy</Link>.
            </p>
          </Form>
        )}
      </div>
    </div>
  );
}
