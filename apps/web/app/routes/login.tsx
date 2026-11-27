import { data, Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { api, ApiError, friendlyError } from "~/lib/api.server";
import { getUser } from "~/lib/auth.server";
import { assertSameOrigin, attemptCookie, clearAttemptCookie, getAttemptId, sessionCookie } from "~/lib/session.server";
import { apiBaseUrl } from "~/lib/config.server";
import { updatesOptInDefault } from "~/lib/consent";
import { cleanRef, RefField } from "~/lib/ref";
import { safeNext } from "~/lib/url";
import type { VerifyResult } from "~/lib/types";
import { SEASON } from "~/lib/season";
import { OCCASIONS } from "~/themes/catalogue.server";

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
  // Computed here, so the box renders in its right state with or without JavaScript (lib/consent explains the list).
  return { optInDefault: updatesOptInDefault(visitorCountry(request)), occasion: occasionName(next) };
}

/** Starting an occasion's list (/start?occasion=black-friday): the occasion's own name, so the title can say it. */
function occasionName(next: string): string | null {
  const url = new URL(next, "http://x");
  if (url.pathname !== "/start") return null;
  const slug = url.searchParams.get("occasion");
  if (!slug || !SEASON.occasions.includes(slug)) return null;
  return OCCASIONS.find((o) => o.slug === slug)?.name ?? null;
}

/**
 * Cloudflare's country for this visitor. Local dev supplies a stand-in request.cf, so with the mock API (local dev and
 * the tests) a cf-ipcountry header wins, letting tests pretend to be in Germany; production reads request.cf first.
 */
function visitorCountry(request: Request): string | null {
  const cf = (request as unknown as { cf?: { country?: string } }).cf?.country ?? null;
  const header = request.headers.get("cf-ipcountry");
  return apiBaseUrl() === "mock" ? (header ?? cf) : (cf ?? header);
}

/** The API's own message is user-facing; for email delivery problems it says what went wrong. */
/** The same plain messages every form uses (api.server friendlyError). */
function loginError(err: ApiError): string {
  return friendlyError(err);
}

type ActionResult = { step: "code"; email: string; optIn: boolean; error?: string; devCode?: string } | { step: "email"; email?: string; optIn: boolean; error: string };

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
      // The API applies the choice only when this call creates the account; an existing account's stored choice is
      // never changed by signing in, whatever the box says.
      const res = await api<VerifyResult>(request, "/auth/verify", {
        method: "POST",
        anonymous: true,
        // SPEC 23: where this person first came from (wm_src), counted only when this call creates the account.
        body: { email, code, updates_opt_in: optIn, ...(attempt ? { attempt_id: attempt } : {}), ...(signupSource(request) ? { src: signupSource(request) } : {}) },
        ref: cleanRef(form.get("ref")),
      });
      const headers = new Headers();
      headers.append("set-cookie", sessionCookie(request, res.token));
      headers.append("set-cookie", clearAttemptCookie(request));
      return redirect(next, { headers });
    } catch (err) {
      if (err instanceof ApiError) return data<ActionResult>({ step: "code", email, optIn, error: loginError(err) }, err.status);
      if (err instanceof TypeError) return data<ActionResult>({ step: "code", email, optIn, error: "Can't reach the server. Check your connection and try again." }, 503);
      throw err;
    }
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return data<ActionResult>({ step: "email", email, optIn, error: "Enter a valid email." }, 400);
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
    if (err instanceof ApiError) return data<ActionResult>({ step: "email", email, optIn, error: loginError(err) }, err.status);
    if (err instanceof TypeError) return data<ActionResult>({ step: "email", email, optIn, error: "Can't reach the server. Check your connection and try again." }, 503);
    throw err;
  }
  const result: ActionResult = { step: "code", email, optIn, devCode };
  return attemptId ? data(result, { headers: { "set-cookie": attemptCookie(request, attemptId) } }) : result;
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const result = useActionData<typeof action>() as ActionResult | undefined;
  // Re-shown after an error: the person's own choice; first time: the default for where they are.
  const optInChecked = result ? result.optIn : (loaderData?.optInDefault ?? true);
  const nav = useNavigation();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const busy = nav.state !== "idle";
  // An explicit action: left implicit, the server and the browser encode ?next= differently and hydration complains.
  const action = `/login?next=${encodeURIComponent(next)}`;
  const onCode = result?.step === "code";
  // From a claim link: the list waits on the other side of sign-in. From a start action: a new list does.
  const claiming = next === "/claim";
  const starting = next.startsWith("/app/new") || next.startsWith("/start") || /^\/for\/[^/?#]+(\?list=\w+)?#start-/.test(next);

  return (
    <div className="wrap grid place-items-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="serif text-[2rem]">{onCode ? "Check your email" : claiming ? "Keep your list" : starting ? (loaderData?.occasion ? `Start your ${loaderData.occasion} list` : "Start your list") : "Sign in"}</h1>

        {onCode ? (
          <Form method="post" action={action} className="mt-6 grid gap-4" key="code">
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
          <Form method="post" action={action} className="mt-6 grid gap-4" key="email">
            <p className="text-ink-2">
              {claiming ? "Enter your email and we'll send a code. Then the list is yours." : "Enter your email and we'll send a code. No password."}
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
              <input type="checkbox" name="updates_opt_in" defaultChecked={optInChecked} />
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
              By signing in you agree to the <Link to="/terms" className="link">terms</Link> and the{" "}
              <Link to="/privacy" className="link">privacy policy</Link>.
            </p>
          </Form>
        )}
      </div>
    </div>
  );
}

/** The wm_src cookie (a tag or a referring host, set by the Worker on the first visit), when it is plain. */
function signupSource(request: Request): string | null {
  const m = /(?:^|;\s*)wm_src=([^;]+)/.exec(request.headers.get("cookie") ?? "");
  const v = m ? decodeURIComponent(m[1]) : null;
  return v && /^[a-z0-9_.-]{1,64}$/.test(v) ? v : null;
}
