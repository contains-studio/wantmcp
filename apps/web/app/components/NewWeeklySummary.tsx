/**
 * "A weekly summary of my lists" (SPEC 26.12): the person's own routine, on no list, made on the Routines tab by the
 * person on the web only (never by an agent). Which lists (all they write, or chosen ones), the day and hour (default
 * Sunday at their email hour), and where they'll see it (nothing preselected). One per person: once made, its card
 * shows instead.
 */
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { aboutHour, PAUSED_FOR_EVERYONE } from "~/lib/routines";
import type { RoutineResult } from "~/lib/routines.server";
import type { Weekday } from "~/lib/types";

const DAYS: Array<[Weekday, string]> = [
  ["sun", "Sunday"],
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
];

export function NewWeeklySummary({ lists, emailHour, paused }: { lists: Array<{ id: string; title: string }>; emailHour: number; paused: boolean }) {
  const f = useFetcher<RoutineResult>({ key: "routine-new-weekly" });
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  const [some, setSome] = useState(false);
  const error = f.data?.intent === "routine-create" && f.data.error ? f.data.error : null;
  return (
    <details className="rt-fold" open={!!error}>
      <summary className="btn btn-sm w-fit">New weekly summary</summary>
      <f.Form method="post" className="rt-fold-body grid gap-5">
        <input type="hidden" name="intent" value="routine-create" />
        <input type="hidden" name="kind" value="weekly_summary" />
        <fieldset className="grid gap-1.5">
          <legend className="label mb-1">Which lists</legend>
          <label className="check">
            <input type="radio" name="ws_which" value="all" defaultChecked onChange={() => setSome(false)} />
            <span>All the lists I write, now and later</span>
          </label>
          <label className="check">
            <input type="radio" name="ws_which" value="some" onChange={() => setSome(true)} />
            <span>Only these</span>
          </label>
          {(!live || some) && (
            <div className="grid gap-1.5 pl-7">
              {lists.map((l) => (
                <label key={l.id} className="check">
                  <input type="checkbox" name="ws_lists" value={l.id} />
                  <span>{l.title}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex flex-wrap items-end gap-2">
          <label className="field">
            <span className="label">Every</span>
            <select name="ws_day" className="input" defaultValue="sun">
              {DAYS.map(([d, n]) => (
                <option key={d} value={d}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">At</span>
            <select name="ws_hour" className="input" defaultValue={emailHour}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {aboutHour(h)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="grid gap-1.5">
          <legend className="label mb-1">Where you'll see it</legend>
          <label className="check">
            <input type="radio" name="follow" value="app" required />
            <span>In the app, under For you</span>
          </label>
          <label className="check rt-check">
            <input type="radio" name="follow" value="email" />
            <span>
              <span className="block">In the app and by email</span>
              <span className="hint">One email, on its day.</span>
            </span>
          </label>
        </fieldset>

        {paused && <p className="text-[0.88rem] font-medium text-warn">{PAUSED_FOR_EVERYONE}.</p>}
        <button className="btn btn-want w-full sm:w-fit" disabled={f.state !== "idle"}>
          {f.state !== "idle" ? "Making…" : "Make this routine"}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </f.Form>
    </details>
  );
}
