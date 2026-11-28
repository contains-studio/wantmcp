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
  "routine-follow",
  "routine-unfollow",
  "recipient-add",
  "recipient-remove",
  "notice-seen",
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
      case "notice-seen":
        // ✕ on a notice in "For you" (SPEC 26.3): seen, gone from the list.
        await api(request, `/me/notices/${encodeURIComponent(String(form.get("notice_id") ?? ""))}/seen`, { method: "POST" });
        return done("Dismissed.");
      case "routine-follow":
        // The card's buttons: follow in the app, add email, or back to the app only. At once stays as it was, unless
        // email goes (it has no meaning without it).
        await api(request, `/routines/${r}/follow`, {
          method: "PUT",
          body: { email: form.get("email") === "on", ...(form.get("at_once") === "on" && form.get("email") === "on" ? { at_once: true } : {}) },
        });
        return done("You'll see these in the app, under For you.");
      case "recipient-add": {
        // SPEC 26.20 item 4: one ask to the address; nothing else is sent until they say yes.
        const email = String(form.get("email") ?? "").trim();
        if (!email) return data<RoutineResult>({ intent, routineId: id, error: "Type their email address." }, 400);
        await api(request, `/routines/${r}/recipients`, { method: "POST", body: { email, ...(form.get("show_list_name") === "on" ? { show_list_name: true } : {}) } });
        return done("Asked. Nothing more goes to them unless they say yes.");
      }
      case "recipient-remove":
        await api(request, `/routines/${r}/recipients/${encodeURIComponent(String(form.get("recipient_id") ?? ""))}`, { method: "DELETE" });
        return done("Removed. They get nothing more from this routine.");
      case "routine-unfollow":
        await api(request, `/routines/${r}/follow`, { method: "DELETE" });
        return done("You won't see these any more.");
      case "routine-create": {
        const kind = String(form.get("kind") ?? "exa_search");
        if (kind !== "exa_search") {
          // SPEC 26: the kind's own settings, the want for target_price, and the follow choice (required on the web).
          const listId = String(form.get("list_id") ?? "");
          const tz = String(form.get("time_zone") ?? "");
          const follow = String(form.get("follow") ?? "");
          // Restock tells nobody anything (it brings the want back), so it has no follow choice (26.10).
          if (kind !== "restock" && follow !== "app" && follow !== "email") return data<RoutineResult>({ intent, error: "Choose where you'll see it." }, 400);
          // "Email me at once" is target_price's alone, and only with email.
          const atOnce = kind === "target_price" && follow === "email" && form.get("at_once") === "on";
          const body: Record<string, unknown> = { kind, settings: kindSettings(kind, form), ...(kind !== "restock" ? { follow: { email: follow === "email", ...(kind === "target_price" ? { at_once: atOnce } : {}) } } : {}) };
          if (kind === "target_price" || kind === "restock") body.item_id = String(form.get(kind === "restock" ? "restock_item_id" : "item_id") ?? "");
          // agent_check runs on a schedule: the one the form shows (with JavaScript), else the server's default.
          if (kind === "agent_check" && form.get("ac_schedule")) body.schedule = { ...scheduleFromForm(form), ...(tz ? { time_zone: tz } : {}) };
          // SPEC 26.12: the weekly summary is the person's own, on no list (POST /me/routines), on its day at its hour.
          if (kind === "weekly_summary") {
            const day = String(form.get("ws_day") ?? "sun") as Weekday;
            const hour = Number(form.get("ws_hour"));
            body.schedule = { every: "week", days: [day], ...(Number.isInteger(hour) ? { time: `${String(hour).padStart(2, "0")}:00` } : {}) };
            const made = await api<Routine>(request, "/me/routines", { method: "POST", body });
            return done(`Made “${made.name}”. ${made.schedule_text}.`, made.id);
          }
          const made = await api<Routine>(request, `/lists/${encodeURIComponent(listId)}/routines`, { method: "POST", body });
          return done(`Made “${made.name}”. ${made.schedule_text}.`, made.id);
        }
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
        // A search: the card follows the run live from here (SPEC 20.14 item 10). Other kinds answer at once; their card's
        // status line, revalidated, says what it found.
        const started = await api<{ queued: boolean; run_id: string }>(request, `/routines/${r}/run`, { method: "POST" });
        return data<RoutineResult>({ ok: true, intent, routineId: id, runId: started.run_id, message: form.get("answers_at_once") ? "Checked." : undefined });
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

// ---------- the account page (SPEC 20.5, 20.8, 20.14 item 6): keys, notifications, time zone. Web only.

export const ACCOUNT_ROUTINE_INTENTS = new Set(["key-save", "key-cap", "key-check", "key-remove", "email-prefs", "email-stop-all", "time-zone"]);

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
        const on = (k: string) => form.get(k) === "on";
        const kinds = { routine_key: on("routine_key"), routine_unattended: on("routine_unattended"), routine_digest: on("routine_digest"), routine_at_once: on("routine_at_once") };
        const hour = Number(form.get("email_hour"));
        await api<EmailPrefs>(request, "/me/email-prefs", { method: "PATCH", body: { kinds, ...(form.has("email_hour") && Number.isInteger(hour) ? { email_hour: hour } : {}) } });
        // Each followed routine's own email choice: only the ones that changed are sent.
        for (const id of form.getAll("follow_id").map(String)) {
          const email = on(`follow_email:${id}`);
          const atOnce = email && on(`follow_at_once:${id}`);
          const was = String(form.get(`follow_was:${id}`) ?? "");
          if (was === `${email ? 1 : 0}${atOnce ? 1 : 0}`) continue;
          await api(request, `/routines/${encodeURIComponent(id)}/follow`, { method: "PUT", body: { email, ...(form.get(`follow_kind:${id}`) === "target_price" ? { at_once: atOnce } : {}) } });
        }
        return done("Saved.");
      }
      case "email-stop-all":
        await api<EmailPrefs>(request, "/me/email-prefs", { method: "PATCH", body: { stop_all: true } });
        return done("Stopped. No routine emails; your routines still show in the app.");
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

/** A kind's own settings from its form (SPEC 26.6-26.8); the server checks them and answers in its own words. */
export function kindSettings(kind: string, form: FormData): Record<string, unknown> {
  const nums = (k: string) => form.getAll(k).map(Number).filter((n) => Number.isFinite(n));
  if (kind === "target_price") {
    const currency = String(form.get("currency") ?? "").trim();
    return { target: String(form.get("target") ?? "").trim(), ...(currency ? { currency } : {}), unverified: form.get("unverified") === "on" };
  }
  if (kind === "countdown") {
    const occasion = String(form.get("occasion") ?? "");
    const date = String(form.get("date") ?? "");
    const date_end = String(form.get("date_end") ?? "");
    return {
      ...(occasion ? { occasion } : {}),
      ...(date ? { date } : {}),
      ...(date_end ? { date_end } : {}),
      milestones: nums("milestones"),
      order_by: { on: form.get("order_by") === "on", delivery_days: Number(form.get("delivery_days") ?? 5) || 5 },
    };
  }
  if (kind === "restock") {
    const unit = form.get("after_unit") === "month" ? "month" : "week";
    return { after: { unit, count: Number(form.get("after_count") ?? 4) || 4 } };
  }
  if (kind === "agent_check") {
    // Each check is on only with its tick; its days otherwise null (SPEC 26.9).
    const days = (on: string, n: string) => (form.get(on) === "on" ? Number(form.get(n)) : null);
    return { agent_id: String(form.get("agent_id") ?? ""), prices_older_than_days: days("check_prices", "prices_days"), stuck_after_days: days("check_stuck", "stuck_days") };
  }
  if (kind === "weekly_summary") {
    const chosen = form.getAll("ws_lists").map(String).filter(Boolean);
    return { lists: form.get("ws_which") === "some" ? chosen : "all" };
  }
  if (kind === "due_reminders") {
    const overdue = String(form.get("overdue") ?? "once");
    return { lead_days: nums("lead_days"), overdue: ["off", "once", "daily"].includes(overdue) ? overdue : "once" };
  }
  return {};
}
