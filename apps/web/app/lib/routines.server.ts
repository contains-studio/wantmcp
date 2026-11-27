/**
 * SPEC 20: the writes a routine card makes, in one place for every page that shows one (the Routines tab, a list's
 * settings, the list page). Each page's action hands routine intents here. Answers are the server's words; errors are
 * its sentences (the key rule's "Add it at …" included).
 */
import { data } from "react-router";
import { api, apiOptional, formError } from "./api.server";
import type { Routine, ScheduleInput, ServiceKey, UserSelf, Weekday } from "./types";
import { routinesOn } from "./routines";

export const ROUTINE_INTENTS = new Set([
  "routine-create",
  "routine-rename",
  "routine-schedule",
  "routine-pause",
  "routine-resume",
  "routine-delete",
  "routine-run",
  "routine-pending",
  "routine-undo",
  "routine-item-resume",
]);

export type RoutineResult = { ok?: boolean; intent: string; routineId?: string; message?: string; error?: string };

const DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** The schedule form's fields as the API's ScheduleInput (20.4). The server checks it and answers in its own words. */
export function scheduleFromForm(form: FormData): ScheduleInput {
  const every = String(form.get("every") ?? "week") as ScheduleInput["every"];
  const out: ScheduleInput = { every, interval: Number(form.get("interval") ?? 1) || 1, time: String(form.get("time") ?? "09:00") };
  if (every === "week") out.days = form.getAll("days").map(String).filter((d): d is Weekday => DAYS.includes(d as Weekday));
  if (every === "month") {
    const d = String(form.get("day_of_month") ?? "1");
    out.day_of_month = d === "last" ? "last" : Number(d);
  }
  return out;
}

export async function routineAction(request: Request, form: FormData): Promise<ReturnType<typeof data<RoutineResult>>> {
  const intent = String(form.get("intent"));
  const id = String(form.get("routine_id") ?? "");
  const r = encodeURIComponent(id);
  const done = (message: string | undefined, routineId = id) => data<RoutineResult>({ ok: true, intent, routineId, message });
  try {
    switch (intent) {
      case "routine-create": {
        const listId = String(form.get("list_id") ?? "");
        const schedule = form.get("every") ? scheduleFromForm(form) : undefined;
        // The first routine carries the browser's zone when the person has none saved (20.14 item 6).
        const tz = String(form.get("time_zone") ?? "");
        const body = { kind: "exa_search", ...(schedule || tz ? { schedule: { ...(schedule ?? { every: "week" }), ...(tz ? { time_zone: tz } : {}) } } : {}) };
        const made = await api<Routine>(request, `/lists/${encodeURIComponent(listId)}/routines`, { method: "POST", body });
        return done(`Made. ${made.schedule_text}.`, made.id);
      }
      case "routine-rename": {
        const got = await api<Routine>(request, `/routines/${r}`, { method: "PATCH", body: { name: String(form.get("name") ?? "") } });
        return done(`Renamed “${got.name}”.`);
      }
      case "routine-schedule": {
        const got = await api<Routine>(request, `/routines/${r}`, { method: "PATCH", body: { schedule: scheduleFromForm(form) } });
        return done(`${got.schedule_text}.`);
      }
      case "routine-pause":
        await api<Routine>(request, `/routines/${r}`, { method: "PATCH", body: { paused: true } });
        return done("Paused.");
      case "routine-resume":
        await api<Routine>(request, `/routines/${r}`, { method: "PATCH", body: { resume: true } });
        return done("Resumed.");
      case "routine-delete":
        await api(request, `/routines/${r}`, { method: "DELETE" });
        return done("Deleted.");
      case "routine-run":
        await api(request, `/routines/${r}/run`, { method: "POST" });
        return done("Running now. Its results will be in its history shortly.");
      case "routine-pending": {
        const res = await api<{ rejected: number }>(request, `/routines/${r}/pending`, { method: "DELETE" });
        return done(res.rejected ? `Removed ${res.rejected} pending suggestion${res.rejected === 1 ? "" : "s"}.` : "Nothing was pending.");
      }
      case "routine-undo":
        await api(request, `/routines/${r}/undo`, { method: "POST", body: { change_id: String(form.get("change_id") ?? "") } });
        return done("Undone.");
      case "routine-item-resume":
        await api(request, `/routines/${r}/items/${encodeURIComponent(String(form.get("item_id") ?? ""))}/resume`, { method: "POST" });
        return done("It will look for this again on its next run.");
      default:
        return data<RoutineResult>({ intent, error: "Unknown action" }, 400);
    }
  } catch (err) {
    return data<RoutineResult>({ intent, routineId: id, ...formError(err) }, 400);
  }
}

/** The viewer's Exa key, when routines are on: its status decides whether a change that needs a key can be confirmed. */
export async function myExaKey(request: Request, user: UserSelf | null): Promise<ServiceKey | null> {
  if (!routinesOn(user)) return null;
  const res = await apiOptional<{ data: ServiceKey[] }>(request, "/me/service-keys").catch(() => null);
  return res?.data.find((k) => k.service === "exa") ?? null;
}
