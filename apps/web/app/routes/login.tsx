import { data, Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { api, ApiError } from "~/lib/api.server";
import { getUser } from "~/lib/auth.server";
import { assertSameOrigin, attemptCookie, clearAttemptCookie, getAttemptId, sessionCookie } from "~/lib/session.server";
import { cleanRef, RefField } from "~/lib/ref";
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

/** The API's own message is user-facing; for email delivery problems it says what went wrong. */
function loginError(err: ApiError): string {
  if (err.code === "email_unavailable") return "We can't send email right now. Try again in a little while.";
  if (err.code === "rate_limited") {
    const d = (err.details ?? {}) as { retry_after?: unknown; retry_at?: unknown };
    const secs = typeof d.retry_after === "number" ? d.retry_after : typeof d.retry_at === "string" ? (Date.parse(d.retry_at) - Date.now()) / 1000 : NaN;
    if (Number.isFinite(secs) && secs > 0) {
      const mins = Math.ceil(secs / 60);
      return `Too many tries for now. Try again in ${mins <= 1 ? "a minute" : `${mins} minutes`}.`;
    }
    return "Too many tries for now. Wait a few minutes, then try again.";
  }
  if (err.code === "network") return "Can't reach the server. Try again in a moment.";
  return err.message;
}

type ActionResult = { step: "code"; email: string; optIn: boolean; error?: string; devCode?: string } | { step: "email"; email?: string; error: string };

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const optIn = form.get("updates_opt_in") === "on";
  const next = safeNext(String(form.get("next") ?? ""));

  if (form.get("intent") === "verify") {
    const code = String(form.get("code") ?? "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) return data<ActionResult>({ step: "code", email, optIn, error: "Enter the 6-digit code." }, 400);
    const attempt = getAttemptId(request);
    try {
      const res = await api<{ token: string; user: UserSelf }>(request, "/auth/verify", {
        method: "POST",
        anonymous: true,
        body: { email, code, updates_opt_in: optIn, ...(attempt ? { attempt_id: attempt } : {}) },
        ref: cleanRef(form.get("ref")),
      });
      const headers = new Headers();
      headers.append("set-cookie", sessionCookie(request, res.token));
      headers.append("set-cookie", clearAttemptCookie(request));
      return redirect(next, { headers });
    } catch (err) {
      if (err instanceof ApiError) return data<ActionResult>({ step: "code", email, optIn, error: loginError(err) }, err.status);
      throw err;
    }
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return data<ActionResult>({ step: "email", email, error: "Enter a valid email." }, 400);
  let devCode: string | undefined;
  let attemptId: string | null = null;
  try {
    // Older API builds answer 204 with no body: there is no attempt to carry.
    const res = await api<{ attempt_id?: string } | undefined>(request, "/auth/code", {
      method: "POST",
      anonymous: true,
      body: { email },
      // A local API server echoes the code in a header. Only surfaced in development builds.
      onHeaders: (h) => {
        if (import.meta.env.DEV) devCode = h.get("x-dev-login-code") ?? undefined;
      },
    });
    attemptId = typeof res?.attempt_id === "string" ? res.attempt_id : null;
  } catch (err) {
    if (err instanceof ApiError) return data<ActionResult>({ step: "email", email, error: loginError(err) }, err.status);
    throw err;
  }
  const result: ActionResult = { step: "code", email, optIn, devCode };
  return attemptId ? data(result, { headers: { "set-cookie": attemptCookie(request, attemptId) } }) : result;
}

export default function Login() {
  const result = useActionData<typeof action>() as ActionResult | undefined;
  const nav = useNavigation();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const busy = nav.state !== "idle";
  const onCode = result?.step === "code";
  // From a claim link: the list waits on the other side of sign-in.
  const claiming = next === "/claim";

  return (
    <div className="wrap grid place-items-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="serif text-[2rem]">{onCode ? "Check your email" : claiming ? "Keep your list" : "Sign in"}</h1>

        {onCode ? (
          <Form method="post" className="mt-6 grid gap-4" key="code">
            <p className="text-ink-2">
              We sent a code to <strong className="break-all text-ink">{result.email}</strong>. It expires in 10 minutes.
            </p>
            {result.devCode && (
              <p className="chip chip-warn w-fit">
                Local dev: your code is <code className="font-bold">{result.devCode}</code>
              </p>
            )}
            <input type="hidden" name="intent" value="verify" />
            <RefField />
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
            <p className="text-ink-2">
              {claiming ? "Enter your email and we'll send a code. Then the list is yours. New here? This signs you up." : "We'll email you a code. New here? This signs you up."}
            </p>
            <input type="hidden" name="next" value={next} />
            <label className="field">
              <span className="label">Email</span>
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
              <span>Email me about new features</span>
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
