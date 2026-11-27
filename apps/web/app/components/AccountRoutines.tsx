/**
 * The account page's routine parts (SPEC 20.3, 20.5, 20.8, 20.14), shown only once routines are launched for this
 * person: Keys (#keys), How I hear (#email) and Time zone. All web only: an agent can never add, see or change any of
 * them.
 *
 * The Exa key is typed once and never shown again: the field is write-only (empty on every load, never in the
 * address), and afterwards only its last 4 characters and status appear.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useFetcher } from "react-router";
import { RemoveInTwoSteps } from "./AccessRow";
import { Time } from "./Time";
import { browserTimeZone } from "~/lib/routines";
import type { AccountRoutineResult } from "~/lib/routines.server";
import type { EmailPrefs, ServiceKey } from "~/lib/types";

function Result({ f, intent }: { f: ReturnType<typeof useFetcher<AccountRoutineResult>>; intent: string }) {
  const r = f.data?.intent === intent ? f.data : undefined;
  if (!r) return null;
  return r.error ? (
    <p className="form-error" role="alert">
      {r.error}
    </p>
  ) : (
    <p className="form-ok" role="status">
      {r.message}
    </p>
  );
}

const STATUS: Record<ServiceKey["status"], string> = {
  ok: "Working",
  refused: "Exa doesn't accept it any more",
  out_of_credit: "Out of credit",
};

export function ExaKeySection({ exaKey }: { exaKey: ServiceKey | null }) {
  const f = useFetcher<AccountRoutineResult>({ key: "exa-key" });
  const busy = f.state !== "idle";
  // A fresh form after every save: the field never keeps what was typed.
  const round = f.data?.intent === "key-save" && f.data.ok ? f.data.message : "";
  return (
    <section aria-labelledby="keys-h" id="keys" className="card grid scroll-mt-24 gap-4 p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 id="keys-h" className="text-xl font-semibold">
          Keys
        </h2>
        <p className="text-[0.92rem] text-ink-2">Routines that search the web run on your own Exa key, so the searches are yours. We never pay for them, and nobody else can see your key.</p>
      </div>

      {exaKey && (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <p className="font-medium">
              Exa key ending in <span className="font-mono">{exaKey.last4}</span>
            </p>
            <p className={`text-[0.9rem] ${exaKey.status === "ok" ? "text-ink-2" : "font-medium text-warn"}`}>
              {STATUS[exaKey.status]} · since <Time ts={exaKey.status_at} />
            </p>
            <p className="text-[0.9rem] text-ink-2">
              {exaKey.used_this_month} of {exaKey.monthly_cap} searches used this month
            </p>
          </div>
          {exaKey.status === "out_of_credit" && (
            <f.Form method="post" className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <input type="hidden" name="intent" value="key-check" />
              <button className="btn btn-sm btn-want" disabled={busy}>
                {busy && f.formData?.get("intent") === "key-check" ? "Checking…" : "Check again"}
              </button>
              <span className="text-[0.85rem] text-ink-3">One search: about $0.007 of your Exa credit.</span>
            </f.Form>
          )}
          <Result f={f} intent="key-check" />
          {exaKey.routines.length > 0 ? (
            <div className="grid gap-1">
              <p className="label">Used by</p>
              <ul className="grid gap-0.5 text-[0.9rem]">
                {exaKey.routines.map((r) => (
                  <li key={r.id}>
                    <Link to={`/app/lists/${r.list.id}/settings#routines`} className="link">
                      {r.name}
                    </Link>{" "}
                    <span className="text-ink-3">on {r.list.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[0.9rem] text-ink-3">No routine uses it yet.</p>
          )}
          <f.Form method="post" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="intent" value="key-cap" />
            <label className="field">
              <span className="label">Monthly limit (searches)</span>
              <input name="monthly_cap" type="number" inputMode="numeric" min={10} max={5000} step={1} defaultValue={exaKey.monthly_cap} required className="input w-32" />
            </label>
            <button className="btn btn-sm" disabled={busy}>
              Save limit
            </button>
          </f.Form>
          <Result f={f} intent="key-cap" />
        </div>
      )}

      {exaKey ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <details className="rt-fold">
            <summary className="textlink-btn text-[0.9rem]">Replace key</summary>
            <div className="rt-fold-body">
              <KeyForm key={round} f={f} busy={busy} replacing />
            </div>
          </details>
          <RemoveInTwoSteps
            question={exaKey.routines.length ? "Remove it? The routines that use it stop until someone resumes them with their own key." : "Remove your Exa key?"}
            label="Remove key"
            confirm="Yes, remove"
            who="your Exa key"
            fields={{ intent: "key-remove" }}
          />
        </div>
      ) : (
        <KeyForm key={round} f={f} busy={busy} />
      )}
      <Result f={f} intent="key-save" />
      <Result f={f} intent="key-remove" />
    </section>
  );
}

/** The key field: password-style, never filled in, never echoed. Saving checks it once with Exa (it costs a little). */
function KeyForm({ f, busy, replacing = false }: { f: ReturnType<typeof useFetcher<AccountRoutineResult>>; busy: boolean; replacing?: boolean }) {
  return (
    <f.Form method="post" className="grid gap-3" autoComplete="off">
      <input type="hidden" name="intent" value="key-save" />
      <div className="field">
        <label htmlFor={`exa-key${replacing ? "-new" : ""}`} className="label">
          {replacing ? "New Exa key" : "Exa key"}
        </label>
        <input
          id={`exa-key${replacing ? "-new" : ""}`}
          name="key"
          type="password"
          required
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          className="input font-mono"
          placeholder="Paste your key"
          aria-describedby={`exa-key-hint${replacing ? "-new" : ""}`}
        />
        <p id={`exa-key-hint${replacing ? "-new" : ""}`} className="hint">
          Saving checks it with one search, about $0.007 of your Exa credit. Afterwards only its last 4 characters show.{" "}
          <a href="https://exa.ai/" className="link" target="_blank" rel="noopener noreferrer">
            Get a key from Exa<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
      {!replacing && (
        <label className="check">
          <input type="checkbox" name="email_routine_key" />
          <span>Email me if my Exa key stops working</span>
        </label>
      )}
      <button className="btn btn-want w-full sm:w-fit" disabled={busy}>
        {busy && f.formData?.get("intent") === "key-save" ? "Checking with Exa…" : replacing ? "Save new key" : "Save key"}
      </button>
    </f.Form>
  );
}

export function HowIHear({ prefs }: { prefs: EmailPrefs }) {
  const f = useFetcher<AccountRoutineResult>({ key: "email-prefs" });
  return (
    <section aria-labelledby="email-h" id="email" className="card grid scroll-mt-24 gap-4 p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 id="email-h" className="text-xl font-semibold">
          How I hear
        </h2>
        <p className="text-[0.92rem] text-ink-2">Your routines always show on your lists and in the app. Email is for the two things that need you.</p>
      </div>
      <f.Form method="post" className="grid gap-3">
        <input type="hidden" name="intent" value="email-prefs" />
        <label className="check rt-check">
          <input type="checkbox" name="routine_key" defaultChecked={prefs.kinds.routine_key} />
          <span>
            <span className="block">Email me if my Exa key stops working</span>
            <span className="hint">When Exa refuses it or the account runs out of credit, so your routines don't stop without you knowing.</span>
          </span>
        </label>
        <label className="check rt-check">
          <input type="checkbox" name="routine_unattended" defaultChecked={prefs.kinds.routine_unattended} />
          <span>
            <span className="block">Email me when nobody has looked at what my routine found</span>
            <span className="hint">Once, with a link to keep it running or pause it. Without this email, it pauses without asking.</span>
          </span>
        </label>
        <button className="btn btn-sm w-fit" disabled={f.state !== "idle"}>
          Save
        </button>
        <Result f={f} intent="email-prefs" />
      </f.Form>
    </section>
  );
}

/** The person's zone for new routines: the saved one, or the browser's preselected; nothing is saved until Save. */
export function TimeZoneSection({ saved }: { saved: string | null }) {
  const f = useFetcher<AccountRoutineResult>({ key: "time-zone" });
  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      return [];
    }
  }, []);
  const [value, setValue] = useState(saved ?? "");
  useEffect(() => {
    if (!saved) setValue(browserTimeZone() ?? "");
  }, [saved]);
  const all = value && !zones.includes(value) ? [value, ...zones] : zones;
  return (
    <section aria-labelledby="tz-h" id="time-zone" className="card grid scroll-mt-24 gap-3 p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 id="tz-h" className="text-xl font-semibold">
          Time zone
        </h2>
        <p className="text-[0.92rem] text-ink-2">New routines run on this clock. The ones you have keep their own.</p>
      </div>
      <f.Form method="post" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="intent" value="time-zone" />
        <label className="field min-w-0 flex-1">
          <span className="label">Time zone</span>
          <select name="time_zone" className="input min-h-11" value={value} onChange={(e) => setValue(e.target.value)} required>
            {!value && <option value="">Choose…</option>}
            {all.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-sm" disabled={f.state !== "idle" || !value}>
          Save
        </button>
      </f.Form>
      {!saved && <p className="hint">Not saved yet: this is your browser's.</p>}
      <Result f={f} intent="time-zone" />
    </section>
  );
}
