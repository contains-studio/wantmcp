/**
 * One routine (SPEC 20.3): its name (Rename), its schedule in the server's words (Change), whose key it runs on, the
 * server's status line, and Run now, Pause or Resume, Delete. In a list's settings it also offers "Remove pending
 * suggestions from this routine". The same card on the Routines tab and in settings; each page's action takes its
 * forms (lib/routines.server.ts). Every control is a real form, so it works without JavaScript.
 *
 * A change that makes it run, or run more, moves it onto the viewer's key: the card says so before confirming, and
 * when the viewer has no working key it says that instead, with the way to add one.
 */
import { useEffect, useState } from "react";
import { Link, useFetcher } from "react-router";
import { RemoveInTwoSteps } from "./AccessRow";
import { RoutineHistory } from "./RoutineHistory";
import type { RoutineResult } from "~/lib/routines.server";
import {
  MOVES_TO_YOUR_KEY,
  agentWroteName,
  PAUSED_FOR_EVERYONE,
  WEEKDAYS,
  namedBy,
  pausedForEveryone,
  runsPer28,
  whoseKey,
  zoneCity,
  type RoutinesSwitch,
} from "~/lib/routines";
import type { Routine, Schedule } from "~/lib/types";

/** Blocks a person can lift by resuming (20.10); key blocks lift when the key holder fixes their key. */
const RESUMABLE = new Set(["key_holder_left", "all_rejected", "unattended"]);
const KEY_BLOCKS = new Set(["key_missing", "key_refused", "out_of_credit"]);

export function RoutineCard({ routine: r, sw, keyOk, inSettings = false }: { routine: Routine; sw: RoutinesSwitch; keyOk: boolean; inSettings?: boolean }) {
  const f = useFetcher<RoutineResult>({ key: `routine-${r.id}` });
  const result = f.data?.routineId === r.id ? f.data : undefined;
  const stopped = pausedForEveryone(sw, r);
  const by = namedBy(r);
  const key = whoseKey(r);
  const blockedReason = r.blocked?.reason ?? null;
  const fixMyKey = !!blockedReason && KEY_BLOCKS.has(blockedReason) && r.uses_my_key;
  const canResume = !!r.paused || (!!blockedReason && (RESUMABLE.has(blockedReason) || (KEY_BLOCKS.has(blockedReason) && !r.uses_my_key)));
  const runs = !r.paused && !r.blocked;
  const titleId = `rt-${r.id}-h`;
  return (
    // In a list's settings the section is already a card: a rule between routines, not a card in a card.
    <article aria-labelledby={titleId} className={inSettings ? "grid gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0" : "card grid gap-3 p-4 sm:p-5"} id={`routine-${r.id}`}>
      <div className="grid gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* An agent's name is shown as a name (in quotes), never as the site's own words. */}
          <h3 id={titleId} className="min-w-0 break-words text-[1.05rem] font-semibold">
            {agentWroteName(r) ? `“${r.name}”` : r.name}
          </h3>
          {by && <span className="chip">named by {by}</span>}
        </div>
        <p className="text-[0.92rem] text-ink-2">
          {r.schedule_text}
          {key && <> · {key}</>}
        </p>
        <p className="text-[0.88rem] text-ink-3">{r.status_text}</p>
        {stopped && <p className="text-[0.88rem] font-medium text-warn">{PAUSED_FOR_EVERYONE}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Run now: on the viewer's key (20.2), at most a few a day. */}
        {runs && !stopped && (
          <KeyedSubmit
            f={f}
            routine={r}
            keyOk={keyOk}
            intent="routine-run"
            label="Run now"
            hint={r.run_now_left_today > 0 ? `${r.run_now_left_today} left today` : "none left today"}
            disabled={r.run_now_left_today <= 0}
          />
        )}
        {runs && (
          <f.Form method="post">
            <input type="hidden" name="intent" value="routine-pause" />
            <input type="hidden" name="routine_id" value={r.id} />
            <button className="btn-quiet" disabled={f.state !== "idle"}>
              Pause<span className="sr-only"> {r.name}</span>
            </button>
          </f.Form>
        )}
        {canResume && <KeyedSubmit f={f} routine={r} keyOk={keyOk} intent="routine-resume" label="Resume" primary />}
        {fixMyKey && (
          <Link to="/app/account#keys" className="btn btn-sm btn-want">
            Change key
          </Link>
        )}
        <RemoveInTwoSteps
          question={`Delete “${r.name}”? Its suggestions stay for you to decide.`}
          label="Delete"
          confirm="Yes, delete"
          who={r.name}
          fields={{ intent: "routine-delete", routine_id: r.id }}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <RoutineHistory routineId={r.id} name={r.name} />
        <Rename f={f} routine={r} />
        <ChangeSchedule f={f} routine={r} keyOk={keyOk} />
        {inSettings && (
          <f.Form method="post">
            <input type="hidden" name="intent" value="routine-pending" />
            <input type="hidden" name="routine_id" value={r.id} />
            <button className="textlink-btn text-left text-[0.88rem]">Remove pending suggestions from this routine</button>
          </f.Form>
        )}
      </div>

      {result?.error ? (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      ) : (
        result?.message && (
          <p className="text-[0.88rem] text-ink-2" role="status">
            {result.message}
          </p>
        )
      )}
    </article>
  );
}

type F = ReturnType<typeof useFetcher<RoutineResult>>;

/**
 * A button for a change that runs the routine on the viewer's key. When it already does, one press. When it would
 * move here, a fold that says so and confirms; without a working key, a fold that says that and links to Keys.
 */
function KeyedSubmit({ f, routine: r, keyOk, intent, label, hint, disabled = false, primary = false }: { f: F; routine: Routine; keyOk: boolean; intent: string; label: string; hint?: string; disabled?: boolean; primary?: boolean }) {
  const button = (text: string) => (
    <button className={`btn btn-sm ${primary ? "btn-want" : "btn-ghost"}`} disabled={disabled || f.state !== "idle"}>
      {text}
      <span className="sr-only"> {r.name}</span>
    </button>
  );
  const fields = (
    <>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="routine_id" value={r.id} />
    </>
  );
  const hintEl = hint && <span className="text-[0.82rem] text-ink-3">{hint}</span>;
  if (r.uses_my_key && keyOk) {
    return (
      <f.Form method="post" className="flex items-center gap-2">
        {fields}
        {button(label)}
        {hintEl}
      </f.Form>
    );
  }
  return (
    <details className="rt-confirm">
      <summary className={`btn btn-sm ${primary ? "btn-want" : "btn-ghost"}`} aria-disabled={disabled || undefined}>
        {label}
        <span className="sr-only"> {r.name}</span>
      </summary>
      <div className="rt-confirm-body">
        {keyOk ? (
          <f.Form method="post" className="grid gap-2">
            {fields}
            <p className="text-[0.88rem] text-ink-2">{MOVES_TO_YOUR_KEY}</p>
            <div className="flex items-center gap-2">
              {button(`${label} on my key`)}
              {hintEl}
            </div>
          </f.Form>
        ) : (
          <p className="text-[0.88rem] text-ink-2">
            This would run on your own Exa key, and you haven't saved one.{" "}
            <Link to="/app/account#keys" className="link">
              Add your Exa key
            </Link>
          </p>
        )}
      </div>
    </details>
  );
}

function Rename({ f, routine: r }: { f: F; routine: Routine }) {
  return (
    <details className="rt-fold">
      <summary className="textlink-btn text-[0.88rem]">
        Rename<span className="sr-only"> {r.name}</span>
      </summary>
      <f.Form method="post" className="rt-fold-body flex flex-wrap items-end gap-2">
        <input type="hidden" name="intent" value="routine-rename" />
        <input type="hidden" name="routine_id" value={r.id} />
        <label className="field min-w-0 flex-1">
          <span className="label">Name</span>
          <input name="name" className="input" defaultValue={r.name} required maxLength={60} autoComplete="off" />
        </label>
        <button className="btn btn-sm">Save</button>
      </f.Form>
    </details>
  );
}

function ChangeSchedule({ f, routine: r, keyOk }: { f: F; routine: Routine; keyOk: boolean }) {
  return (
    <details className="rt-fold">
      <summary className="textlink-btn text-[0.88rem]">
        Change schedule<span className="sr-only"> of {r.name}</span>
      </summary>
      <f.Form method="post" className="rt-fold-body grid gap-3">
        <input type="hidden" name="intent" value="routine-schedule" />
        <input type="hidden" name="routine_id" value={r.id} />
        <ScheduleFields initial={r.schedule} idPrefix={r.id} moving={!r.uses_my_key ? (more) => (more ? (keyOk ? MOVES_TO_YOUR_KEY : "Running it more often would use your own Exa key, and you haven't saved one.") : null) : undefined} />
        <div className="flex items-center gap-3">
          <button className="btn btn-sm">Save schedule</button>
          <span className="text-[0.82rem] text-ink-3">In {zoneCity(r.schedule.time_zone)}</span>
        </div>
      </f.Form>
    </details>
  );
}

/**
 * 20.4's parts: every day / week / month, every 1–4, the days of a week, the day of a month, a whole hour. Without
 * JavaScript every part shows (the server uses those of the chosen period). `moving` says, before saving, when the new
 * schedule runs more often and so moves onto the viewer's key.
 */
export function ScheduleFields({ initial, idPrefix, moving }: { initial?: Partial<Schedule>; idPrefix: string; moving?: (moreOften: boolean) => string | null }) {
  const [every, setEvery] = useState<Schedule["every"]>(initial?.every ?? "week");
  const [interval, setInterval] = useState(initial?.interval ?? 1);
  const [days, setDays] = useState<string[]>(initial?.days ?? []);
  // Without JavaScript every part shows; once it runs, only the chosen period's.
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  const more = !!initial?.every && runsPer28({ every, interval, days }) > runsPer28({ every: initial.every, interval: initial.interval, days: initial.days });
  const note = moving?.(more);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="field">
          <span className="label">Every</span>
          <select name="interval" className="input" value={interval} onChange={(e) => setInterval(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1" : n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="sr-only">Period</span>
          <select name="every" className="input" value={every} onChange={(e) => setEvery(e.target.value as Schedule["every"])}>
            <option value="day">{interval === 1 ? "day" : "days"}</option>
            <option value="week">{interval === 1 ? "week" : "weeks"}</option>
            <option value="month">{interval === 1 ? "month" : "months"}</option>
          </select>
        </label>
        <label className="field">
          <span className="label">At</span>
          <select name="time" className="input" defaultValue={initial?.time ?? "09:00"}>
            {Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`).map((t) => (
              <option key={t} value={t}>
                {Number(t.slice(0, 2))}:00
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="grid gap-1.5" hidden={live && every !== "week"}>
        <legend className="label mb-1">On</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map(([v, l]) => (
            <label key={v} className={`swatch-option rt-day ${days.includes(v) ? "is-on" : ""}`}>
              <input
                type="checkbox"
                name="days"
                value={v}
                className="swatch-input"
                checked={days.includes(v)}
                onChange={(e) => setDays((d) => (e.target.checked ? [...d, v] : d.filter((x) => x !== v)))}
                id={`${idPrefix}-d-${v}`}
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      {(!live || every === "month") && (
        <label className="field w-fit">
          <span className="label">Day of the month</span>
          <select name="day_of_month" className="input" defaultValue={String(initial?.day_of_month ?? "1")}>
            {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value="last">Last day</option>
          </select>
        </label>
      )}
      {note && <p className="text-[0.88rem] text-ink-2">{note}</p>}
    </div>
  );
}
