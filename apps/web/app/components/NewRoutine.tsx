/**
 * "New routine" (SPEC 26; owner, 27 Nov 2026: "also routines besides for exa search should be there why arent they?"):
 * a choice of kinds, each a row with its name, one plain line saying what it does and what it costs, then that kind's
 * own two or three settings. Only kinds the server says are launched for this person (routines.kinds_visible) and
 * that this page knows are offered; one already on the list (or on a want) isn't offered again.
 *
 * Kinds that tell people things need the maker to say how they'll hear before it can be made: "In the app" (the only
 * channel today) or "Email" (shown, coming soon). Nothing is preselected.
 *
 * One form: without JavaScript every kind's settings show, each under its name, and the server uses the chosen kind's.
 */
import { useEffect, useState } from "react";
import { Link, useFetcher } from "react-router";
import { ScheduleFields } from "./RoutineCard";
import type { RoutineResult } from "~/lib/routines.server";
import { browserTimeZone, EXA_NOTICE, EXA_NOTICE_COUNTRY, PAUSED_FOR_EVERYONE, type RoutinesSwitch } from "~/lib/routines";
import type { ListFormat, Occasion, RoutineKind } from "~/lib/types";

type Want = { id: string; text: string };

const KINDS: Array<{ kind: RoutineKind; name: string; line: string; lists?: ListFormat[] }> = [
  { kind: "exa_search", name: "Search the web for these wants", line: "Looks for each open want on its schedule and suggests what it finds. You decide what stays." },
  { kind: "target_price", name: "Tell me when it's at my price", line: "Tells you when a price posted on a want is at or under your number.", lists: ["shopping"] },
  { kind: "countdown", name: "Countdown and order-by dates", line: "Counts down to a date, and tells you the last day to order each thing so it arrives." },
  { kind: "due_reminders", name: "Remind me before things are due", line: "Tells you a few days before a want's due date, and when it's overdue." },
  { kind: "restock", name: "Bring it back after I buy it", line: "When a want is bought, puts it back on the list after a while, for you to confirm.", lists: ["shopping", "tasks"] },
];

/** "about 2 cents a search", from the server's figure for this list's format. */
function exaCost(sw: RoutinesSwitch, format: ListFormat): string {
  const usd = sw.about?.exa_search?.cost_per_search_usd?.[format];
  if (typeof usd !== "number") return "Uses your Exa key";
  const cents = Math.max(1, Math.round(usd * 100));
  return `Uses your Exa key, about ${cents} cent${cents === 1 ? "" : "s"} a search`;
}

export function NewRoutine({
  listId,
  format,
  sw,
  keyOk,
  country,
  timeZone,
  currency,
  wants,
  restockWants,
  occasions,
  taken,
  preset,
}: {
  listId: string;
  format: ListFormat;
  sw: RoutinesSwitch;
  keyOk: boolean;
  country: string | null;
  timeZone: string | null;
  currency: string | null;
  /** Open wants with no target price yet (target_price is one per want). */
  wants: Want[];
  /** Wants with no restock routine yet (one per want). */
  restockWants: Want[];
  occasions: Occasion[];
  /** Kinds already on this list that allow only one per list. */
  taken: RoutineKind[];
  /** ?new=<kind>&item=<id>: opened from a want ("Tell me when it's at my price"). */
  preset: { kind: RoutineKind | null; item: string | null };
}) {
  const f = useFetcher<RoutineResult>({ key: `routine-new-${listId}` });
  const offered = KINDS.filter(
    (k) =>
      sw.kinds_visible?.[k.kind] &&
      (!k.lists || k.lists.includes(format)) &&
      !(k.kind === "target_price" ? wants.length === 0 : k.kind === "restock" ? restockWants.length === 0 : taken.includes(k.kind)),
  );
  const [kind, setKind] = useState<RoutineKind | null>(preset.kind && offered.some((k) => k.kind === preset.kind) ? preset.kind : offered.length === 1 ? offered[0].kind : null);
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  // The first routine carries the browser's zone when none is saved (20.14 item 6); never written on opening a page.
  const [tz, setTz] = useState("");
  useEffect(() => {
    if (!timeZone) setTz(browserTimeZone() ?? "");
  }, [timeZone]);
  if (offered.length === 0) return null;
  const show = (k: RoutineKind) => !live || kind === k;
  const today = (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[new Date().getDay()];
  const needsKey = kind === "exa_search" && !keyOk;
  const paused = !sw.running || (kind !== null && sw.kinds?.[kind] === false);
  return (
    <details className="rt-fold" open={!!preset.kind || (f.data?.intent === "routine-create" && !!f.data.error)}>
      <summary className="btn btn-sm w-fit">New routine</summary>
      <f.Form method="post" className="rt-fold-body grid gap-5">
        <input type="hidden" name="intent" value="routine-create" />
        {tz && <input type="hidden" name="time_zone" value={tz} />}
        <fieldset className="grid gap-2">
          <legend className="label mb-1">What should it do?</legend>
          {offered.map((k) => (
            <label key={k.kind} className={`rt-kind ${kind === k.kind ? "is-on" : ""}`}>
              <input type="radio" name="kind" value={k.kind} checked={kind === k.kind} onChange={() => setKind(k.kind)} required className="rt-kind-radio" />
              <span className="grid gap-0.5">
                <span className="font-semibold">{k.name}</span>
                <span className="text-[0.88rem] text-ink-2">{k.line}</span>
                <span className="text-[0.82rem] text-ink-3">{k.kind === "exa_search" ? exaCost(sw, format) : "No key needed"}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {offered.some((k) => k.kind === "exa_search") && show("exa_search") && (
          <KindPart title={live ? null : "Search the web for these wants"}>
            <ScheduleFields initial={{ every: "week", interval: 1, days: [today], time: "09:00" }} idPrefix={`new-${listId}`} />
            <div className="grid gap-1 rounded-[10px] bg-sunk p-3 text-[0.88rem] text-ink-2">
              <p>{EXA_NOTICE}</p>
              {country && <p>{EXA_NOTICE_COUNTRY}</p>}
            </div>
          </KindPart>
        )}

        {offered.some((k) => k.kind === "target_price") && show("target_price") && (
          <KindPart title={live ? null : "Tell me when it's at my price"}>
            <label className="field">
              <span className="label">Which want</span>
              <select name="item_id" className="input" defaultValue={preset.item ?? ""} required={kind === "target_price"}>
                <option value="" disabled>
                  Choose a want
                </option>
                {wants.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.text}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <label className="field">
                <span className="label">At or under</span>
                <input name="target" className="input w-36" inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder="120" autoComplete="off" required={kind === "target_price"} />
              </label>
              <label className="field">
                <span className="sr-only">Currency</span>
                <select name="currency" className="input" defaultValue={currency ?? "USD"}>
                  {["USD", "GBP", "EUR", "CAD", "AUD", "NZD", "CHF", "SEK", "NOK", "DKK", "JPY", "INR"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="check">
              <input type="checkbox" name="unverified" defaultChecked />
              <span>Count prices not checked on the store's page (it always says so)</span>
            </label>
            <p className="hint">It uses prices your agents post on that want. It doesn't check shops itself.</p>
          </KindPart>
        )}

        {offered.some((k) => k.kind === "countdown") && show("countdown") && (
          <KindPart title={live ? null : "Countdown and order-by dates"}>
            <CountdownFields occasions={occasions} shopping={format === "shopping"} required={kind === "countdown"} />
          </KindPart>
        )}

        {offered.some((k) => k.kind === "due_reminders") && show("due_reminders") && (
          <KindPart title={live ? null : "Remind me before things are due"}>
            <Chips name="lead_days" legend="How long before" options={[[0, "On the day"], [1, "1 day"], [3, "3 days"], [7, "7 days"], [14, "14 days"]]} initial={[1, 7]} />
            <fieldset className="grid gap-1.5">
              <legend className="label mb-1">If it's overdue</legend>
              {(
                [
                  ["off", "Don't tell me"],
                  ["once", "Tell me once"],
                  ["daily", "Every day, for up to a week"],
                ] as const
              ).map(([v, l]) => (
                <label key={v} className="check">
                  <input type="radio" name="overdue" value={v} defaultChecked={v === "once"} />
                  <span>{l}</span>
                </label>
              ))}
            </fieldset>
          </KindPart>
        )}

        {offered.some((k) => k.kind === "restock") && show("restock") && (
          <KindPart title={live ? null : "Bring it back after I buy it"}>
            <label className="field">
              <span className="label">Which want</span>
              <select name="restock_item_id" className="input" defaultValue={preset.kind === "restock" ? (preset.item ?? "") : ""} required={kind === "restock"}>
                <option value="" disabled>
                  Choose a want
                </option>
                {restockWants.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.text}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <label className="field">
                <span className="label">Bring it back after</span>
                <input type="number" name="after_count" className="input w-24" min={1} max={52} defaultValue={4} inputMode="numeric" />
              </label>
              <label className="field">
                <span className="sr-only">Weeks or months</span>
                <select name="after_unit" className="input" defaultValue="week">
                  <option value="week">weeks</option>
                  <option value="month">months</option>
                </select>
              </label>
            </div>
            <p className="hint">It comes back as a want waiting for you: add it back, or not this time.</p>
          </KindPart>
        )}

        {/* How the maker hears (26.4): required, nothing preselected. Email is shown as coming, not hidden. Restock tells
            nobody anything (it brings the want back), so it has no such choice. */}
        {(!live || (kind && kind !== "exa_search" && kind !== "restock")) && (
          <fieldset className="grid gap-1.5">
            <legend className="label mb-1">How you'll hear about it</legend>
            <label className="check">
              <input type="radio" name="follow" value="app" required={!!kind && kind !== "exa_search" && kind !== "restock"} />
              <span>In the app, under For you</span>
            </label>
            <label className="check text-ink-3">
              <input type="radio" name="follow" value="email" disabled />
              <span>Email, coming soon</span>
            </label>
          </fieldset>
        )}

        {paused && <p className="text-[0.88rem] font-medium text-warn">{PAUSED_FOR_EVERYONE}.</p>}
        {needsKey ? (
          <p className="text-[0.9rem] text-ink-2">
            It runs on your own Exa key, and you haven't saved one.{" "}
            <Link to="/app/account#keys" className="link">
              Add your Exa key
            </Link>
          </p>
        ) : (
          <button className="btn btn-want w-full sm:w-fit" disabled={f.state !== "idle" || (live && !kind)}>
            {f.state !== "idle" ? "Making…" : "Make this routine"}
          </button>
        )}
        {f.data?.intent === "routine-create" && f.data.error && (
          <p className="form-error" role="alert">
            {f.data.error}
          </p>
        )}
      </f.Form>
    </details>
  );
}

function KindPart({ title, children }: { title: string | null; children: React.ReactNode }) {
  return (
    <div className="grid gap-3">
      {title && <h3 className="font-semibold">{title}</h3>}
      {children}
    </div>
  );
}

function Chips({ name, legend, options, initial }: { name: string; legend: string; options: Array<[number, string]>; initial: number[] }) {
  const [on, setOn] = useState<number[]>(initial);
  return (
    <fieldset className="grid gap-1.5">
      <legend className="label mb-1">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <label key={v} className={`swatch-option rt-day ${on.includes(v) ? "is-on" : ""}`}>
            <input
              type="checkbox"
              name={name}
              value={v}
              className="swatch-input"
              checked={on.includes(v)}
              onChange={(e) => setOn((xs) => (e.target.checked ? [...xs, v] : xs.filter((x) => x !== v)))}
            />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The day (from an occasion the server keeps, or a date), the milestones, and order-by dates on shopping lists. */
function CountdownFields({ occasions, shopping, required }: { occasions: Occasion[]; shopping: boolean; required: boolean }) {
  const [occ, setOcc] = useState(occasions[0]?.slug ?? "");
  const picked = occasions.find((o) => o.slug === occ) ?? null;
  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <label className="field">
          <span className="label">The day</span>
          <select name="occasion" className="input" value={occ} onChange={(e) => setOcc(e.target.value)}>
            {occasions.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
            <option value="">Another date</option>
          </select>
        </label>
        {!picked && (
          <label className="field">
            <span className="label">Date</span>
            <input type="date" name="date" className="input" required={required} />
          </label>
        )}
      </div>
      {picked && (
        <p className="hint">
          {new Date(`${picked.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
          {picked.date_end && <> to {new Date(`${picked.date_end}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</>}
        </p>
      )}
      <Chips name="milestones" legend="Countdown messages" options={[[28, "28 days"], [14, "14 days"], [7, "7 days"], [3, "3 days"], [1, "1 day"]]} initial={[14, 7, 1]} />
      {shopping && (
        <div className="grid gap-2">
          <label className="check">
            <input type="checkbox" name="order_by" defaultChecked />
            <span>Tell me the last day to order each thing</span>
          </label>
          <label className="field w-fit">
            <span className="label">Allow this many days for delivery</span>
            <input type="number" name="delivery_days" className="input w-24" min={1} max={30} defaultValue={5} inputMode="numeric" />
          </label>
        </div>
      )}
    </>
  );
}
