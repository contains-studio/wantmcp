import { afterChange } from "~/lib/prg.server";
import { useState } from "react";
import { data, Form, Link, redirect, useActionData, useFetcher, useNavigation } from "react-router";
import { useRootData } from "~/lib/hooks";
import { Field, Select } from "~/components/ui";
import { COUNTRIES, COUNTRY_CURRENCY, CURRENCIES } from "~/lib/locales";
import type { Route } from "./+types/account";
import { api, apiOptional, formError } from "~/lib/api.server";
import type { AgentInfo } from "~/lib/types";
import { Time } from "~/components/Time";
import { requireUser } from "~/lib/auth.server";
import { assertSameOrigin, clearSessionCookie } from "~/lib/session.server";
import { ExaKeySection, Notifications, TimeZoneSection } from "~/components/AccountRoutines";
import { routinesOn } from "~/lib/routines";
import { ACCOUNT_ROUTINE_INTENTS, accountRoutineAction, myEmailPrefs, myExaKey } from "~/lib/routines.server";

export function meta() {
  return [{ title: "Account · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const me = await requireUser(request);
  // Where the request comes from (Cloudflare tells the Worker): when the person has no country yet, it is saved as theirs
  // with its currency, without asking (review E2: "Save to keep them" on an account already in use). They can change it.
  const cf = (request as unknown as { cf?: { country?: string } }).cf?.country ?? request.headers.get("cf-ipcountry");
  const country = cf && COUNTRIES.some(([c]) => c === cf) ? cf : null;
  let user = me;
  if (!me.country && country) {
    const currency = me.currency ?? COUNTRY_CURRENCY[country] ?? null;
    const saved = await api<typeof me>(request, "/me", { method: "PATCH", body: { country, currency } }).catch(() => null);
    user = { ...me, ...(saved ?? {}), country, currency };
  }
  // SPEC 13.6: account keys agents made with their own sign-up. Older API builds don't have the route: none.
  const agentKeys = (await apiOptional<AgentInfo[]>(request, "/me/agent-keys").catch(() => null)) ?? [];
  // SPEC 20: keys, how I hear and time zone, only once routines are launched for this person (20.14).
  const routines = routinesOn(me)
    ? await Promise.all([myExaKey(request, me), myEmailPrefs(request)]).then(([exaKey, prefs]) => ({ exaKey, prefs: prefs ?? { kinds: { routine_key: false, routine_unattended: true, routine_digest: true, routine_at_once: true }, email_hour: 8, follows: [] } }))
    : null;
  return data({ user, agentKeys, routines }, { headers: { "Cache-Control": "private, no-store" } });
}

async function act({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  if (ACCOUNT_ROUTINE_INTENTS.has(intent)) {
    if (!routinesOn(await requireUser(request))) return data({ error: "Unknown action", intent }, 400);
    return accountRoutineAction(request, form);
  }
  try {
    if (intent === "profile") {
      // One Save for the handle and what agents should know. The feature-email choice is made once, at sign-up.
      await api(request, "/me", {
        method: "PATCH",
        body: {
          handle: String(form.get("handle") ?? "").trim(),
          // No field writes bio any more: never send it, so saving can't clear one.
          country: String(form.get("country") ?? "") || null,
          currency: String(form.get("currency") ?? "") || null,
        },
      });
      return { ok: true, intent };
    }
    if (intent === "bio") {
      // SPEC 12.2: the bio and where the person shops from. Only their own agents see it.
      await api(request, "/me", {
        method: "PATCH",
        body: {
          bio: String(form.get("bio") ?? "").trim(),
          country: String(form.get("country") ?? "") || null,
          currency: String(form.get("currency") ?? "") || null,
        },
      });
      return { ok: true, intent };
    }
    if (intent === "remove-agent-key") {
      await api(request, `/me/agent-keys/${encodeURIComponent(String(form.get("agent_id") ?? ""))}`, { method: "DELETE" });
      return { ok: true, intent };
    }
    if (intent === "delete") {
      if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete my account") {
        return data({ error: "Type “delete my account” to confirm.", intent }, 400);
      }
      await api(request, "/me", { method: "DELETE" });
      return redirect("/?account=deleted", { headers: { "set-cookie": clearSessionCookie(request) } });
    }
  } catch (err) {
    return data({ ...formError(err), intent }, 400);
  }
  return data({ error: "Unknown action", intent }, 400);
}

export default function Account({ loaderData }: Route.ComponentProps) {
  const { user, agentKeys, routines } = loaderData;
  const result = useActionData<typeof action>() as { ok?: boolean; error?: string; intent?: string } | undefined;
  const nav = useNavigation();
  return (
    // The same grey page as the other app pages (review E3).
    <div className="bg-sunk">
      <div className="wrap grid max-w-2xl gap-6 py-8">
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2rem]">Account</h1>

      {/* One form, one Save: who you are here, and what your agents should know. */}
      <section aria-labelledby="profile-h" className="card grid gap-4 p-5 sm:p-6">
        <h2 id="profile-h" className="text-xl font-semibold">
          You
        </h2>
        <div className="grid gap-1">
          <p className="label">Email</p>
          <p className="break-all text-ink-2">{user.email}</p>
          <p className="hint">Only you can see this. Everyone else sees your handle.</p>
        </div>
        <Form method="post" className="grid gap-4">
          <input type="hidden" name="intent" value="profile" />
          <label className="field">
            <span className="label">Handle</span>
            <input name="handle" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9\-]{2,39}" defaultValue={user.handle} className="input font-mono" />
            <span className="hint">Shown on your lists and comments.</span>
          </label>
          <div id="bio" className="grid scroll-mt-24 gap-4 border-t border-line pt-4">
            {/* What agents should know lives in Skills, one place (SPEC 18.5, review E1). The API keeps bio; no page writes it. */}
            <p className="text-[0.92rem] text-ink-2">
              Sizes, stores you trust, when to ask you first: tell your agents in{" "}
              <Link to="/app/skills" className="link font-medium text-ink">
                Skills
              </Link>
              .
            </p>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <Field label="Country">
                {(p) => (
                  <Select {...p} name="country" defaultValue={user.country ?? ""}>
                    <option value="">Not set</option>
                    {COUNTRIES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Currency">
                {(p) => (
                  <Select {...p} name="currency" defaultValue={user.currency ?? ""}>
                    <option value="">Not set</option>
                    {CURRENCIES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </div>
          <div aria-live="polite">
            {result?.intent === "profile" && result.error && <p className="form-error">{result.error}</p>}
            {result?.intent === "profile" && result.ok && <p className="form-ok">Saved.</p>}
          </div>
          <button className="btn btn-want w-fit" disabled={nav.state !== "idle"}>
            Save
          </button>
        </Form>
      </section>

      {routines && (
        <>
          <ExaKeySection exaKey={routines.exaKey} />
          <Notifications prefs={routines.prefs} />
          <TimeZoneSection saved={user.time_zone ?? null} />
        </>
      )}

      {agentKeys.length > 0 && <AgentKeys keys={agentKeys} />}

      <Appearance />

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <p className="text-ink-2">Signed in on this browser.</p>
        <Form method="post" action="/logout">
          <button className="btn btn-ghost">Sign out</button>
        </Form>
      </section>

      {/* Quiet until asked for: the typed confirmation opens from a link-sized control. */}
      <details className="group px-1">
        <summary className="textlink-btn inline-flex min-h-11 items-center text-[0.9rem] text-danger">Delete account…</summary>
        <section aria-labelledby="del-h" className="mt-2 grid gap-3 rounded-[1.1rem] border border-danger/40 p-5 sm:p-6">
          <h2 id="del-h" className="text-lg font-semibold">
            Delete your account
          </h2>
          <p className="text-[0.9rem] text-ink-2">Deletes your account, your lists and your agents' access. This can't be undone.</p>
          <Form method="post" className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="intent" value="delete" />
            <label className="field">
              <span className="label">Type “delete my account”</span>
              <input name="confirm" required autoComplete="off" className="input" />
            </label>
            <button className="btn btn-danger">Delete account</button>
            {result?.intent === "delete" && result.error && <p className="form-error sm:col-span-2">{result.error}</p>}
          </Form>
        </section>
      </details>
      </div>
    </div>
  );
}

const APPEARANCE: Array<[value: "system" | "light" | "dark", label: string]> = [
  ["system", "Match device"],
  ["light", "Light"],
  ["dark", "Dark"],
];

/**
 * Light or dark for this browser. Saved in a cookie (POST /theme) and read on the server, so the
 * page renders in the right mode with no flash, signed in or not. The default follows the device.
 */
function Appearance() {
  const { theme } = useRootData();
  const fetcher = useFetcher<{ ok?: boolean }>();
  const [choice, setChoice] = useState(theme);
  const saved = fetcher.state === "idle" && fetcher.data?.ok;
  // Applied the moment it is picked: it's a cookie on this browser, so there is nothing to confirm.
  const pick = (value: typeof choice) => {
    setChoice(value);
    if (value === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", value);
    fetcher.submit({ theme: value }, { method: "post", action: "/theme" });
  };
  return (
    <section aria-labelledby="appearance-h" className="card grid gap-4 p-5 sm:p-6">
      <h2 id="appearance-h" className="text-xl font-semibold">
        Appearance
      </h2>
      <fetcher.Form method="post" action="/theme" className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="label mb-1">On this browser</legend>
          {APPEARANCE.map(([value, label]) => (
            <label key={value} className="check">
              <input type="radio" name="theme" value={value} checked={choice === value} onChange={() => pick(value)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <div aria-live="polite" className="sr-only">
          {saved ? "Appearance saved." : ""}
        </div>
        {/* Without JavaScript the choice needs a button. */}
        <noscript>
          <button className="btn w-fit">Save</button>
        </noscript>
      </fetcher.Form>
    </section>
  );
}

/** Agents that signed up with their own address and hold a key to this account (SPEC 13.6). Only when there are some. */
function AgentKeys({ keys }: { keys: AgentInfo[] }) {
  return (
    <section aria-labelledby="agent-keys-h" className="card grid gap-4 p-5 sm:p-6">
      <div>
        <h2 id="agent-keys-h" className="text-xl font-semibold">
          Agents with access to your account
        </h2>
        <p className="hint mt-1">They can work on every list you own. Remove one to cut it off at once.</p>
      </div>
      <ul className="grid gap-2">
        {keys.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line p-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{k.name}</p>
              <p className="text-[0.8rem] text-ink-3">
                Added <Time ts={k.created_at} />
                {k.last_used_at && (
                  <>
                    {" "}
                    · last used <Time ts={k.last_used_at} />
                  </>
                )}
              </p>
            </div>
            <Form method="post" onSubmit={(e) => !confirm(`Remove ${k.name}? It loses access to your account and every list right away.`) && e.preventDefault()}>
              <input type="hidden" name="intent" value="remove-agent-key" />
              <input type="hidden" name="agent_id" value={k.id} />
              <button className="btn btn-danger btn-xs">
                Remove<span className="sr-only"> {k.name}</span>
              </button>
            </Form>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Without JavaScript, a change that worked is answered with a redirect back here (prg.server.ts), never re-posted. */
export async function action(args: Route.ActionArgs) {
  return afterChange(args.request, await act(args));
}
