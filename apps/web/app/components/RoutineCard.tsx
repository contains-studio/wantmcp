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
import { LiveRunLine } from "./LiveRunLine";
import { CopyButton } from "./CopyButton";
import { Time } from "./Time";
import { AWAY_PROMPT, SCHEDULERS } from "~/lib/schedulers";
import type { RoutineResult } from "~/lib/routines.server";
import { useRootData } from "~/lib/hooks";
import {
  MOVES_TO_YOUR_KEY,
  agentWroteName,
  generatedHandle,
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

/** The kinds this page knows how to show in full; any other is shown with its name and status (SPEC 26.2). */
export const KNOWN_KINDS = new Set(["exa_search", "target_price", "countdown", "due_reminders", "restock", "weekly_summary", "agent_check", "list_changes"]);

/** Blocks a person can lift by resuming (20.10); key blocks lift when the key holder fixes their key. */
const RESUMABLE = new Set(["key_holder_left", "all_rejected", "unattended"]);
const KEY_BLOCKS = new Set(["key_missing", "key_refused", "out_of_credit"]);

/** SPEC 26.20 item 4: the kinds whose email can also go to other addresses. */
const RECIPIENT_KINDS = new Set(["due_reminders", "countdown", "target_price", "weekly_summary"]);

export function RoutineCard({
  routine: r,
  sw,
  keyOk,
  inSettings = false,
  listPrivate = false,
}: {
  routine: Routine;
  sw: RoutinesSwitch;
  keyOk: boolean;
  inSettings?: boolean;
  /** Its list is private: adding an address says what they'll see, and offers to name the list. */
  listPrivate?: boolean;
}) {
  const f = useFetcher<RoutineResult>({ key: `routine-${r.id}` });
  const result = f.data?.routineId === r.id ? f.data : undefined;
  // SPEC 26.2: kinds this page knows get their full card; any other shows its name and status, Pause and Delete only.
  const known = KNOWN_KINDS.has(r.kind);
  const exa = r.kind === "exa_search";
  // The run to follow (a search works through wants; other kinds answer at once): just started, or already running.
  const liveId = exa ? ((result?.intent === "routine-run" ? result.runId : undefined) ?? r.live_run?.id ?? null) : null;
  const stopped = pausedForEveryone(sw, r);
  const by = namedBy(r);
  const key = whoseKey(r);
  const blockedReason = r.blocked?.reason ?? null;
  const fixMyKey = !!blockedReason && KEY_BLOCKS.has(blockedReason) && r.uses_my_key;
  // SPEC 26.21.9: a routine that calls a URL is resumed only by its URL holder; a stopped URL is asked again first.
  const me = useRootData().user?.handle ?? null;
  const urlHolder = r.kind === "list_changes" && !!r.calls_url && r.calls_url.holder.handle === me;
  const canResume =
    r.kind === "list_changes"
      ? urlHolder && (!!r.paused || blockedReason === "url_failing")
      : !!r.paused || (!!blockedReason && (RESUMABLE.has(blockedReason) || (KEY_BLOCKS.has(blockedReason) && !r.uses_my_key)));
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
        {liveId ? (
          // SPEC 20.14 item 10: a live line in place of the status line while a run is on, and its outcome after.
          <LiveRunLine key={liveId} routineId={r.id} listId={r.list_id ?? ""} runId={liveId} initial={r.live_run?.id === liveId ? r.live_run : null} />
        ) : (
          // The server's sentence can carry three parts (last found · last check · next): one short line each on a phone.
          <p className="grid gap-0.5 text-[0.88rem] text-ink-3">
            {r.status_text.split(" · ").map((part, i) => (
              <span key={i}>{part}</span>
            ))}
          </p>
        )}
        {stopped && <p className="text-[0.88rem] font-medium text-warn">{PAUSED_FOR_EVERYONE}</p>}
      </div>

      {r.kind === "agent_check" && r.agent_reach && <AgentReach reach={r.agent_reach} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Run now: on the viewer's key (20.2), at most a few a day. */}
        {known && exa && runs && !stopped && !r.live_run && (
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
        {/* Kinds without a key: one press. "Check now" for those that start from a date or an event (26.2 item 7). */}
        {known && !exa && r.kind !== "list_changes" && runs && !stopped && (
          <f.Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="routine-run" />
            <input type="hidden" name="routine_id" value={r.id} />
            <input type="hidden" name="answers_at_once" value="1" />
            <button className="btn btn-sm btn-ghost" disabled={f.state !== "idle" || r.run_now_left_today <= 0}>
              {r.start === "schedule" ? "Run now" : "Check now"}
              <span className="sr-only"> {r.name}</span>
            </button>
            <span className="text-[0.82rem] text-ink-3">{r.run_now_left_today > 0 ? `${r.run_now_left_today} left today` : "none left today"}</span>
          </f.Form>
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
        {canResume &&
          (exa ? (
            <KeyedSubmit f={f} routine={r} keyOk={keyOk} intent="routine-resume" label="Resume" primary />
          ) : (
            <f.Form method="post">
              <input type="hidden" name="intent" value="routine-resume" />
              <input type="hidden" name="routine_id" value={r.id} />
              <button className="btn btn-sm btn-want" disabled={f.state !== "idle"}>
                Resume<span className="sr-only"> {r.name}</span>
              </button>
            </f.Form>
          ))}
        {urlHolder && (blockedReason === "url_failing" || blockedReason === "url_removed") && (
          <Link to="/app/account#urls" className="btn btn-sm btn-ghost">
            Your URLs
          </Link>
        )}
        {fixMyKey && (
          <Link to="/app/account#keys" className="btn btn-sm btn-want">
            Change key
          </Link>
        )}
        <RemoveInTwoSteps
          question={exa ? `Delete “${r.name}”? Its suggestions stay for you to decide.` : `Delete “${r.name}”?`}
          label="Delete"
          confirm="Yes, delete"
          who={r.name}
          fields={{ intent: "routine-delete", routine_id: r.id }}
        />
      </div>

      {/* Kinds that tell people things (26.3, 26.4): who sees it, and this person's own choice. */}
      {known && !exa && r.kind !== "restock" && r.kind !== "list_changes" && <Follow f={f} routine={r} />}
      {RECIPIENT_KINDS.has(r.kind) && r.my_follow && r.my_recipients && <Recipients f={f} routine={r} listPrivate={listPrivate} result={result?.intent.startsWith("recipient-") ? result : undefined} />}

      {known && (
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <RoutineHistory routineId={r.id} name={r.name} kind={r.kind} latest={r.last_run?.id ?? null} />
        <Rename f={f} routine={r} />
        {r.schedule && <ChangeSchedule f={f} routine={r} keyOk={keyOk} schedule={r.schedule} />}
        {inSettings && exa && (
          <f.Form method="post">
            <input type="hidden" name="intent" value="routine-pending" />
            <input type="hidden" name="routine_id" value={r.id} />
            <button className="textlink-btn text-left text-[0.88rem]">Remove pending suggestions from this routine</button>
          </f.Form>
        )}
      </div>
      )}

      {/* "Also send to…" answers its own forms, under its button. */}
      {result && result.intent.startsWith("recipient-") ? null : result?.error ? (
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

const RECIPIENT_STATE: Record<NonNullable<Routine["my_recipients"]>[number]["state"], string> = {
  asked: "Asked",
  yes: "Said yes",
  no: "Said no",
  stopped: "Stopped these",
  removed: "Removed",
};

/**
 * SPEC 26.20 item 4: "Also send to…" up to 3 other addresses, each asked once and sent nothing until they say yes.
 * Their states (asked, yes since, no, stopped), with Remove for the live ones. Only the person who added them sees
 * them; an address is never shown after a No or a stop (the server keeps none).
 */
function Recipients({ f, routine: r, listPrivate, result }: { f: F; routine: Routine; listPrivate: boolean; result?: RoutineResult }) {
  // How they'll see who's asking: the ask names the person by handle only (never their email).
  const me = useRootData().user?.handle ?? null;
  const answer = result?.error ? (
    <p className="form-error" role="alert">
      {result.error}
    </p>
  ) : result?.message ? (
    <p className="text-ink-2" role="status">
      {result.message}
    </p>
  ) : null;
  const all = (r.my_recipients ?? []).filter((x) => x.state !== "removed");
  const live = all.filter((x) => x.state === "asked" || x.state === "yes");
  const adding = f.state !== "idle" && f.formData?.get("intent") === "recipient-add";
  // A fresh field after each address is asked.
  const round = all.length;
  return (
    <details className="rt-fold text-[0.88rem]" open={all.length > 0 || undefined}>
      <summary className="textlink-btn w-fit">
        Also send to…<span className="sr-only"> other addresses, for {r.name}</span>
      </summary>
      <div className="grid gap-3 pt-2">
        {all.length > 0 && (
          <ul className="grid gap-1.5">
            {all.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 break-all">{x.email ?? "An address"}</span>
                <span className="text-ink-3">
                  {RECIPIENT_STATE[x.state]} <Time ts={x.since} />
                </span>
                {(x.state === "asked" || x.state === "yes") && (
                  <f.Form method="post">
                    <input type="hidden" name="intent" value="recipient-remove" />
                    <input type="hidden" name="routine_id" value={r.id} />
                    <input type="hidden" name="recipient_id" value={x.id} />
                    <button className="textlink-btn text-[0.88rem]">
                      Remove<span className="sr-only"> {x.email}</span>
                    </button>
                  </f.Form>
                )}
              </li>
            ))}
          </ul>
        )}
        {live.length < 3 ? (
          <f.Form method="post" className="grid gap-2" key={round}>
            <input type="hidden" name="intent" value="recipient-add" />
            <input type="hidden" name="routine_id" value={r.id} />
            {(listPrivate || r.kind === "weekly_summary") && <p className="text-ink-2">They will see the names of the wants this is about.</p>}
            <label className="field">
              <span className="label">Their email address</span>
              <input type="email" name="email" className="input" autoComplete="off" required maxLength={254} />
            </label>
            {listPrivate && r.kind !== "weekly_summary" && (
              <label className="check">
                <input type="checkbox" name="show_list_name" />
                <span>Show the list's name in the ask</span>
              </label>
            )}
            <p className="hint">We email them once to ask. Nothing else goes to them unless they say yes, and every email lets them stop.</p>
            {me && (
              <p className="text-ink-3">
                They'll see it's from @{me}.
                {generatedHandle(me) && (
                  <>
                    {" "}
                    <Link to="/app/account#handle" className="link">
                      Change your handle
                    </Link>
                  </>
                )}
              </p>
            )}
            <button className="btn btn-sm w-fit" disabled={adding}>
              {adding ? "Asking…" : "Ask them"}
            </button>
            {answer}
          </f.Form>
        ) : (
          <>
            <p className="text-ink-3">That's 3, the most for one routine.</p>
            {answer}
          </>
        )}
      </div>
    </details>
  );
}

/**
 * SPEC 26.20 item 5: whether the agent an "Ask my agent to check" leaves notes for can be told at once, in the
 * server's sentence (agent_reach.text; ours only when it is absent). Most agents can't be woken by anyone: they see
 * the note the next time they look, so the card also gives /connect's instruction for a scheduled run, and the apps
 * that have one. The agent's name is its person's or app's words, shown as plain text.
 */
function AgentReach({ reach }: { reach: NonNullable<Routine["agent_reach"]> }) {
  const name = reach.agent.name;
  const text = (reach as { text?: string }).text;
  if (reach.listening) return <p className="text-[0.9rem] text-ink-2">{text || `${name} is listening: it is told the moment this is due.`}</p>;
  return (
    <div className="grid gap-2 rounded-[10px] bg-sunk p-3 text-[0.9rem]">
      {text ? (
        <p className="text-ink-2">{text}</p>
      ) : (
        <p className="text-ink-2">
          {name} sees this the next time it looks
          {reach.last_seen_at ? (
            <>
              {" "}
              (last seen <Time ts={reach.last_seen_at} />)
            </>
          ) : null}
          . To make it look on a schedule, set up a scheduled run in its app with this instruction:
        </p>
      )}
      <pre className="codeblock text-[0.85rem]" tabIndex={0} role="region" aria-label="Instruction for a scheduled run">
        {AWAY_PROMPT}
      </pre>
      <CopyButton text={AWAY_PROMPT} label="Copy" className="btn btn-sm w-fit" />
      <details className="text-[0.88rem]">
        <summary className="textlink-btn w-fit">Apps that can run on a schedule</summary>
        <ul className="mt-2 grid gap-1">
          {SCHEDULERS.map(([app, feature, href]) => (
            <li key={app} className="flex flex-wrap justify-between gap-x-3">
              <span>{app}</span>
              <a href={href} className="link text-ink-2" rel="noopener noreferrer">
                {feature}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

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

function ChangeSchedule({ f, routine: r, keyOk, schedule }: { f: F; routine: Routine; keyOk: boolean; schedule: Schedule }) {
  return (
    <details className="rt-fold">
      <summary className="textlink-btn text-[0.88rem]">
        Change schedule<span className="sr-only"> of {r.name}</span>
      </summary>
      <f.Form method="post" className="rt-fold-body grid gap-3">
        <input type="hidden" name="intent" value="routine-schedule" />
        <input type="hidden" name="routine_id" value={r.id} />
        <ScheduleFields initial={schedule} idPrefix={r.id} moving={!r.uses_my_key ? (more) => (more ? (keyOk ? MOVES_TO_YOUR_KEY : "Running it more often would use your own Exa key, and you haven't saved one.") : null) : undefined} />
        <div className="flex items-center gap-3">
          <button className="btn btn-sm">Save schedule</button>
          <span className="text-[0.82rem] text-ink-3">In {zoneCity(schedule.time_zone)}</span>
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

/**
 * Who sees it (SPEC 26.3, 26.4): following is the app ("For you"), and by email if the person chose it. A routine nobody
 * follows tells nobody, and says so.
 */
function Follow({ f, routine: r }: { f: F; routine: Routine }) {
  const mine = r.my_follow;
  const put = (email: boolean, label: string, sr: string, cls: string) => (
    <f.Form method="post">
      <input type="hidden" name="intent" value="routine-follow" />
      <input type="hidden" name="routine_id" value={r.id} />
      {email && <input type="hidden" name="email" value="on" />}
      {email && mine?.at_once && <input type="hidden" name="at_once" value="on" />}
      <button className={cls}>
        {label}
        <span className="sr-only"> {sr}</span>
      </button>
    </f.Form>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.88rem]">
      {mine ? (
        <>
          <span className="text-ink-2">
            {mine.email ? (mine.at_once ? "You get these in the app and by email, at once" : "You get these in the app and by email") : "You see these in the app"}
          </span>
          {mine.email ? put(false, "App only", `for ${r.name}`, "textlink-btn text-[0.88rem]") : put(true, "Email me too", `about ${r.name}`, "textlink-btn text-[0.88rem]")}
          <f.Form method="post">
            <input type="hidden" name="intent" value="routine-unfollow" />
            <input type="hidden" name="routine_id" value={r.id} />
            <button className="textlink-btn text-[0.88rem]">
              Stop<span className="sr-only"> following {r.name}</span>
            </button>
          </f.Form>
        </>
      ) : (
        <>
          <span className="text-ink-3">{r.followers === 0 ? "Nobody gets these yet" : `${r.followers} ${r.followers === 1 ? "person gets" : "people get"} these`}</span>
          {put(false, "Follow in the app", r.name, "btn btn-sm btn-ghost")}
          {put(true, "And by email", `follow ${r.name} in the app and by email`, "btn btn-sm btn-ghost")}
        </>
      )}
    </div>
  );
}
