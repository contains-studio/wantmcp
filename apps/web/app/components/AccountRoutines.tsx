/**
 * The account page's routine parts (SPEC 20.3, 20.5, 20.8, 20.14), shown only once routines are launched for this
 * person: Keys (#keys), Notifications (#notifications, also #email) and Time zone. All web only: an agent can never add, see or change any of
 * them.
 *
 * The Exa key is typed once and never shown again: the field is write-only (empty on every load, never in the
 * address), and afterwards only its last 4 characters and status appear.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useActionData, useFetcher } from "react-router";
import { RemoveInTwoSteps } from "./AccessRow";
import { Time } from "./Time";
import { aboutHour, atOnceHint, browserTimeZone, keyCheckCost, routinesOn } from "~/lib/routines";
import { useRootData } from "~/lib/hooks";
import type { AccountRoutineResult } from "~/lib/routines.server";
import type { EmailPrefs, RoutineEndpoint, ServiceKey } from "~/lib/types";
import { CopyButton } from "./CopyButton";

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
  // What a key check costs, as the server says (routines.about); nothing typed here.
  const checkCost = keyCheckCost(routinesOn(useRootData().user));
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
        <p className="text-[0.92rem] text-ink-2">
          Routines that search the web run on your own Exa key, so the searches are yours. We never pay for them. Nobody on your lists can see your
          key; we keep it encrypted.{" "}
          <Link to="/privacy#routines-exa" className="link">
            How we keep it
          </Link>
        </p>
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
              <span className="text-[0.85rem] text-ink-3">{checkCost ? `One search: about ${checkCost} of your Exa credit.` : "One search on your Exa account."}</span>
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
  const checkCost = keyCheckCost(routinesOn(useRootData().user));
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
          {checkCost ? `Saving checks it with one search, about ${checkCost} of your Exa credit.` : "Saving checks it with one search on your Exa account."} Afterwards only its last 4
          characters show.{" "}
          <a href="https://exa.ai/" className="link" target="_blank" rel="noopener noreferrer">
            Get a key from Exa<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
      {!replacing && (
        <label className="check">
          <input type="checkbox" name="email_routine_key" />
          <span>Email me when my Exa key stops working</span>
        </label>
      )}
      <button className="btn btn-want w-full sm:w-fit" disabled={busy}>
        {busy && f.formData?.get("intent") === "key-save" ? "Checking with Exa…" : replacing ? "Save new key" : "Save key"}
      </button>
    </f.Form>
  );
}

export function Notifications({ prefs }: { prefs: EmailPrefs }) {
  const f = useFetcher<AccountRoutineResult>({ key: "email-prefs" });
  const sw = routinesOn(useRootData().user);
  // One fetcher for Save and "Stop all", so only the latest answer shows; a fresh form after each, so the switches
  // show what the server now has.
  const round = `${f.data?.intent ?? ""}${f.data?.message ?? ""}`;
  const byEmail = prefs.follows.filter((x) => x.email);
  const anyEmail = byEmail.length > 0 || Object.values(prefs.kinds).some(Boolean);
  return (
    <section aria-labelledby="notifications-h" id="notifications" className="card grid scroll-mt-24 gap-4 p-5 sm:p-6">
      {/* id="email": the section's first name, so anything that linked to #email still lands here. */}
      <div id="email" className="grid scroll-mt-24 gap-1">
        <h2 id="notifications-h" className="text-xl font-semibold">
          Notifications
        </h2>
        <p className="text-[0.92rem] text-ink-2">Your routines always show on your lists and in the app. Here you choose what also comes by email.</p>
      </div>
      <f.Form method="post" className="grid gap-3" key={round}>
        <input type="hidden" name="intent" value="email-prefs" />
        {prefs.follows.length > 0 && (
          <fieldset className="grid gap-2">
            <legend className="label mb-1">Email me about these routines</legend>
            <ul className="grid gap-2">
              {prefs.follows.map((x) => (
                <li key={x.routine_id} className="grid gap-1">
                  <input type="hidden" name="follow_id" value={x.routine_id} />
                  <input type="hidden" name={`follow_kind:${x.routine_id}`} value={x.routine.kind} />
                  <input type="hidden" name={`follow_was:${x.routine_id}`} value={`${x.email ? 1 : 0}${x.email && x.at_once ? 1 : 0}`} />
                  <label className="check rt-check">
                    <input type="checkbox" name={`follow_email:${x.routine_id}`} defaultChecked={x.email} />
                    <span>
                      <span className="block">{x.routine.name}</span>
                      <span className="hint">
                        {x.list ? (
                          <Link to={`/app/lists/${x.list.id}/settings#routines`} className="link">
                            {x.list.title}
                          </Link>
                        ) : (
                          "Your lists"
                        )}
                      </span>
                    </span>
                  </label>
                  {x.routine.kind === "target_price" && (
                    <label className="check rt-check pl-7">
                      <input type="checkbox" name={`follow_at_once:${x.routine_id}`} defaultChecked={x.email && x.at_once} />
                      <span>
                        <span className="block">At once when it reaches the price</span>
                      </span>
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <label className="check rt-check">
          <input type="checkbox" name="routine_digest" defaultChecked={prefs.kinds.routine_digest} />
          <span>
            <span className="block">A daily email with what my routines found</span>
            <span className="hint">Only for the routines you follow by email.</span>
          </span>
        </label>
        <label className="grid gap-1 pl-7">
          <span className="text-[0.92rem]">It comes at</span>
          <select name="email_hour" className="input w-fit" defaultValue={prefs.email_hour}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {aboutHour(h)}
              </option>
            ))}
          </select>
          <span className="hint">In your time zone.</span>
        </label>
        <label className="check rt-check">
          <input type="checkbox" name="routine_at_once" defaultChecked={prefs.kinds.routine_at_once} />
          <span>
            <span className="block">At-once emails for target prices</span>
            <span className="hint">{atOnceHint(sw)}</span>
          </span>
        </label>
        <label className="check rt-check">
          <input type="checkbox" name="routine_key" defaultChecked={prefs.kinds.routine_key} />
          <span>
            <span className="block">Email me when my Exa key stops working</span>
            <span className="hint">When Exa refuses it, or your Exa account runs out of credit.</span>
          </span>
        </label>
        <label className="check rt-check">
          <input type="checkbox" name="routine_unattended" defaultChecked={prefs.kinds.routine_unattended} />
          <span>
            <span className="block">Email me when a routine's suggestions go unlooked at for two rounds</span>
            <span className="hint">Without this, it pauses without asking.</span>
          </span>
        </label>
        <button className="btn btn-sm w-fit" disabled={f.state !== "idle"}>
          Save
        </button>
        <Result f={f} intent="email-prefs" />
      </f.Form>
      {anyEmail && (
        <f.Form method="post" className="grid gap-1 border-t border-line pt-4">
          <input type="hidden" name="intent" value="email-stop-all" />
          <button className="btn btn-sm btn-ghost w-fit" disabled={f.state !== "idle"}>
            Stop all routine emails
          </button>
        </f.Form>
      )}
      <Result f={f} intent="email-stop-all" />
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

const URL_STATE: Record<RoutineEndpoint["state"], string> = {
  ok: "Working",
  unverified: "Hasn't answered the handshake yet",
  failing: "Stopped answering",
};

/**
 * SPEC 26.21.2: the person's saved URLs (#urls, a part of Notifications), which a routine can send a list's changes to.
 * Web only. Adding one runs the handshake before the answer; its secret is shown once, with Copy, and never again
 * (not in an address, a log or storage). Each URL: its name and host (its owner only), its state and the server's
 * sentence for the last problem, what uses it, and Verify again, Send a test, New secret, Remove.
 */
export function UrlsSection({ urls }: { urls: RoutineEndpoint[] }) {
  const f = useFetcher<AccountRoutineResult>({ key: "urls" });
  // Without JavaScript the answer comes as the page's own action data.
  const page = useActionData() as AccountRoutineResult | undefined;
  const result = f.data ?? (page?.intent?.startsWith("url-") ? page : undefined);
  const busy = f.state !== "idle";
  const max = 5;
  return (
    <section aria-labelledby="urls-h" id="urls" className="card grid scroll-mt-24 gap-4 p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 id="urls-h" className="text-xl font-semibold">
          URLs
        </h2>
        <p className="text-[0.92rem] text-ink-2">
          A routine can send a list's changes to a URL of yours: an automation tool, or your own server. Only which things changed is sent, not their
          text. Your URL must answer with the challenge it receives.{" "}
          <Link to="/developers" className="link">
            See the developer page
          </Link>
        </p>
      </div>

      {result?.secret && (
        <div className="grid gap-2 rounded-[10px] bg-sunk p-3">
          <p className="font-medium" role="status">
            {result.message}
          </p>
          <p className="text-[0.9rem] text-ink-2">Its signing secret. We won't show it again:</p>
          <pre className="codeblock break-all whitespace-pre-wrap text-[0.85rem]" tabIndex={0} aria-label="Signing secret">
            {result.secret}
          </pre>
          <CopyButton text={result.secret} label="Copy" className="btn btn-sm w-fit" />
        </div>
      )}

      {urls.length > 0 && (
        <ul className="grid gap-4">
          {urls.map((u) => {
            const mine = result && !result.secret && result.endpointId === u.id ? result : undefined;
            return (
              <li key={u.id} className="grid gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="grid gap-0.5">
                  <p className="font-medium break-words">{u.name}</p>
                  <p className="font-mono text-[0.85rem] break-all text-ink-2">{u.host}</p>
                  <p className={`text-[0.9rem] ${u.state === "ok" ? "text-ink-2" : "font-medium text-warn"}`}>
                    {URL_STATE[u.state]}
                    {u.last_ok_at && (
                      <span className="font-normal text-ink-3">
                        {" "}
                        · last answered <Time ts={u.last_ok_at} />
                      </span>
                    )}
                  </p>
                  {u.last_problem && <p className="text-[0.88rem] text-ink-2">{u.last_problem}</p>}
                  {u.used_by.length > 0 && (
                    <p className="text-[0.88rem] text-ink-3">
                      Used by{" "}
                      {u.used_by.map((x, i) => (
                        <span key={x.routine.id}>
                          {i > 0 && ", "}
                          {x.list ? (
                            <Link to={`/app/lists/${x.list.id}/settings#routines`} className="link">
                              {x.list.title}
                            </Link>
                          ) : (
                            x.routine.name
                          )}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {u.state !== "ok" && <UrlButton f={f} intent="url-verify" id={u.id} label="Verify again" name={u.name} primary />}
                  {u.state !== "unverified" && <UrlButton f={f} intent="url-test" id={u.id} label="Send a test" name={u.name} />}
                  <UrlButton f={f} intent="url-rotate" id={u.id} label="New secret" name={u.name} />
                  <RemoveInTwoSteps
                    question={u.used_by.length ? `Remove “${u.name}”? Everything that uses it stops.` : `Remove “${u.name}”?`}
                    who={u.name}
                    fields={{ intent: "url-remove", endpoint_id: u.id }}
                  />
                </div>
                {busy && f.formData?.get("endpoint_id") === u.id && <p className="text-[0.88rem] text-ink-3">Calling it…</p>}
                {mine?.error ? (
                  <p className="form-error" role="alert">
                    {mine.error}
                  </p>
                ) : (
                  mine?.message && (
                    <p className="text-[0.9rem] text-ink-2" role="status">
                      {mine.message}
                    </p>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      {urls.length < max ? (
        <details className="rt-fold" open={urls.length === 0 || (result?.intent === "url-add" && !!result.error) || undefined}>
          <summary className="btn btn-sm w-fit">Add a URL</summary>
          <f.Form method="post" className="rt-fold-body grid gap-3" key={urls.length}>
            <input type="hidden" name="intent" value="url-add" />
            <label className="field">
              <span className="label">Name</span>
              <input name="name" className="input" maxLength={40} required autoComplete="off" placeholder="My n8n" />
              <span className="hint">Your own label. Only you see it.</span>
            </label>
            <label className="field">
              <span className="label">URL</span>
              <input name="url" type="url" className="input" required autoComplete="off" inputMode="url" placeholder="https://" pattern="https://.+" />
              <span className="hint">https, with no user name, password or port. We call it once now with a challenge to check it.</span>
            </label>
            <button className="btn btn-want w-fit" disabled={busy}>
              {busy && f.formData?.get("intent") === "url-add" ? "Checking it…" : "Add and check it"}
            </button>
            {result?.intent === "url-add" && result.error && (
              <p className="form-error" role="alert">
                {result.error}
              </p>
            )}
          </f.Form>
        </details>
      ) : (
        <p className="text-[0.9rem] text-ink-3">That's {max}, the most you can keep. Remove one to add another.</p>
      )}
    </section>
  );
}

function UrlButton({ f, intent, id, label, name, primary = false }: { f: ReturnType<typeof useFetcher<AccountRoutineResult>>; intent: string; id: string; label: string; name: string; primary?: boolean }) {
  return (
    <f.Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="endpoint_id" value={id} />
      <button className={primary ? "btn btn-sm btn-want" : "btn-quiet"} disabled={f.state !== "idle"}>
        {label}
        <span className="sr-only"> {name}</span>
      </button>
    </f.Form>
  );
}
