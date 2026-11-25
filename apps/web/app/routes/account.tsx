import { data, Form, redirect, useActionData, useNavigation } from "react-router";
import { Field, Select, Textarea } from "~/components/ui";
import { BIO_PLACEHOLDER, COUNTRIES, CURRENCIES } from "~/lib/locales";
import type { Route } from "./+types/account";
import { api, formError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { assertSameOrigin, clearSessionCookie } from "~/lib/session.server";

export function meta() {
  return [{ title: "Account · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return data({ user }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  try {
    if (intent === "profile") {
      await api(request, "/me", {
        method: "PATCH",
        body: { handle: String(form.get("handle") ?? "").trim(), updates_opt_in: form.get("updates_opt_in") === "on" },
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
  const { user } = loaderData;
  const result = useActionData<typeof action>() as { ok?: boolean; error?: string; intent?: string } | undefined;
  const nav = useNavigation();
  return (
    <div className="wrap grid max-w-2xl gap-6 py-8">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-[1.75rem] font-semibold">{user.handle}</h1>
      </div>

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
          <label className="check">
            <input type="checkbox" name="updates_opt_in" defaultChecked={user.updates_opt_in} />
            <span>Email me about new features</span>
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
          <div aria-live="polite">
            {result?.intent === "bio" && result.error && <p className="form-error">{result.error}</p>}
            {result?.intent === "bio" && result.ok && <p className="form-ok">Saved.</p>}
          </div>
          <button className="btn w-fit" disabled={nav.state !== "idle"}>
            Save
          </button>
        </Form>
      </section>

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
