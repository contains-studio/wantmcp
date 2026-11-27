/**
 * SPEC 20: the writes a routine card makes, in one place for every page that shows one (the Routines tab, a list's
 * settings, the list page). Each page's action hands routine intents here. Answers are the server's words; errors are
 * its sentences (the key rule's "Add it at …" included).
 */
import { data } from "react-router";
import { api, apiOptional, formError } from "./api.server";
import type { EmailPrefs, Routine, ScheduleInput, ServiceKey, UserSelf, Weekday } from "./types";
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

export type RoutineResult = { ok?: boolean; intent: string; routineId?: string; message?: string; error?: string; runId?: string };

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
      case "routine-run": {
        // The card follows the run live from here (SPEC 20.14 item 10); no sentence of its own.
        const started = await api<{ queued: boolean; run_id: string }>(request, `/routines/${r}/run`, { method: "POST" });
        return data<RoutineResult>({ ok: true, intent, routineId: id, runId: started.run_id });
      }
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

// ---------- the account page (SPEC 20.5, 20.8, 20.14 item 6): keys, how I hear, time zone. Web only.

export const ACCOUNT_ROUTINE_INTENTS = new Set(["key-save", "key-cap", "key-check", "key-remove", "email-prefs", "time-zone"]);

export type AccountRoutineResult = { ok?: boolean; intent: string; message?: string; error?: string };

/**
 * The key is read from the form and passed to the API once; it is never put in an answer, an address or a log. With
 * "Email me if my Exa key stops working" ticked beside it, that choice is saved too.
 */
export async function accountRoutineAction(request: Request, form: FormData) {
  const intent = String(form.get("intent"));
  const done = (message: string) => data<AccountRoutineResult>({ ok: true, intent, message });
  try {
    switch (intent) {
      case "key-save": {
        const key = String(form.get("key") ?? "").trim();
        if (!key) return data<AccountRoutineResult>({ intent, error: "Paste your Exa key first." }, 400);
        const saved = await api<ServiceKey>(request, "/me/service-keys/exa", { method: "PUT", body: { key } });
        if (form.get("email_routine_key") === "on") await api(request, "/me/email-prefs", { method: "PATCH", body: { kinds: { routine_key: true } } });
        return done(saved.status === "ok" ? `Saved. Exa accepted the key ending in ${saved.last4}.` : `Saved the key ending in ${saved.last4}, but Exa says the account has no credit left.`);
      }
      case "key-cap": {
        const cap = Number(form.get("monthly_cap"));
        const saved = await api<ServiceKey>(request, "/me/service-keys/exa", { method: "PATCH", body: { monthly_cap: cap } });
        return done(`Saved. Up to ${saved.monthly_cap} searches a month.`);
      }
      case "key-check": {
        const saved = await api<ServiceKey>(request, "/me/service-keys/exa/check", { method: "POST" });
        return done(saved.status === "ok" ? "Exa accepted it: your stopped routines start again." : "Still no credit on that Exa account.");
      }
      case "key-remove":
        await api(request, "/me/service-keys/exa", { method: "DELETE" });
        return done("Removed. The routines that used it are stopped until someone resumes them with their own key.");
      case "email-prefs": {
        const kinds = { routine_key: form.get("routine_key") === "on", routine_unattended: form.get("routine_unattended") === "on" };
        await api<EmailPrefs>(request, "/me/email-prefs", { method: "PATCH", body: { kinds } });
        return done("Saved.");
      }
      case "time-zone": {
        const tz = String(form.get("time_zone") ?? "");
        await api(request, "/me", { method: "PATCH", body: { time_zone: tz } });
        return done("Saved. New routines use it; the ones you have keep their own.");
      }
      default:
        return data<AccountRoutineResult>({ intent, error: "Unknown action" }, 400);
    }
  } catch (err) {
    return data<AccountRoutineResult>({ intent, ...formError(err) }, 400);
  }
}

export async function myEmailPrefs(request: Request): Promise<EmailPrefs | null> {
  return apiOptional<EmailPrefs>(request, "/me/email-prefs").catch(() => null);
}
