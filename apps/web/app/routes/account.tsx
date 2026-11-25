import { useState } from "react";
import { data, Form, redirect, useActionData, useFetcher, useNavigation } from "react-router";
import { useRootData } from "~/lib/hooks";
import { Field, Select, Textarea } from "~/components/ui";
import { BIO_PLACEHOLDER, COUNTRIES, COUNTRY_CURRENCY, CURRENCIES } from "~/lib/locales";
import type { Route } from "./+types/account";
import { api, apiOptional, formError } from "~/lib/api.server";
import type { AgentInfo } from "~/lib/types";
import { Time } from "~/components/Time";
import { requireUser } from "~/lib/auth.server";
import { assertSameOrigin, clearSessionCookie } from "~/lib/session.server";

export function meta() {
  return [{ title: "Account · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  // Where the request comes from (Cloudflare tells the Worker): a starting guess for country and currency,
  // only shown in the fields; nothing is saved until the person presses Save.
  const cf = (request as unknown as { cf?: { country?: string } }).cf?.country ?? request.headers.get("cf-ipcountry");
  const country = cf && COUNTRIES.some(([c]) => c === cf) ? cf : null;
  const guess = !user.country && country ? { country, currency: user.currency ?? COUNTRY_CURRENCY[country] ?? null } : null;
  // SPEC 13.6: account keys agents made with their own sign-up. Older API builds don't have the route: none.
  const agentKeys = (await apiOptional<AgentInfo[]>(request, "/me/agent-keys").catch(() => null)) ?? [];
  return data({ user, guess, agentKeys }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  try {
    if (intent === "profile") {
      await api(request, "/me", {
        method: "PATCH",
        // The feature-email choice is made once, at sign-up; this form never changes it.
        body: { handle: String(form.get("handle") ?? "").trim() },
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
  const { user, guess, agentKeys } = loaderData;
  const result = useActionData<typeof action>() as { ok?: boolean; error?: string; intent?: string } | undefined;
  const nav = useNavigation();
  return (
    <div className="wrap grid max-w-2xl gap-6 py-8">
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2rem]">Account</h1>

      <section aria-labelledby="profile-h" className="card grid gap-4 p-5 sm:p-6">
        <h2 id="profile-h" className="text-xl font-semibold">Profile</h2>
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
            <span className="hint">Shown on your lists and comments. Letters, numbers and dashes.</span>
          </label>
          <div aria-live="polite">
            {result?.intent === "profile" && result.error && <p className="form-error">{result.error}</p>}
            {result?.intent === "profile" && result.ok && <p className="form-ok">Saved.</p>}
          </div>
          <button className="btn w-fit" disabled={nav.state !== "idle"}>
            Save
          </button>
        </Form>
      </section>

      <section id="bio" aria-labelledby="bio-h" className="card grid scroll-mt-24 gap-4 p-5 sm:p-6">
        <div>
          <h2 id="bio-h" className="text-xl font-semibold">
            For your agents
          </h2>
          <p className="hint mt-1">Only your own agents see this. It's never shown on a list.</p>
        </div>
        <Form method="post" className="grid gap-4">
          <input type="hidden" name="intent" value="bio" />
          <Field label="About you">
            {(p) => <Textarea {...p} name="bio" maxLength={600} defaultValue={user.bio ?? ""} placeholder={BIO_PLACEHOLDER} className="min-h-24" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <Field label="Country">
              {(p) => (
                <Select {...p} name="country" defaultValue={user.country ?? guess?.country ?? ""}>
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
                <Select {...p} name="currency" defaultValue={user.currency ?? guess?.currency ?? ""}>
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
          {guess && !(result?.intent === "bio" && result.ok) && <p className="hint -mt-2">We guessed your country and currency from your location. Save to keep them.</p>}
          <div aria-live="polite">
            {result?.intent === "bio" && result.error && <p className="form-error">{result.error}</p>}
            {result?.intent === "bio" && result.ok && <p className="form-ok">Saved.</p>}
          </div>
          <button className="btn w-fit" disabled={nav.state !== "idle"}>
            Save
          </button>
        </Form>
      </section>

      {agentKeys.length > 0 && <AgentKeys keys={agentKeys} />}

      <Appearance />

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <p className="text-ink-2">Signed in on this browser.</p>
        <Form method="post" action="/logout">
          <button className="btn btn-ghost">Sign out</button>
        </Form>
      </section>

      <section aria-labelledby="del-h" className="grid gap-3 rounded-[1.1rem] border-2 border-dashed border-danger/40 p-5 sm:p-6">
        <h2 id="del-h" className="text-xl font-semibold text-danger">Delete account</h2>
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
