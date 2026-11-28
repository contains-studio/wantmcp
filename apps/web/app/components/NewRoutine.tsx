/**
 * "New routine" (SPEC 26; owner, 27 Nov 2026: "also routines besides for exa search should be there why arent they?"):
 * a choice of kinds, each a row with its name, one plain line saying what it does and what it costs, then that kind's
 * own two or three settings. Only kinds the server says are launched for this person (routines.kinds_visible) and
 * that this page knows are offered; one already on the list (or on a want) isn't offered again.
 *
 * Kinds that tell people things need the maker to say where they'll see it before it can be made: "In the app" or "In
 * the app and by email". Nothing is preselected.
 *
 * One form: without JavaScript every kind's settings show, each under its name, and the server uses the chosen kind's.
 */
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { ScheduleFields } from "./RoutineCard";
import type { RoutineResult } from "~/lib/routines.server";
import { atOnceHint, browserTimeZone, EXA_NOTICE, EXA_NOTICE_COUNTRY, kindFlag, PAUSED_FOR_EVERYONE, type RoutinesSwitch } from "~/lib/routines";
import type { ListFormat, Occasion, RoutineKind } from "~/lib/types";

type Want = { id: string; text: string };

const KINDS: Array<{ kind: RoutineKind; name: string; line: string; lists?: ListFormat[] }> = [
  { kind: "exa_search", name: "Search the web for these wants", line: "Looks for each open want on its schedule and suggests what it finds. You decide what stays." },
  { kind: "target_price", name: "Tell me when it's at my price", line: "Tells you when a price posted on a want is at or under your number.", lists: ["shopping"] },
  { kind: "countdown", name: "Countdown and order-by dates", line: "Counts down to a date, and tells you the last day to order each thing so it arrives." },
  { kind: "due_reminders", name: "Remind me before things are due", line: "Tells you a few days before a want's due date, and when it's overdue." },
  { kind: "restock", name: "Bring it back after I buy it", line: "When a want is bought, puts it back on the list after a while, for you to confirm.", lists: ["shopping", "tasks"] },
  { kind: "agent_check", name: "Ask my agent to check", line: "On a schedule, leaves one of your agents a note to re-check old prices and wants that are stuck." },
  { kind: "list_changes", name: "Send this list's changes to a URL", line: "As things change, tells a URL of yours which things changed. Only which, not their text." },
];

/** SPEC 26.21.4: the changes it can send, in the server's words, and the ones ticked to start with. */
const CHANGE_TYPES: Array<[type: string, words: string, on: boolean]> = [
  ["item.created", "New wants", true],
  ["entry.listed", "New options", true],
  ["entry.suggested", "Suggestions from outside", false],
  ["price.posted", "Prices", true],
  ["item.status_changed", "Status changes", true],
  ["item.purchased", "Bought or done", true],
  ["question.asked", "Questions asked", false],
  ["question.answered", "Questions answered", false],
  ["comment.created", "Comments", false],
  ["list.claimed", "The list kept", false],
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
  myAgents,
  urls,
  listPrivate,
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
  /** The person's own agents that write this list and have no "Ask my agent to check" here yet (one per agent). */
  myAgents: Array<{ id: string; name: string }>;
  /** The person's own URLs that answered the handshake (SPEC 26.21.4). */
  urls: Array<{ id: string; name: string; host: string }>;
  listPrivate: boolean;
  /** ?new=<kind>&item=<id>: opened from a want ("Tell me when it's at my price"). */
  preset: { kind: RoutineKind | null; item: string | null; /** ?new=…: open the chooser, with or without a kind. */ open?: boolean };
}) {
  const f = useFetcher<RoutineResult>({ key: `routine-new-${listId}` });
  const offered = KINDS.filter(
    (k) =>
      kindFlag(sw.kinds_visible, k.kind) &&
      (!k.lists || k.lists.includes(format)) &&
      !(k.kind === "target_price"
        ? wants.length === 0
        : k.kind === "restock"
          ? restockWants.length === 0
          : k.kind === "agent_check"
            ? myAgents.length === 0
            : taken.includes(k.kind)),
  );
  const [kind, setKind] = useState<RoutineKind | null>(preset.kind && offered.some((k) => k.kind === preset.kind) ? preset.kind : offered.length === 1 ? offered[0].kind : null);
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  const [byEmail, setByEmail] = useState(false);
  // Opening "New routine", or picking a kind, brings the chooser's heading to the top of the screen.
  const legend = useRef<HTMLLegendElement>(null);
  const toTop = () => requestAnimationFrame(() => legend.current?.scrollIntoView({ block: "start" }));
  const choose = (k: RoutineKind) => {
    setKind(k);
    toTop();
  };
  // The first routine carries the browser's zone when none is saved (20.14 item 6); never written on opening a page.
  const [tz, setTz] = useState("");
  useEffect(() => {
    if (!timeZone) setTz(browserTimeZone() ?? "");
  }, [timeZone]);
  if (offered.length === 0) return null;
  const today = (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[new Date().getDay()];
  // Each kind's own settings, shown right under its option.
  const parts: Partial<Record<RoutineKind, React.ReactNode>> = {
    exa_search: (
          <KindPart>
            <ScheduleFields initial={{ every: "week", interval: 1, days: [today], time: "09:00" }} idPrefix={`new-${listId}`} />
            <div className="grid gap-1 rounded-[10px] bg-sunk p-3 text-[0.88rem] text-ink-2">
              <p>{EXA_NOTICE}</p>
              {country && <p>{EXA_NOTICE_COUNTRY}</p>}
            </div>
          </KindPart>
    ),
    target_price: (
          <KindPart>
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
    ),
    countdown: (
          <KindPart>
            <CountdownFields occasions={occasions} shopping={format === "shopping"} required={kind === "countdown"} />
          </KindPart>
    ),
    due_reminders: (
          <KindPart>
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
    ),
    restock: (
          <KindPart>
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
    ),
    list_changes: (
      <KindPart>
        {urls.length ? (
          <>
            <label className="field">
              <span className="label">Send to</span>
              <select name="endpoint_id" className="input" defaultValue={urls.length === 1 ? urls[0].id : ""} required={kind === "list_changes"}>
                <option value="" disabled>
                  Choose one of your URLs
                </option>
                {urls.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.host})
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="grid gap-1.5">
              <legend className="label mb-1">Which changes</legend>
              {CHANGE_TYPES.map(([t, words, on]) => (
                <label key={t} className="check">
                  <input type="checkbox" name="change_types" value={t} defaultChecked={on} />
                  <span>{words}</span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-1 rounded-[10px] bg-sunk p-3 text-[0.88rem] text-ink-2">
              <p>Only which things changed is sent: ids and times, not their text. Whoever gets it reads the list with its own key{listPrivate ? ", so this private list stays private" : ""}.</p>
              <p>Everyone on the list sees that its changes go to your URL, but never the URL.</p>
            </div>
          </>
        ) : (
          <p className="text-[0.9rem] text-ink-2">
            It needs a URL of yours that has answered the handshake.{" "}
            <Link to="/app/account#urls" className="link">
              Add a URL
            </Link>
          </p>
        )}
      </KindPart>
    ),
    agent_check: (
      <KindPart>
        <label className="field">
          <span className="label">Which agent</span>
          <select name="agent_id" className="input" defaultValue={myAgents.length === 1 ? myAgents[0].id : ""} required={kind === "agent_check"}>
            <option value="" disabled>
              Choose one of your agents
            </option>
            {myAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-2">
          <legend className="label mb-1">What to check</legend>
          <DaysCheck on="check_prices" days="prices_days" label="Prices last checked more than" initial={3} max={30} />
          <DaysCheck on="check_stuck" days="stuck_days" label="Wants with nothing new for" initial={7} max={60} />
        </fieldset>
        {live ? (
          <>
            <input type="hidden" name="ac_schedule" value="1" />
            <ScheduleFields initial={{ every: "week", interval: 1, days: ["fri"], time: "09:00" }} idPrefix={`new-ac-${listId}`} />
          </>
        ) : (
          <p className="hint">Every Friday at 9:00. You can change it on its card.</p>
        )}
        <p className="hint">It never buys or changes anything. It leaves your agent a note, and its card shows whether your agent is listening.</p>
      </KindPart>
    ),
  };
  const needsKey = kind === "exa_search" && !keyOk;
  const needsUrl = kind === "list_changes" && urls.length === 0;
  const paused = !sw.running || (kind !== null && !kindFlag(sw.kinds, kind));
  return (
    <details className="rt-fold" open={!!preset.kind || !!preset.open || (f.data?.intent === "routine-create" && !!f.data.error)} onToggle={(e) => e.currentTarget.open && toTop()}>
      <summary className="btn btn-sm w-fit">New routine</summary>
      <f.Form method="post" className="rt-fold-body grid gap-5">
        <input type="hidden" name="intent" value="routine-create" />
        {tz && <input type="hidden" name="time_zone" value={tz} />}
        <fieldset className="grid gap-2">
          <legend ref={legend} className="label mb-1 scroll-mt-24">
            What should it do?
          </legend>
          {/* Once a kind is chosen, only it shows, with its settings right under it and "Change" to see the others.
              Without JavaScript every option shows, each with its own settings under it. */}
          {offered
            .filter((k) => !live || !kind || kind === k.kind)
            .map((k) => (
              <Fragment key={k.kind}>
                <div className="flex items-start gap-2">
                  <label className={`rt-kind min-w-0 flex-1 ${kind === k.kind ? "is-on" : ""}`}>
                    <input
                      type="radio"
                      name="kind"
                      value={k.kind}
                      checked={kind === k.kind}
                      onChange={() => choose(k.kind)}
                      required
                      className="rt-kind-radio"
                    />
                    <span className="grid gap-0.5">
                      <span className="font-semibold">{k.name}</span>
                      <span className="text-[0.88rem] text-ink-2">{k.line}</span>
                      <span className="text-[0.82rem] text-ink-3">{k.kind === "exa_search" ? exaCost(sw, format) : k.kind === "list_changes" ? "Uses a URL of yours" : "No key needed"}</span>
                    </span>
                  </label>
                  {live && kind === k.kind && offered.length > 1 && (
                    <button type="button" className="textlink-btn flex-none text-[0.88rem]" onClick={() => setKind(null)}>
                      Change<span className="sr-only"> what it should do</span>
                    </button>
                  )}
                </div>
                {(!live || kind === k.kind) && <div className="grid gap-3 pb-2">{parts[k.kind]}</div>}
              </Fragment>
            ))}
        </fieldset>

        {/* Where the maker sees it (26.4): required, nothing preselected. Restock tells nobody anything (it brings the
            want back), so it has no such choice. */}
        {(!live || (kind && kind !== "exa_search" && kind !== "restock" && kind !== "list_changes")) && (
          <fieldset className="grid gap-1.5">
            <legend className="label mb-1">Where you'll see it</legend>
            <label className="check">
              <input type="radio" name="follow" value="app" required={!!kind && kind !== "exa_search" && kind !== "restock" && kind !== "list_changes"} onChange={() => setByEmail(false)} />
              <span>In the app, under For you</span>
            </label>
            <label className="check rt-check">
              <input type="radio" name="follow" value="email" onChange={() => setByEmail(true)} />
              <span>
                <span className="block">In the app and by email</span>
                <span className="hint">One email a day with all your routines. You can change it in Notifications.</span>
              </span>
            </label>
            {(!live || (kind === "target_price" && byEmail)) && (
              <label className={`check rt-check ${live ? "pl-7" : "mt-1"}`}>
                <input type="checkbox" name="at_once" />
                <span>
                  <span className="block">{live ? "Email me at once when it reaches my price" : "Target price: email me at once when it reaches my price"}</span>
                  <span className="hint">{atOnceHint(sw)}</span>
                </span>
              </label>
            )}
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
          <button className="btn btn-want w-full sm:w-fit" disabled={f.state !== "idle" || (live && !kind) || needsUrl}>
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

/** "Prices last checked more than [3] days ago": a tick, and its number of days. */
function DaysCheck({ on, days, label, initial, max }: { on: string; days: string; label: string; initial: number; max: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <label className="check">
        <input type="checkbox" name={on} defaultChecked />
        <span>{label}</span>
      </label>
      <label className="flex items-center gap-2 pl-7 sm:pl-0">
        <input type="number" name={days} className="input w-20" min={1} max={max} defaultValue={initial} inputMode="numeric" aria-label={`${label}, days`} />
        <span>days</span>
      </label>
    </div>
  );
}

function KindPart({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 pl-1">{children}</div>;
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
