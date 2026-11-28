/**
 * SPEC 20 (routines, step 1) in the mock API: routines, their runs and changes, the person's Exa key, email choices,
 * list views and routine-ask links. The words a routine shows (schedule_text, status_text) are the server's in real
 * life; these are stand-ins of the same kind so the web can be built and tested. The web never makes its own.
 *
 * Launch switch: a person sees routines when their email has "routines" in it (e2e-routines-…@example.com,
 * routines@example.com), and they are paused for everyone when it also has "paused". Everyone else gets today's site.
 */
import type {
  ActorRef,
  BlockReason,
  EmailPrefs,
  RoutineNameBy,
  Routine,
  RoutineFollow,
  RoutineNotice,
  RoutineKind,
  RoutineStart,
  RoutineChangeKind,
  RoutineChangeRecord,
  RecipientAskView,
  RoutineEndpoint,
  RoutineEmailStopView,
  RoutineRun,
  Schedule,
  ScheduleInput,
  ServiceKey,
  Timestamp,
  UserSelf,
  Weekday,
} from "../app/lib/types.ts";

export interface RoutineRow {
  id: string;
  /** null for a person's own routine (weekly_summary), which belongs to no list. */
  list_id: string | null;
  /** Its person, for a routine on no list. */
  user_id?: string | null;
  kind: RoutineKind;
  /** target_price and restock: the one want (SPEC 26.2 item 4). */
  item_id?: string | null;
  settings?: Record<string, unknown>;
  start?: RoutineStart;
  name: string;
  name_by: RoutineNameBy;
  /** null for date and event routines (SPEC 26.2 item 3). */
  schedule: Schedule | null;
  paused: { by: ActorRef; at: Timestamp } | null;
  blocked: { reason: BlockReason; at: Timestamp } | null;
  key_user_id: string | null;
  next_run_at: Timestamp | null;
  created: { by: ActorRef; at: Timestamp };
  changed: { by: ActorRef; at: Timestamp };
  run_now_day: string;
  run_now_count: number;
  deleted_at: Timestamp | null;
  /** Item ids this routine stopped looking for (20.6). */
  stopped_items: string[];
}

export interface RunRow extends RoutineRun {
  routine_id: string;
}

export interface ChangeRow {
  id: string;
  routine_id: string;
  at: Timestamp;
  by: ActorRef;
  by_user_id: string;
  change: RoutineChangeKind;
  before: RoutineRow | null;
  person_asked: string | null;
}

export interface KeyRow {
  user_id: string;
  last4: string;
  status: ServiceKey["status"];
  status_at: Timestamp;
  monthly_cap: number;
  used: number;
}

export interface RoutineStore {
  routines: RoutineRow[];
  runs: RunRow[];
  changes: ChangeRow[];
  keys: KeyRow[];
  emailPrefs: Map<string, EmailPrefs["kinds"] & { email_hour?: number }>;
  views: Map<string, Timestamp>;
  asks: Map<string, { routine_id: string; used: "keep" | "pause" | null }>;
  /** SPEC 26.4: routine id -> user id -> that person's follow. */
  follows: Map<string, Map<string, RoutineFollow>>;
  /** SPEC 26.3: what routines tell each person (user_id on each). */
  notices: Array<RoutineNotice & { user_id: string }>;
  /** SPEC 26.20 item 4: other addresses a follower asked to get a routine's email. */
  recipients: RecipientRow[];
  /** Addresses that said No or Stop these: nobody may ask them for 90 days (lower-cased address, in the mock). */
  doNotAsk: Set<string>;
  /** SPEC 26.4: "Stop emailing me about this routine" tokens -> the routine and the person. */
  emailStops: Map<string, { routine_id: string; user_id: string }>;
  /** SPEC 26.21.2: people's saved URLs. */
  endpoints: EndpointRow[];
}

export interface EndpointRow {
  id: string;
  user_id: string;
  name: string;
  url: string;
  state: "unverified" | "ok" | "failing";
  verified_at: Timestamp | null;
  last_ok_at: Timestamp | null;
  last_fail_at: Timestamp | null;
  last_problem: string | null;
  deleted_at: Timestamp | null;
}

export interface RecipientRow {
  id: string;
  routine_id: string;
  added_by: string;
  /** Kept only while the ask or the yes is live. */
  email: string | null;
  /** What the do-not-ask list would hold (the address, lower-cased, in the mock). */
  key: string;
  show_list: boolean;
  state: "asked" | "yes" | "no" | "stopped" | "removed";
  since: Timestamp;
  asked_on: string;
  token: string;
}

export const emptyRoutineStore = (): RoutineStore => ({
  routines: [],
  runs: [],
  changes: [],
  keys: [],
  emailPrefs: new Map(),
  views: new Map(),
  asks: new Map(),
  follows: new Map(),
  notices: [],
  recipients: [],
  doNotAsk: new Set(),
  emailStops: new Map(),
  endpoints: [],
});

// ---------- the launch switch (mock rule)

/**
 * SPEC 20.14's `routine.visible`, as the mock sees it for the request being answered: off (only accounts whose email
 * says "routines" see them, as the preview list does), or on for everyone when a test sends `x-wantmcp-routines:
 * launched` (the web forwards it to the mock only).
 */
let launchedForAll = false;
export function setMockRoutinesLaunched(on: boolean) {
  launchedForAll = on;
}
export const mockRoutinesLaunched = () => launchedForAll;

export function routinesFor(email: string): UserSelf["routines"] | undefined {
  if (!launchedForAll && !email.includes("routines")) return undefined;
  const running = !email.includes("paused");
  // SPEC 26.14: kinds_visible says which kinds are launched (server c6278c7: these four for preview accounts).
  const all = ["exa_search", "due_reminders", "countdown", "target_price", "restock", "weekly_summary", "agent_check", "list_changes"] as const;
  const built = new Set<string>(["exa_search", "target_price", "countdown", "due_reminders", "restock", "weekly_summary", "agent_check", "list_changes"]);
  const kinds = Object.fromEntries(all.map((k) => [k, running])) as Record<(typeof all)[number], boolean>;
  const kinds_visible = Object.fromEntries(all.map((k) => [k, built.has(k)])) as Record<(typeof all)[number], boolean>;
  // A kind a later server launches before this web build knows it: the chooser must not offer it.
  Object.assign(kinds_visible, { future_kind: true });
  return { visible: true, running, kinds, kinds_visible, about: { exa_search: { cost_per_search_usd: { shopping: 0.017, tasks: 0.012, research: 0.012 }, key_check_usd: 0.007 }, target_price: { at_once_per_week: 5 } } };
}

// ---------- stand-in wording (the server's in real life)

const DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_NAME: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const ORD = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const hour = (t: string) => `${Number(t.slice(0, 2))}:00`;
const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export function scheduleText(s: Schedule): string {
  const at = ` at ${hour(s.time)}`;
  if (s.every === "day") return (s.interval === 1 ? "Every day" : `Every ${s.interval} days`) + at;
  if (s.every === "week") {
    const days = and((s.days ?? []).map((d) => DAY_NAME[d]));
    return (s.interval === 1 ? `Every ${days}` : `Every ${s.interval} weeks on ${days}`) + at;
  }
  const day = s.day_of_month === "last" ? "the last day" : `the ${ORD(Number(s.day_of_month ?? 1))}`;
  return `On ${day} of ${s.interval === 1 ? "every month" : `every ${s.interval} months`}${at}`;
}

const short = (iso: string) => {
  const d = new Date(iso);
  const wd = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const md = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${wd} ${md} at ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
const dayOnly = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function statusText(r: RoutineRow, last: RunRow | null, viewerIsKeyHolder: boolean, keyHolder: string | null): string {
  if (r.paused) return `Paused by ${r.paused.by.kind === "user" ? `@${r.paused.by.handle}` : r.paused.by.kind === "agent" ? r.paused.by.name : "someone"} on ${dayOnly(r.paused.at)}`;
  if (r.blocked) {
    const on = dayOnly(r.blocked.at);
    const whose = viewerIsKeyHolder ? "your" : `@${keyHolder}'s`;
    switch (r.blocked.reason) {
      case "key_missing":
        return `Stopped: ${whose} Exa key was removed on ${on}`;
      case "key_refused":
        return `Stopped: ${whose} Exa key stopped working on ${on}`;
      case "out_of_credit":
        return `Stopped: ${whose} Exa account ran out of credit on ${on}`;
      case "key_holder_left":
        return `Stopped: @${keyHolder} left the list on ${on}`;
      case "all_rejected":
        return "Stopped: its last 2 rounds were all rejected";
      case "unattended":
        return "Stopped: nobody looked at its last 2 rounds";
      case "by_admin":
        return `Paused by The Want MCP on ${on}`;
    }
  }
  const next = r.next_run_at ? `Next: ${short(r.next_run_at)}` : "";
  if (!last?.finished_at) return next || "Not run yet";
  return `Last ran ${short(last.finished_at)}: searched ${last.wants_searched} wants, ${last.suggestions_posted} suggestion${last.suggestions_posted === 1 ? "" : "s"} · ${next}`;
}

// ---------- schedules (mock: UTC arithmetic, good enough for a stand-in)

export function normaliseSchedule(input: ScheduleInput | undefined, tz: string, now = new Date()): Schedule | string {
  const every = input?.every ?? "week";
  if (!["day", "week", "month"].includes(every)) return "every must be day, week or month";
  const interval = input?.interval ?? 1;
  if (!Number.isInteger(interval) || interval < 1 || interval > 4) return "interval must be 1 to 4";
  const time = input?.time ?? "09:00";
  if (!/^([01]\d|2[0-3]):00$/.test(time)) return "time must be a whole hour, 00:00 to 23:00";
  const out: Schedule = { every, interval, time, time_zone: input?.time_zone || tz, anchor: now.toISOString().slice(0, 10) };
  // As strict as the server's buildSchedule (lib/schedule.ts): days only for weeks, and not an empty list;
  // day_of_month only for months. A mock more forgiving than the server is how a refused schedule got through.
  if (every !== "week" && input?.days !== undefined) return "schedule.days is only for every week";
  if (every !== "month" && input?.day_of_month !== undefined) return "schedule.day_of_month is only for every month";
  if (every === "week") {
    if (input?.days !== undefined && input.days.length === 0) return "schedule.days must be one or more of mon, tue, wed, thu, fri, sat, sun";
    const days = input?.days?.length ? input.days : [DAYS[now.getUTCDay()]];
    if (days.some((d) => !DAYS.includes(d))) return "schedule.days must be one or more of mon, tue, wed, thu, fri, sat, sun";
    out.days = DAYS.filter((d) => days.includes(d)).sort((a, b) => ((DAYS.indexOf(a) + 6) % 7) - ((DAYS.indexOf(b) + 6) % 7));
  }
  if (every === "month") {
    const d = input?.day_of_month ?? now.getUTCDate();
    if (d !== "last" && !(Number.isInteger(d) && (d as number) >= 1 && (d as number) <= 28)) return "day_of_month must be 1 to 28, or last";
    out.day_of_month = d;
  }
  return out;
}

/** Runs in any 28 days, to tell a more frequent schedule (20.2). */
export function runsPer28(s: Schedule): number {
  if (s.every === "day") return 28 / s.interval;
  if (s.every === "week") return ((s.days?.length ?? 1) * 4) / s.interval;
  return 1 / s.interval;
}

export function nextRun(s: Schedule, after = new Date()): string {
  const h = Number(s.time.slice(0, 2));
  const d = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate(), h));
  for (let i = 0; i < 400; i++) {
    const c = new Date(d.getTime() + i * 86400_000);
    if (c <= after) continue;
    if (s.every === "day") return c.toISOString().replace(/\.\d{3}Z$/, "Z");
    if (s.every === "week" && (s.days ?? []).includes(DAYS[c.getUTCDay()])) return c.toISOString().replace(/\.\d{3}Z$/, "Z");
    if (s.every === "month") {
      const last = new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 0)).getUTCDate();
      if (s.day_of_month === "last" ? c.getUTCDate() === last : c.getUTCDate() === s.day_of_month) return c.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
  }
  return after.toISOString();
}

// ---------- the routes

export interface RoutineCtx {
  rs: () => RoutineStore;
  route: (method: string, path: string, handler: (a: { caller: any; params: string[]; body: any; url: URL }) => unknown) => void;
  helpers: {
    nowIso: () => string;
    newId: (p: string) => string;
    randomToken: (n?: number) => string;
    requireSession: (c: any) => { kind: "user"; user: any };
    requireWriter: (c: any, listId: string) => any;
    canWrite: (c: any, listId: string) => boolean;
    /** Every agent (id, name, kind, owner_id, list_ids, last_used_at). */
    agents: () => any[];
    actorRef: (c: any) => ActorRef;
    getList: (id: string) => any;
    userById: (id: string) => any;
    lists: () => any[];
    items: () => any[];
    entries: () => any[];
    unclaimed: (listId: string) => boolean;
    emit: (type: any, listId: string, actor: ActorRef, url: string, extra?: any) => void;
    webUrl: string;
    notFound: (what?: string) => Error;
    unauthorized: () => Error;
    forbidden: (what?: string) => Error;
    invalid: (what: string) => Error;
    conflict: (what: string, details?: unknown) => Error;
    created: (v: unknown) => unknown;
    noContent: unknown;
  };
}

const RUN_NOW_PER_DAY = 3;
/** SPEC 26.21.4: the changes a list_changes routine can send, and our words for them (the server's). */
const LIST_CHANGE_TYPES = ["item.created", "entry.listed", "entry.suggested", "price.posted", "item.status_changed", "item.purchased", "question.asked", "question.answered", "comment.created", "list.claimed"];
const DEFAULT_CHANGE_TYPES = ["item.created", "entry.listed", "price.posted", "item.status_changed", "item.purchased"];
const TYPE_WORDS: Record<string, string> = {
  "item.created": "new wants",
  "entry.listed": "new options",
  "entry.suggested": "suggestions from outside",
  "price.posted": "prices",
  "item.status_changed": "status changes",
  "item.purchased": "bought or done",
  "question.asked": "questions asked",
  "question.answered": "questions answered",
  "comment.created": "comments",
  "list.claimed": "the list kept",
};
function sendsText(s: { types?: string[]; content?: string }, handle: string): string {
  const w = (s.types ?? []).map((t) => TYPE_WORDS[t]);
  const types = w.length <= 1 ? (w[0] ?? "nothing") : `${w.slice(0, -1).join(", ")} and ${w[w.length - 1]}`;
  return `Sends ${types} to @${handle}'s URL (${s.content === "full" ? "in full" : "only which things changed"})`;
}
/** SPEC 26.20 item 4: the kinds whose email another address may get. */
const RECIPIENT_KINDS: RoutineKind[] = ["due_reminders", "countdown", "target_price", "weekly_summary"];
const RECIPIENT_WHAT: Partial<Record<RoutineKind, string>> = {
  due_reminders: "reminders before things on it are due",
  countdown: "a countdown to a day, with the last day to order things",
  target_price: "a message when a price someone is waiting for is reached",
  weekly_summary: "a weekly summary of what changed",
};
/** SPEC 26.7: the occasions table (the admin's), as the server would answer GET /routine-occasions. */
const OCCASIONS = [
  { slug: "chanukah", year: 2026, date: "2026-12-04", date_end: "2026-12-12", label: "Chanukah" },
  { slug: "christmas", year: 2026, date: "2026-12-25", date_end: null, label: "Christmas" },
  { slug: "new-year", year: 2027, date: "2027-01-01", date_end: null, label: "New Year" },
];
const NO_KEY = "This would run on your own Exa key, and you haven't saved one. Add it at https://wantmcp.com/app/account#keys.";

export function registerRoutineRoutes({ rs, route, helpers: h }: RoutineCtx) {
  const userOf = (c: any) => (c ? h.userById(c.user.id) : null);
  /** Routes answer not_found until routines are visible for this person (20.14). */
  const visibleFor = (c: any) => {
    if (!c) throw h.notFound();
    if (!routinesFor(userOf(c).email)?.visible) throw h.notFound();
    return c;
  };
  const keyOf = (userId: string | null) => (userId ? rs().keys.find((k) => k.user_id === userId) : undefined);
  const lastRun = (id: string) => rs().runs.filter((r) => r.routine_id === id).sort((a, b) => b.queued_at.localeCompare(a.queued_at))[0] ?? null;
  const today = () => new Date().toISOString().slice(0, 10);

  function out(r: RoutineRow, c: any): Routine {
    const live = liveRun(r.id);
    const holder = r.key_user_id ? h.userById(r.key_user_id) : null;
    const mine = !!holder && c && holder.id === c.user.id;
    const left = r.run_now_day === today() ? Math.max(0, RUN_NOW_PER_DAY - r.run_now_count) : RUN_NOW_PER_DAY;
    const latest = rs().changes.filter((x) => x.routine_id === r.id).sort((a, b) => b.at.localeCompare(a.at))[0];
    const follow = c ? (rs().follows.get(r.id)?.get(c.user.id) ?? null) : null;
    const routine: Routine = {
      id: r.id,
      list_id: r.list_id,
      item_id: r.item_id ?? null,
      kind: r.kind,
      settings: r.settings ?? {},
      start: r.start ?? "schedule",
      name: r.name,
      name_by: r.name_by,
      schedule: r.schedule,
      schedule_text: r.schedule ? scheduleText(r.schedule) : startText(r),
      followers: rs().follows.get(r.id)?.size ?? 0,
      my_follow: follow ? { ...follow } : null,
      paused: r.paused,
      blocked: r.blocked,
      next_run_at: r.paused || r.blocked ? null : r.next_run_at,
      last_run: lastRun(r.id),
      live_run: live ? strip(live) : null,
      status_text: r.kind === "exa_search" ? statusText(r, lastRun(r.id), mine, holder?.handle ?? null) : kindStatus(r, lastRun(r.id)),
      key_holder: holder && r.kind !== "list_changes" ? { handle: holder.handle } : null,
      created: r.created,
      changed: r.changed,
      uses_my_key: mine && r.kind !== "list_changes",
      run_now_left_today: left,
    };
    // agent_check (26.20 item 5): what we can observe about reaching its agent. Mock rule: an account key (an agent that
    // runs on its own) listens; any other sees the note the next time it looks.
    if (r.kind === "agent_check") {
      const a = h.agents().find((x: any) => x.id === (r.settings as any)?.agent_id);
      if (a) {
        const listening = a.kind === "account";
        const hours = a.last_used_at ? Math.max(1, Math.round((Date.now() - Date.parse(a.last_used_at)) / 3_600_000)) : null;
        const seen = hours === null ? "it hasn't been in touch yet" : `last seen ${hours} hour${hours === 1 ? "" : "s"} ago`;
        const text = listening
          ? `${a.name} is listening: it is told the moment this is due.`
          : `${a.name} sees this the next time it looks (${seen}). To make it look on a schedule, set up a scheduled task in ${a.name} with the instruction on the Connect page.`;
        routine.agent_reach = { agent: { id: a.id, name: a.name }, listening, last_seen_at: a.last_used_at ?? null, text };
      }
    }
    // SPEC 26.21.4: whose URL it calls, the same for every reader; the endpoint only to its holder.
    if (r.kind === "list_changes") {
      const st = (r.settings ?? {}) as { endpoint_id?: string; types?: string[]; content?: "ids" | "full" };
      routine.calls_url = { holder: { handle: holder?.handle ?? "deleted-user" }, content: st.content ?? "ids", types: (st.types ?? []) as never };
      if (!mine) routine.settings = { types: st.types, content: st.content };
    }
    // SPEC 26.20 item 4: the addresses this reader added, on the web only.
    if (c?.kind === "user" && RECIPIENT_KINDS.includes(r.kind)) {
      routine.my_recipients = rs()
        .recipients.filter((x) => x.routine_id === r.id && x.added_by === c.user.id && x.state !== "removed")
        .map((x) => ({ id: x.id, email: x.email, state: x.state, since: x.since }));
    }
    // The person's own agent's words, to that person on the web only.
    if (c?.kind === "user" && latest?.person_asked && latest.by_user_id === c.user.id) routine.reported_words = latest.person_asked;
    return routine;
  }
  /** Stand-ins for the server's sentences for kinds that don't run on a clock (26.6-26.8). */
  function startText(r: RoutineRow): string {
    const st = (r.settings ?? {}) as any;
    if (r.kind === "target_price") {
      const item = h.items().find((i: any) => i.id === r.item_id);
      return `Whenever a price is posted on “${item?.text ?? "this want"}”`;
    }
    if (r.kind === "countdown") return `Counting down to ${st.occasion_label ?? new Date(`${st.date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}`;
    if (r.kind === "due_reminders") return "Every day at about 7:00, for wants with a due date";
    if (r.kind === "list_changes") return sendsText(st, r.key_user_id ? h.userById(r.key_user_id).handle : "someone");
    if (r.kind === "restock") {
      const item = h.items().find((i: any) => i.id === r.item_id);
      const a = st.after ?? { unit: "week", count: 4 };
      return `When “${item?.text ?? "this want"}” is bought, it comes back after ${a.count} ${a.unit}${a.count === 1 ? "" : "s"}`;
    }
    return "On its own schedule";
  }
  function kindStatus(r: RoutineRow, last: RunRow | null): string {
    if (r.paused) return `Paused by ${r.paused.by.kind === "user" ? `@${r.paused.by.handle}` : "someone"}`;
    if (r.blocked && r.kind !== "list_changes") return r.blocked.reason === "finished" ? "Finished: its job is done" : "Stopped";
    const st = (r.settings ?? {}) as any;
    const told = last?.finished_at ? `Last checked ${new Date(last.finished_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}: ${last.note ?? "nothing to tell"}` : "Not checked yet";
    if (r.kind === "target_price") return `${told} · Watching for ${st.currency ?? ""} ${st.target ?? ""} or less`.replace("  ", " ");
    if (r.kind === "countdown") return `${told} · Next message: ${(st.milestones ?? [14])[0]} days before`;
    if (r.kind === "due_reminders") return `${told} · Next check: tomorrow at about 7:00`;
    if (r.kind === "restock") return "Not bought yet";
    if (r.kind === "list_changes") {
      if (r.blocked?.reason === "url_failing") return `Stopped: its URL stopped answering on ${new Date(r.blocked.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
      if (r.blocked?.reason === "url_removed") return "Stopped: its URL was removed";
      return "No calls yet: it calls when something changes";
    }
    if (r.kind === "agent_check") {
      const a = h.agents().find((x: any) => x.id === st.agent_id);
      return last?.finished_at ? `Waiting for ${a?.name ?? "your agent"} to look (asked ${new Date(last.finished_at).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })})` : "Nothing asked yet";
    }
    if (r.kind === "weekly_summary") return last?.finished_at ? `Last summary: ${last.note ?? "a quiet week"}` : "No summary yet";
    return told;
  }
  const strip = ({ routine_id: _r, ...run }: RunRow): RoutineRun => run;
  const live = (id: string) => {
    const r = rs().routines.find((x) => x.id === id && !x.deleted_at);
    if (!r) throw h.notFound("Routine not found");
    return r;
  };
  const writerOf = (c: any, r: RoutineRow) => {
    visibleFor(c);
    // A person's own routine (no list): theirs alone.
    if (!r.list_id) {
      if (c.user?.id !== r.user_id) throw h.notFound("Routine not found");
      return c;
    }
    h.requireWriter(c, r.list_id);
    return c;
  };
  const askedBy = (c: any, body: any): string | null => {
    if (c.kind !== "agent") return null;
    const words = typeof body.person_asked === "string" ? body.person_asked.trim() : "";
    if (!words || words.length > 200) throw h.invalid("person_asked: say what your person asked, in their words (1 to 200 characters)");
    return words;
  };
  /** 20.2: a change that makes it run, or run more, moves it to this person's key, which must be working. */
  const takeKey = (c: any, r: RoutineRow) => {
    const k = keyOf(c.user.id);
    if (!k || k.status !== "ok") throw h.invalid(NO_KEY);
    r.key_user_id = c.user.id;
  };
  const record = (c: any, r: RoutineRow, change: RoutineChangeKind, before: RoutineRow | null, personAsked: string | null, keyChanged: boolean) => {
    const at = h.nowIso();
    const by = h.actorRef(c);
    r.changed = { by, at };
    rs().changes.push({ id: h.newId("rch"), routine_id: r.id, at, by, by_user_id: c.user.id, change, before, person_asked: personAsked });
    const holder = r.key_user_id ? h.userById(r.key_user_id) : null;
    // A routine on no list has no list to tell.
    if (r.list_id) h.emit("routine.changed", r.list_id, by, `${h.webUrl}/app/lists/${r.list_id}/settings#routines`, {
      routine: { id: r.id, list_id: r.list_id, kind: r.kind, name: r.name, name_by: r.name_by, schedule: r.schedule, paused: !!r.paused, blocked_reason: r.blocked?.reason ?? null, key_holder_handle: holder?.handle ?? null },
      change,
      key_holder_changed: keyChanged,
    });
  };
  const snapshot = (r: RoutineRow): RoutineRow => structuredClone(r);

  /**
   * A mock run that takes time, like a real one (SPEC 20.14 item 10): queued for QUEUED_MS, then one want every WANT_MS,
   * then done. Its state is worked out from the clock whenever it is read (advance), and its suggestions are posted
   * once, when it ends. Each want with nothing undecided from this routine is searched.
   */
  function runOnce(r: RoutineRow, c: any | null, trigger: "schedule" | "run_now"): RunRow {
    const at = h.nowIso();
    const items = h.items().filter((i: any) => i.list_id === r.list_id && !i.pending_review && (i.status ?? "open") === "open" && !i.purchase && !r.stopped_items.includes(i.id));
    const wants = items
      .filter((it: any) => !h.entries().some((e: any) => e.item_id === it.id && e.status === "suggested" && e.author?.routine?.id === r.id))
      .slice(0, 25)
      .map((it: any) => ({ item_id: it.id, text: it.text }));
    const run: RunRow = {
      id: h.newId("run"),
      routine_id: r.id,
      trigger,
      run_by: c ? h.actorRef(c) : null,
      state: "queued",
      attempts: 1,
      queued_at: at,
      started_at: null,
      finished_at: null,
      wants_searched: 0,
      suggestions_posted: 0,
      searches_used: 0,
      note: null,
      wants_total: null,
      current: null,
      counts: {},
    };
    plans.set(run.id, { wants, t0: Date.now() });
    rs().runs.push(run);
    return run;
  }
  const plans = new Map<string, { wants: Array<{ item_id: string; text: string }>; t0: number }>();
  const QUEUED_MS = 800;
  const WANT_MS = 900;

  /** Check now (SPEC 26.2 item 7): works out what the routine would say now; the mock has nothing to tell. */
  function checkOnce(r: RoutineRow, c: any): RunRow {
    const at = h.nowIso();
    const run: RunRow = {
      id: h.newId("run"), routine_id: r.id, trigger: "run_now", run_by: h.actorRef(c), state: "ok", attempts: 1,
      queued_at: at, started_at: at, finished_at: at, wants_searched: 0, suggestions_posted: 0, searches_used: 0,
      note: r.kind === "target_price" ? "nothing at your price yet" : r.kind === "agent_check" ? "1 price to re-check" : r.kind === "weekly_summary" ? "a quiet week" : "nothing to tell today", wants_total: null, current: null, counts: { notices: 0 },
    };
    rs().runs.push(run);
    return run;
  }

  /** Bring a mock run up to now; posts its suggestions once, when it ends. */
  function advance(run: RunRow): RunRow {
    const plan = plans.get(run.id);
    if (!plan || run.finished_at) return run;
    const t = Date.now() - plan.t0;
    if (t < QUEUED_MS) return run;
    const total = plan.wants.length;
    run.started_at ??= new Date(plan.t0 + QUEUED_MS).toISOString().replace(/\.\d{3}Z$/, "Z");
    run.wants_total = total;
    const done = Math.min(total, Math.floor((t - QUEUED_MS) / WANT_MS));
    run.wants_searched = done;
    run.searches_used = done;
    if (done < total) {
      run.state = "running";
      run.current = plan.wants[done];
      return run;
    }
    // Finished: post one stand-in result per want searched.
    const r = rs().routines.find((x) => x.id === run.routine_id);
    const holder = r?.key_user_id ? h.userById(r.key_user_id) : null;
    const key = keyOf(r?.key_user_id ?? null);
    const list = r?.list_id ? h.getList(r.list_id) : null;
    const shopping = (list?.format ?? "shopping") === "shopping";
    const at = h.nowIso();
    let posted = 0;
    for (const [wi, w] of plan.wants.entries()) {
      if (!r || posted >= 10) break;
      if (key) key.used++;
      const n = h.entries().filter((e: any) => e.author?.routine?.id === r.id).length + 1;
      const author = { kind: "outside", name: r.name, routine: { id: r.id, kind: r.kind, key_holder: holder?.handle ?? "", name_by: r.name_by } };
      // Shopping: a guide for the first want (product pages first on the real server, at most one guide per want).
      if (shopping && wi === 0) {
        h.entries().push({
          id: h.newId("ent"), item_id: w.item_id, list_id: r.list_id, status: "suggested", author,
          title: `How to choose: ${w.text}`, description: "", product_url: null, links: [`https://www.seriouseats.com/guide-${n}`], kind: "guide",
          buy_url: null, image_url: null, retailer: "", coupon_code: null, deal_starts_at: null, deal_ends_at: null,
          created_at: at, updated_at: at, promoted_by: null, promoted_at: null,
        });
        posted++;
      }
      h.entries().push({
        id: h.newId("ent"),
        item_id: w.item_id,
        list_id: r.list_id,
        status: "suggested",
        author,
        title: `${w.text}: a search result ${n}`,
        description: shopping ? "From a search result, not checked on the store's page." : `A page about ${w.text}.`,
        product_url: shopping ? `https://www.amazon.com/dp/MOCK${n}` : null,
        links: shopping ? undefined : [`https://example.org/read/result-${n}`],
        kind: shopping ? undefined : "update",
        buy_url: null,
        // Some with a picture, most without, as on a real list.
        image_url: shopping && n % 2 === 1 ? "/mock-images/grinder.svg" : null,
        retailer: shopping ? "amazon.com" : "",
        coupon_code: null,
        deal_starts_at: null,
        deal_ends_at: null,
        created_at: at,
        updated_at: at,
        promoted_by: null,
        promoted_at: null,
      });
      posted++;
    }
    run.state = total ? "ok" : "skipped";
    run.current = null;
    run.suggestions_posted = posted;
    run.finished_at = at;
    run.note = total ? null : "Nothing to search: every want has suggestions waiting for you to decide.";
    plans.delete(run.id);
    return run;
  }
  /** The run that is queued or running now, brought up to now. */
  const liveRun = (id: string) => {
    for (const run of rs().runs.filter((x) => x.routine_id === id && !x.finished_at)) advance(run);
    return rs().runs.find((x) => x.routine_id === id && !x.finished_at) ?? null;
  };

  /** SPEC 26.6-26.8: target_price, countdown, due_reminders. No key; one per want or per list. */
  const NAMES: Partial<Record<RoutineKind, string>> = { due_reminders: "Remind me before things are due" };
  // restock is launched too (server 365c811).
  function makeKind(c: any, listId: string, kind: RoutineKind, body: any): RoutineRow {
    const st = { ...(body.settings ?? {}) } as Record<string, unknown>;
    let item_id: string | null = null;
    let name = NAMES[kind] ?? kind;
    let start: RoutineStart = "date";
    let schedule: Schedule | null = null;
    if (kind === "restock") {
      item_id = String(body.item_id ?? "");
      const item = h.items().find((i: any) => i.id === item_id && i.list_id === listId);
      if (!item) throw h.invalid("item_id: pick a want on this list");
      const dup = rs().routines.find((r) => r.kind === kind && r.item_id === item_id && !r.deleted_at);
      if (dup) throw h.conflict(`This want already has one: "${dup.name}"`, { routine: { id: dup.id, name: dup.name } });
      const after = (st.after ?? {}) as { unit?: string; count?: number };
      const unit = after.unit === "month" ? "month" : "week";
      const n = Number(after.count ?? 4);
      if (!Number.isInteger(n) || n < 1 || n > (unit === "week" ? 52 : 12)) throw h.invalid("after: 1 to 52 weeks, or 1 to 12 months");
      st.after = { unit, count: n };
      name = `Bring back “${item.text}”`;
      start = "event";
    } else if (kind === "target_price") {
      item_id = String(body.item_id ?? "");
      const item = h.items().find((i: any) => i.id === item_id && i.list_id === listId);
      if (!item) throw h.invalid("item_id: pick a want on this list");
      if (!/^\d+(\.\d{1,2})?$/.test(String(st.target ?? ""))) throw h.invalid("target: an amount like 120 or 119.99");
      const dup = rs().routines.find((r) => r.kind === kind && r.item_id === item_id && !r.deleted_at);
      if (dup) throw h.conflict(`This want already has one: "${dup.name}"`, { routine: { id: dup.id, name: dup.name } });
      st.unverified = st.unverified !== false;
      name = `Tell me when “${item.text}” is at my price`;
      start = "event";
    } else if (kind === "agent_check") {
      // SPEC 26.9: one of the person's own agents that writes this list; one routine per agent per list.
      const a = h.agents().find((x: any) => x.id === st.agent_id && x.owner_id === c.user.id && x.list_ids.includes(listId));
      if (!a) throw h.invalid("settings.agent_id must be one of your own agents that writes this list");
      const dup = rs().routines.find((r) => r.kind === kind && r.list_id === listId && !r.deleted_at && (r.settings as any)?.agent_id === a.id);
      if (dup) throw h.conflict(`This list already has a routine asking this agent to check: "${dup.name}". Change that one instead.`, { routine: { id: dup.id, name: dup.name } });
      const days = (k: string, max: number, dflt: number) => {
        if (st[k] === null) return null;
        const n = Number(st[k] ?? dflt);
        if (!Number.isInteger(n) || n < 1 || n > max) throw h.invalid(`${k}: 1 to ${max} days, or null`);
        return n;
      };
      st.prices_older_than_days = days("prices_older_than_days", 30, 3);
      st.stuck_after_days = days("stuck_after_days", 60, 7);
      if (st.prices_older_than_days === null && st.stuck_after_days === null) throw h.invalid("Choose what to check: old prices, stuck wants, or both");
      const user = h.userById(c.user.id);
      if (!user.time_zone && typeof body.schedule?.time_zone === "string") user.time_zone = body.schedule.time_zone;
      const sched = normaliseSchedule(body.schedule ?? { every: "week", days: ["fri"], time: "09:00" }, user.time_zone ?? "UTC");
      if (typeof sched === "string") throw h.invalid(sched);
      schedule = sched;
      start = "schedule";
      // As the server names it: "Ask Claude to check" and its schedule's words without the time.
      const words = scheduleText(sched).replace(/ at \d.*$/, "");
      name = `Ask ${a.name} to check ${words[0].toLowerCase()}${words.slice(1)}`.slice(0, 60);
    } else {
      const dup = rs().routines.find((r) => r.kind === kind && r.list_id === listId && !r.deleted_at);
      if (dup) throw h.conflict(`This list already has one: "${dup.name}"`, { routine: { id: dup.id, name: dup.name } });
    }
    if (kind === "countdown") {
      const occ = OCCASIONS.find((o) => o.slug === st.occasion);
      if (!st.date && occ) st.date = occ.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(st.date ?? ""))) throw h.invalid("date: the day to count down to");
      if (occ) st.occasion_label = occ.label;
      name = `Countdown to ${occ?.label ?? new Date(`${st.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
    }
    const at = h.nowIso();
    const by = h.actorRef(c);
    const r: RoutineRow = {
      id: h.newId("rtn"),
      list_id: listId,
      kind,
      item_id,
      settings: st,
      start,
      name,
      name_by: "server",
      schedule,
      paused: null,
      blocked: null,
      key_user_id: null,
      next_run_at: schedule ? nextRun(schedule) : null,
      created: { by, at },
      changed: { by, at },
      run_now_day: "",
      run_now_count: 0,
      deleted_at: null,
      stopped_items: [],
    };
    rs().routines.push(r);
    if (c.kind === "user" && kind !== "restock") rs().follows.set(r.id, new Map([[c.user.id, { routine_id: r.id, email: !!body.follow?.email, at_once: !!body.follow?.at_once }]]));
    record(c, r, "created", null, askedBy(c, body), false);
    return r;
  }

  /** SPEC 26.21.4: a person who writes the list, on the web, with their own verified URL. */
  function makeListChanges(c: any, listId: string, body: any): RoutineRow {
    if (c.kind !== "user") throw h.forbidden("Only your person, on the web, can send a list to a URL.");
    const st = (body.settings ?? {}) as Record<string, unknown>;
    const ep = rs().endpoints.find((e) => e.id === st.endpoint_id && e.user_id === c.user.id && !e.deleted_at);
    if (!ep) throw h.invalid("settings.endpoint_id is required: one of your saved URLs");
    if (ep.state !== "ok") throw h.conflict("This URL hasn't answered the handshake yet: verify it first.");
    const types = st.types === undefined ? DEFAULT_CHANGE_TYPES : st.types;
    if (!Array.isArray(types) || types.length === 0 || types.some((t) => !LIST_CHANGE_TYPES.includes(String(t)))) throw h.invalid(`settings.types must be one or more of ${LIST_CHANGE_TYPES.join(", ")}`);
    if ((st.content ?? "ids") !== "ids") throw h.invalid('settings.content "full" is not offered yet: only which things changed ("ids")');
    const onList = rs().routines.filter((r) => r.list_id === listId && r.kind === "list_changes" && !r.deleted_at).length;
    if (onList >= 3) throw h.invalid(`This list already sends its changes to ${onList} URLs, the most it may (routine.url.list_changes_per_list)`);
    const at = h.nowIso();
    const by = h.actorRef(c);
    const r: RoutineRow = {
      id: h.newId("rtn"), list_id: listId, kind: "list_changes", item_id: null,
      settings: { endpoint_id: ep.id, types: LIST_CHANGE_TYPES.filter((t) => (types as string[]).includes(t)), content: "ids" }, start: "event",
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "Send this list's changes to a URL", name_by: typeof body.name === "string" && body.name.trim() ? "person" : "server",
      schedule: null, paused: null, blocked: null, key_user_id: c.user.id, next_run_at: null, created: { by, at }, changed: { by, at },
      run_now_day: "", run_now_count: 0, deleted_at: null, stopped_items: [],
    };
    rs().routines.push(r);
    record(c, r, "created", null, null, false);
    return r;
  }

  // ---- notices (26.3), a person's web session
  route("GET", "/me/notices", ({ caller, url }) => {
    visibleFor(caller);
    const c = h.requireSession(caller);
    const mine = rs().notices.filter((n) => n.user_id === c.user.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const from = Number(url.searchParams.get("cursor") ?? 0) || 0;
    const page = mine.slice(from, from + 20).map(({ user_id: _u, ...n }) => n);
    return { data: page, next_cursor: from + 20 < mine.length ? String(from + 20) : null };
  });
  const seen = (userId: string, ids: string[]) => {
    let n = 0;
    for (const x of rs().notices) if (x.user_id === userId && ids.includes(x.id) && !x.seen) (x.seen = true), n++;
    return { seen: n };
  };
  route("POST", "/me/notices/seen", ({ caller, body }) => {
    visibleFor(caller);
    const c = h.requireSession(caller);
    return seen(c.user.id, Array.isArray(body.ids) ? body.ids.map(String) : []);
  });
  route("POST", "/me/notices/{id}/seen", ({ caller, params }) => {
    visibleFor(caller);
    const c = h.requireSession(caller);
    return seen(c.user.id, [params[0]]);
  });

  route("GET", "/routine-occasions", ({ caller }) => {
    // Signed out: an unknown path while routines are dark, "Sign in first" once launched (as the server answers).
    if (!caller) throw launchedForAll ? h.unauthorized() : h.notFound();
    visibleFor(caller);
    return { data: OCCASIONS.map(({ slug, year, date, date_end, label }) => ({ slug, year, date, date_end, label })) };
  });

  route("PUT", "/routines/{id}/follow", ({ caller, params, body }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    if (c.kind !== "user") throw h.forbidden("Only a person, on the web, chooses where they see it");
    const f: RoutineFollow = { routine_id: r.id, email: !!body.email, at_once: !!body.at_once };
    const m = rs().follows.get(r.id) ?? new Map();
    m.set(c.user.id, f);
    rs().follows.set(r.id, m);
    return f;
  });
  route("DELETE", "/routines/{id}/follow", ({ caller, params }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    rs().follows.get(r.id)?.delete(c.user.id);
    return h.noContent;
  });

  route("GET", "/lists/{id}/routines", ({ caller, params }) => {
    visibleFor(caller);
    h.requireWriter(caller, params[0]);
    return { data: rs().routines.filter((r) => r.list_id === params[0] && !r.deleted_at).map((r) => out(r, caller)) };
  });

  route("POST", "/lists/{id}/routines", ({ caller, params, body }) => {
    visibleFor(caller);
    const c = h.requireWriter(caller, params[0]);
    const list = h.getList(params[0]);
    if (h.unclaimed(list.id)) throw h.invalid("Unclaimed lists have no routines");
    const kind = body.kind as RoutineKind;
    const sw = routinesFor(userOf(c).email);
    if (!(sw?.kinds_visible as Record<string, boolean> | undefined)?.[kind]) throw h.invalid(`kind must be one of ${Object.entries(sw?.kinds_visible ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ")}`);
    // SPEC 26.4: a person on the web follows what they make, and says how (restock tells nobody anything).
    if (c.kind === "user" && !["exa_search", "restock", "list_changes"].includes(kind) && (typeof body.follow !== "object" || body.follow === null)) throw h.invalid("Choose where you'll see it");
    if (kind === "weekly_summary") throw h.invalid("A weekly summary belongs to no list: make it on the Routines tab");
    if (kind === "list_changes") return h.created(out(makeListChanges(c, params[0], body), c));
    if (kind !== "exa_search") return h.created(out(makeKind(c, params[0], kind, body), c));
    const existing = rs().routines.find((r) => r.list_id === params[0] && r.kind === "exa_search" && !r.deleted_at && r.blocked?.reason !== "by_admin");
    if (existing) throw h.conflict(`This list already has a search routine: "${existing.name}"`, { routine: { id: existing.id, name: existing.name } });
    const personAsked = askedBy(c, body);
    const user = h.userById(c.user.id);
    // The first routine carries the person's zone when none is saved (20.14 item 6).
    if (!user.time_zone && typeof body.schedule?.time_zone === "string") user.time_zone = body.schedule.time_zone;
    const sched = normaliseSchedule(body.schedule, user.time_zone ?? "UTC");
    if (typeof sched === "string") throw h.invalid(sched);
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "Search the web for these wants";
    const at = h.nowIso();
    const by = h.actorRef(c);
    const r: RoutineRow = {
      id: h.newId("rtn"),
      list_id: params[0],
      kind: "exa_search",
      name,
      // The kind's default name is the server's words, whoever made it.
      name_by: typeof body.name === "string" && body.name.trim() ? (c.kind === "agent" ? "agent" : "person") : "server",
      schedule: sched,
      paused: null,
      blocked: null,
      key_user_id: null,
      next_run_at: nextRun(sched),
      created: { by, at },
      changed: { by, at },
      run_now_day: "",
      run_now_count: 0,
      deleted_at: null,
      stopped_items: [],
    };
    takeKey(c, r);
    rs().routines.push(r);
    record(c, r, "created", null, personAsked, true);
    return h.created(out(r, c));
  });

  route("PATCH", "/routines/{id}", ({ caller, params, body }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    const personAsked = askedBy(c, body);
    const before = snapshot(r);
    const holderBefore = r.key_user_id;
    let change: RoutineChangeKind | null = null;
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 60 || /[\r\n]/.test(name)) throw h.invalid("name: 1 to 60 characters, one line");
      if (name !== r.name) {
        r.name = name;
        r.name_by = c.kind === "agent" ? "agent" : "person";
        change = "renamed";
      }
    }
    if (body.settings && typeof body.settings === "object" && r.kind !== "exa_search") {
      r.settings = { ...(r.settings ?? {}), ...body.settings };
      change = "settings";
    }
    if (body.schedule && r.schedule) {
      const sched = normaliseSchedule({ ...body.schedule, time_zone: body.schedule.time_zone ?? r.schedule.time_zone }, r.schedule.time_zone);
      if (typeof sched === "string") throw h.invalid(sched);
      if (scheduleText(sched) !== scheduleText(r.schedule)) {
        if (runsPer28(sched) > runsPer28(r.schedule) && r.kind === "exa_search") takeKey(c, r);
        r.schedule = sched;
        r.next_run_at = nextRun(sched);
        change = "rescheduled";
      }
    }
    if (body.paused === true && !r.paused) {
      r.paused = { by: h.actorRef(c), at: h.nowIso() };
      change = "paused";
    }
    if (body.resume === true && (r.paused || (r.blocked && r.blocked.reason !== "by_admin"))) {
      if (r.blocked?.reason === "by_admin") throw h.forbidden("Only The Want MCP can resume this routine");
      if (r.kind === "exa_search") takeKey(c, r);
      // SPEC 26.21.9: only its URL holder resumes a list_changes routine; a stopped URL is asked again first.
      if (r.kind === "list_changes") {
        if (c.kind !== "user" || c.user.id !== r.key_user_id) throw h.forbidden("Only the person whose URL it calls can resume it.");
        if (r.blocked?.reason === "url_failing") {
          const e = rs().endpoints.find((x) => x.id === (r.settings as any)?.endpoint_id && !x.deleted_at);
          if (e) handshake(e);
          if (r.blocked) throw h.conflict(e?.last_problem ?? "Its URL still doesn't answer.");
        }
        if (r.blocked?.reason === "url_removed") throw h.conflict("Its URL was removed; make a new routine with another of your URLs.");
      }
      r.paused = null;
      if (r.blocked && ["key_holder_left", "all_rejected", "unattended", "key_missing", "key_refused", "out_of_credit"].includes(r.blocked.reason)) r.blocked = null;
      r.next_run_at = r.schedule ? nextRun(r.schedule) : null;
      change = "resumed";
    }
    if (change) record(c, r, change, before, personAsked, holderBefore !== r.key_user_id);
    return out(r, c);
  });

  route("DELETE", "/routines/{id}", ({ caller, params, body }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    const personAsked = askedBy(c, body ?? {});
    const before = snapshot(r);
    r.deleted_at = h.nowIso();
    record(c, r, "deleted", before, personAsked, false);
    return { deleted: true };
  });

  route("POST", "/routines/{id}/run", ({ caller, params, body }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    const personAsked = askedBy(c, body ?? {});
    const sw = routinesFor(userOf(c).email);
    if (!sw?.running) throw h.conflict("Routines are paused for everyone for now");
    if (r.kind === "list_changes") throw h.invalid("It sends changes as they happen; to try the URL, use Send a test on the account page.");
    if (r.paused || r.blocked) throw h.conflict("It's paused or stopped: resume it first.");
    if (liveRun(r.id)) throw h.conflict("It's running now; its results will be in its history shortly.");
    if (r.run_now_day !== today()) {
      r.run_now_day = today();
      r.run_now_count = 0;
    }
    if (r.run_now_count >= RUN_NOW_PER_DAY) throw h.conflict(`It has run ${RUN_NOW_PER_DAY} times today already; it runs again on its schedule.`);
    const before = snapshot(r);
    const holderBefore = r.key_user_id;
    // Only kinds that spend money need a key (SPEC 26.2 item 6).
    if (r.kind === "exa_search") takeKey(c, r);
    r.run_now_count++;
    const run = r.kind === "exa_search" ? runOnce(r, c, "run_now") : checkOnce(r, c);
    record(c, r, "run_now", before, personAsked, holderBefore !== r.key_user_id);
    return { queued: true, run_id: run.id };
  });

  route("GET", "/routines/{id}/runs/{run_id}", ({ caller, params }) => {
    const r = live(params[0]);
    writerOf(caller, r);
    const run = rs().runs.find((x) => x.id === params[1] && x.routine_id === r.id);
    if (!run) throw h.notFound("Run not found");
    return strip(advance(run));
  });

  route("GET", "/routines/{id}/runs", ({ caller, params, url }) => {
    const r = live(params[0]);
    writerOf(caller, r);
    liveRun(r.id);
    const all = rs().runs.filter((x) => x.routine_id === r.id).sort((a, b) => b.queued_at.localeCompare(a.queued_at));
    const from = Number(url.searchParams.get("cursor") ?? 0) || 0;
    const page = all.slice(from, from + 10);
    // Viewing History counts as looking (20.7).
    rs().views.set(`${caller.user.id}:${r.list_id}`, h.nowIso());
    return { data: page.map(strip), next_cursor: from + 10 < all.length ? String(from + 10) : null };
  });

  route("DELETE", "/routines/{id}/pending", ({ caller, params }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    if (c.kind !== "user") throw h.forbidden("Only a person can do that");
    let rejected = 0;
    for (const e of h.entries()) if (e.author?.routine?.id === r.id && e.status === "suggested") (e.status = "rejected"), rejected++;
    return { rejected };
  });

  route("POST", "/routines/{id}/items/{item_id}/resume", ({ caller, params }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    if (c.kind !== "user") throw h.forbidden("Only a person can do that");
    r.stopped_items = r.stopped_items.filter((x) => x !== params[1]);
    return out(r, c);
  });

  route("POST", "/routines/{id}/undo", ({ caller, params, body }) => {
    visibleFor(caller);
    const c = h.requireSession(caller);
    const ch = rs().changes.find((x) => x.id === body.change_id && x.routine_id === params[0]);
    if (!ch) throw h.notFound("That change can't be undone");
    if (Date.parse(ch.at) < Date.now() - 7 * 86400_000) throw h.invalid("Changes older than 7 days can't be undone");
    const idx = rs().routines.findIndex((x) => x.id === params[0]);
    if (idx < 0) throw h.notFound("Routine not found");
    writerOf(c, rs().routines[idx]);
    const current = rs().routines[idx];
    let r: RoutineRow;
    if (!ch.before) {
      // Undoing a creation deletes it.
      current.deleted_at = h.nowIso();
      record(c, current, "deleted", snapshot(current), null, false);
      return out(current, c);
    }
    r = { ...structuredClone(ch.before), deleted_at: null };
    const runs = !r.paused && !r.blocked;
    // Never back onto someone else's key: without a working key of the viewer's own, restored paused (20.2).
    if (runs && r.key_user_id !== c.user.id) {
      const k = keyOf(c.user.id);
      if (k?.status === "ok") r.key_user_id = c.user.id;
      else r.paused = { by: h.actorRef(c), at: h.nowIso() };
    }
    rs().routines[idx] = r;
    record(c, r, "restored", snapshot(current), null, current.key_user_id !== r.key_user_id);
    return out(r, c);
  });

  route("GET", "/me/routines", ({ caller }) => {
    visibleFor(caller);
    const c = h.requireSession(caller);
    // On lists they write (with the list), and their own (list null), theirs first.
    const own = rs().routines.filter((r) => !r.deleted_at && !r.list_id && r.user_id === c.user.id);
    const onLists = rs().routines.filter((r) => !r.deleted_at && r.list_id && h.canWrite(c, r.list_id));
    return {
      data: [...own.map((r) => ({ ...out(r, c), list: null })), ...onLists.map((r) => ({ ...out(r, c), list: { id: r.list_id!, title: h.getList(r.list_id!).title } }))],
    };
  });

  /** SPEC 26.12: a person's own routine, on no list (weekly_summary); a person on the web only (26.12 as settled). */
  route("POST", "/me/routines", ({ caller, body }) => {
    visibleFor(caller);
    if (caller?.kind !== "user") throw h.invalid("A weekly summary is your person's own routine, on no list: they make it on the web (Routines), and choose there how they hear.");
    const c = h.requireSession(caller);
    const sw = routinesFor(userOf(c).email);
    if (body.kind !== "weekly_summary" || !sw?.kinds_visible.weekly_summary) throw h.invalid("kind must be weekly_summary");
    if (typeof body.follow !== "object" || body.follow === null) throw h.invalid("Choose where you'll see it");
    const lists = body.settings?.lists ?? "all";
    if (lists !== "all") {
      if (!Array.isArray(lists) || lists.length === 0) throw h.invalid('settings.lists: "all", or the lists to cover');
      for (const id of lists) if (!h.lists().some((l: any) => l.id === id) || !h.canWrite(c, id)) throw h.notFound("List not found");
    }
    const dup = rs().routines.find((r) => !r.deleted_at && !r.list_id && r.user_id === c.user.id && r.kind === "weekly_summary");
    if (dup) throw h.conflict(`You already have this routine: "${dup.name}". Change that one instead.`, { routine_id: dup.id, name: dup.name });
    const user = h.userById(c.user.id);
    const hour = prefs(c.user.id).email_hour;
    const sched = normaliseSchedule({ every: "week", days: ["sun"], time: `${String(hour).padStart(2, "0")}:00`, ...(body.schedule ?? {}) }, user.time_zone ?? "UTC");
    if (typeof sched === "string") throw h.invalid(sched);
    const at = h.nowIso();
    const by = h.actorRef(c);
    const r: RoutineRow = {
      id: h.newId("rtn"), list_id: null, user_id: c.user.id, kind: "weekly_summary", item_id: null, settings: { lists }, start: "schedule",
      name: "A weekly summary of my lists", name_by: "server", schedule: sched, paused: null, blocked: null, key_user_id: null,
      next_run_at: nextRun(sched), created: { by, at }, changed: { by, at }, run_now_day: "", run_now_count: 0, deleted_at: null, stopped_items: [],
    };
    rs().routines.push(r);
    rs().follows.set(r.id, new Map([[c.user.id, { routine_id: r.id, email: !!body.follow.email, at_once: false }]]));
    record(c, r, "created", null, null, false);
    return h.created(out(r, c));
  });

  route("GET", "/me/routine-changes", ({ caller }) => {
    visibleFor(caller);
    const c = h.requireSession(caller);
    const since = Date.now() - 7 * 86400_000;
    const data: RoutineChangeRecord[] = rs()
      .changes.filter((x) => x.by.kind === "agent" && x.by_user_id === c.user.id && Date.parse(x.at) >= since)
      .sort((a, b) => b.at.localeCompare(a.at))
      .flatMap((x) => {
        const r = rs().routines.find((y) => y.id === x.routine_id);
        // Agents never touch a person's own routine (26.12), so every change here is on a list.
        if (!r || !r.list_id || !h.canWrite(c, r.list_id)) return [];
        const newest = rs().changes.filter((y) => y.routine_id === r.id).sort((a, b) => b.at.localeCompare(a.at))[0];
        return [
          {
            id: x.id,
            routine: { id: r.id, name: r.name, name_by: r.name_by, deleted: !!r.deleted_at, list: { id: r.list_id, title: h.getList(r.list_id).title } },
            change: x.change,
            by: x.by,
            at: x.at,
            reported_words: x.person_asked,
            // Only the newest change of a routine can be undone (later ones would be lost).
            can_undo: newest?.id === x.id,
          },
        ];
      });
    return { data };
  });

  // ---- keys (20.5), web only
  const keyOut = (k: KeyRow, userId: string): ServiceKey => ({
    service: "exa",
    last4: k.last4,
    status: k.status,
    status_at: k.status_at,
    monthly_cap: k.monthly_cap,
    used_this_month: k.used,
    routines: rs()
      .routines.filter((r) => r.key_user_id === userId && !r.deleted_at && r.list_id)
      .map((r) => ({ id: r.id, name: r.name, list: { id: r.list_id!, title: h.getList(r.list_id!).title } })),
  });
  const keysCaller = (caller: any) => {
    visibleFor(caller);
    if (caller.kind !== "user") throw h.forbidden("Only your person, signed in on the web, can add or change a key.");
    return caller;
  };
  /** 20.5: a fixed key restarts what it blocked (a person's pause stays). */
  const lift = (userId: string) => {
    for (const r of rs().routines) if (r.key_user_id === userId && r.blocked && ["key_missing", "key_refused", "out_of_credit"].includes(r.blocked.reason)) r.blocked = null;
  };
  route("GET", "/me/service-keys", ({ caller }) => {
    const c = keysCaller(caller);
    const k = keyOf(c.user.id);
    return { data: k ? [keyOut(k, c.user.id)] : [] };
  });
  route("PUT", "/me/service-keys/exa", ({ caller, body }) => {
    const c = keysCaller(caller);
    const key = typeof body.key === "string" ? body.key.trim() : "";
    if (key.length < 8 || /\s/.test(key)) throw h.invalid("That doesn't look like an Exa key. Copy it again from your Exa dashboard.");
    // Mock: a key containing "bad" is refused by Exa; "empty" has no credit.
    if (body.check !== false && key.includes("bad")) throw h.invalid("Exa didn't accept that key. Check it on your Exa dashboard and paste it again.");
    const status: ServiceKey["status"] = key.includes("empty") ? "out_of_credit" : "ok";
    const old = keyOf(c.user.id);
    const row: KeyRow = { user_id: c.user.id, last4: key.slice(-4), status, status_at: h.nowIso(), monthly_cap: old?.monthly_cap ?? 100, used: old?.used ?? 0 };
    rs().keys = rs().keys.filter((k) => k.user_id !== c.user.id).concat(row);
    if (status === "ok") lift(c.user.id);
    // No credit: every routine on this key stops until a check passes (20.5).
    else for (const r of rs().routines) if (r.key_user_id === c.user.id && !r.deleted_at && !r.blocked) r.blocked = { reason: "out_of_credit", at: h.nowIso() };
    return keyOut(row, c.user.id);
  });
  route("PATCH", "/me/service-keys/exa", ({ caller, body }) => {
    const c = keysCaller(caller);
    const k = keyOf(c.user.id);
    if (!k) throw h.notFound("No Exa key saved");
    const cap = Number(body.monthly_cap);
    if (!Number.isInteger(cap) || cap < 10 || cap > 5000) throw h.invalid("The monthly limit is 10 to 5000 searches");
    k.monthly_cap = cap;
    return keyOut(k, c.user.id);
  });
  route("POST", "/me/service-keys/exa/check", ({ caller }) => {
    const c = keysCaller(caller);
    const k = keyOf(c.user.id);
    if (!k) throw h.notFound("No Exa key saved");
    // Mock: a check passes (credit was topped up).
    k.status = "ok";
    k.status_at = h.nowIso();
    lift(c.user.id);
    return keyOut(k, c.user.id);
  });
  route("DELETE", "/me/service-keys/exa", ({ caller }) => {
    const c = keysCaller(caller);
    rs().keys = rs().keys.filter((k) => k.user_id !== c.user.id);
    for (const r of rs().routines) if (r.key_user_id === c.user.id && !r.deleted_at && !r.blocked) r.blocked = { reason: "key_missing", at: h.nowIso() };
    return h.noContent;
  });

  // ---- each person's email choices (20.8, 26.4), web only
  const prefs = (id: string) => ({ routine_key: false, routine_unattended: true, routine_digest: true, routine_at_once: true, email_hour: 8, ...(rs().emailPrefs.get(id) ?? {}) });
  /** SPEC 26.4: everything the person gets, and every routine they follow. */
  const prefsOut = (id: string): EmailPrefs => {
    const { email_hour, ...kinds } = prefs(id);
    const follows: EmailPrefs["follows"] = [];
    for (const [routineId, m] of rs().follows) {
      const f = m.get(id);
      const r = rs().routines.find((x) => x.id === routineId && !x.deleted_at);
      if (!f || !r) continue;
      follows.push({ ...f, routine: { id: r.id, name: r.name, name_by: r.name_by, kind: r.kind }, list: r.list_id ? { id: r.list_id, title: h.getList(r.list_id).title } : null });
    }
    return { kinds, email_hour, follows };
  };
  route("GET", "/me/email-prefs", ({ caller }) => {
    const c = keysCaller(caller);
    return prefsOut(c.user.id);
  });
  route("PATCH", "/me/email-prefs", ({ caller, body }) => {
    const c = keysCaller(caller);
    const next = { ...prefs(c.user.id) };
    for (const k of ["routine_key", "routine_unattended", "routine_digest", "routine_at_once"] as const) if (typeof body.kinds?.[k] === "boolean") next[k] = body.kinds[k];
    if (body.email_hour !== undefined) {
      const hr = Number(body.email_hour);
      if (!Number.isInteger(hr) || hr < 0 || hr > 23) throw h.invalid("email_hour: 0 to 23");
      next.email_hour = hr;
    }
    // "Stop all routine emails": every kind off, and every follow back to the app only.
    if (body.stop_all === true) {
      next.routine_key = next.routine_unattended = next.routine_digest = next.routine_at_once = false;
      for (const m of rs().follows.values()) {
        const f = m.get(c.user.id);
        if (f) (f.email = false), (f.at_once = false);
      }
    }
    rs().emailPrefs.set(c.user.id, next);
    return prefsOut(c.user.id);
  });

  // ---- list views (20.7): people only, at most one an hour on the server
  route("POST", "/lists/{id}/views", ({ caller, params }) => {
    if (!caller || caller.kind !== "user") throw h.forbidden("Only a person's views count");
    h.requireWriter(caller, params[0]);
    rs().views.set(`${caller.user.id}:${params[0]}`, h.nowIso());
    return h.noContent;
  });

  // ---- routine-ask links (20.7): work without signing in
  const ask = (token: string) => {
    const a = rs().asks.get(token);
    const r = a ? rs().routines.find((x) => x.id === a.routine_id) : undefined;
    if (!a || !r) throw h.notFound("This link has expired");
    return { a, r };
  };
  route("GET", "/routine-asks/{token}", ({ params }) => {
    const { a, r } = ask(params[0]);
    return { routine: { name: r.name, list_title: r.list_id ? h.getList(r.list_id).title : "" }, done: !!a.used, answered: a.used };
  });
  route("POST", "/routine-asks/{token}", ({ params, body }) => {
    const { a, r } = ask(params[0]);
    if (body.action !== "keep" && body.action !== "pause") throw h.invalid("action must be keep or pause");
    // Used for this action already: nothing more to do. The other choice stays open (the page offers it afterwards).
    if (a.used === body.action) return { routine: { name: r.name, list_title: r.list_id ? h.getList(r.list_id).title : "" }, done: true, answered: a.used };
    if (body.action === "keep") r.paused = null;
    a.used = body.action;
    if (body.action === "pause") {
      const holder = r.key_user_id ? h.userById(r.key_user_id) : null;
      r.paused = { by: { kind: "user", handle: holder?.handle ?? "" }, at: h.nowIso() };
    }
    return { routine: { name: r.name, list_title: r.list_id ? h.getList(r.list_id).title : "" }, done: true, answered: a.used };
  });

  // ---- saved URLs (26.21.2): a person on the web only, while list_changes is visible to them
  const urlPerson = (caller: any) => {
    visibleFor(caller);
    if (!routinesFor(userOf(caller).email)?.kinds_visible.list_changes) throw h.notFound();
    if (caller.kind !== "user") throw h.forbidden("Only your person, signed in on the web, can add or change a URL.");
    return caller;
  };
  const endpointOut = (e: EndpointRow): RoutineEndpoint => ({
    id: e.id, name: e.name, host: new URL(e.url).hostname, state: e.state, verified_at: e.verified_at, last_ok_at: e.last_ok_at, last_fail_at: e.last_fail_at,
    last_problem: e.last_problem,
    used_by: rs()
      .routines.filter((r) => !r.deleted_at && r.kind === "list_changes" && (r.settings as any)?.endpoint_id === e.id)
      .map((r) => ({ routine: { id: r.id, name: r.name }, list: r.list_id ? { id: r.list_id, title: h.getList(r.list_id).title } : null, as: "list_changes" as const })),
  });
  const ownEndpoint = (c: any, id: string) => {
    const e = rs().endpoints.find((x) => x.id === id && x.user_id === c.user.id && !x.deleted_at);
    if (!e) throw h.notFound("URL not found");
    return e;
  };
  /** The address rules (mock): https, a DNS name, not ours; "private" in the name stands for one that resolves privately. */
  const checkAddress = (raw: unknown): string => {
    let u: URL;
    try {
      u = new URL(String(raw ?? ""));
    } catch {
      throw h.invalid("url must be an https address");
    }
    if (u.protocol !== "https:") throw h.invalid("url must be an https address");
    if (/^[\d.]+$|^\[/.test(u.hostname) || u.username || u.password || u.port || u.hash) throw h.invalid("url must be https, a name (not an IP address), with no user, password, port or #fragment");
    if (/(^|\.)wantmcp\.com$/.test(u.hostname)) throw h.invalid("url can't be The Want MCP itself");
    if (u.hostname.includes("private")) throw h.invalid("url must point to a public address (its name resolves to a private or reserved one, or to nothing)");
    return u.toString();
  };
  /** The handshake (mock rule): a name with "nope" in it never echoes the challenge. */
  const handshake = (e: EndpointRow) => {
    const at = h.nowIso();
    if (new URL(e.url).hostname.includes("nope")) {
      e.last_fail_at = at;
      e.last_problem = "The URL did not answer the handshake: it answered 404.";
      if (e.state !== "failing") e.state = "unverified";
      return;
    }
    e.state = "ok";
    e.verified_at = e.last_ok_at = at;
    e.last_problem = null;
    // A URL that answers again lifts what its failing blocked.
    for (const r of rs().routines) if (r.kind === "list_changes" && (r.settings as any)?.endpoint_id === e.id && r.blocked?.reason === "url_failing") r.blocked = null;
  };
  const newSecret = () => `whsec_${h.randomToken(43)}`;
  route("GET", "/me/endpoints", ({ caller }) => {
    const c = urlPerson(caller);
    return { data: rs().endpoints.filter((e) => e.user_id === c.user.id && !e.deleted_at).map(endpointOut) };
  });
  route("POST", "/me/endpoints", ({ caller, body }) => {
    const c = urlPerson(caller);
    for (const k of Object.keys(body ?? {})) if (k !== "name" && k !== "url") throw h.invalid(`takes name and url; not ${k}`);
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 40) throw h.invalid("name must be 1 to 40 characters, one line");
    const live = rs().endpoints.filter((e) => e.user_id === c.user.id && !e.deleted_at).length;
    if (live >= 5) throw h.invalid(`You have ${live} URLs, the most you may keep (routine.url.endpoints_per_person); remove one first`);
    const e: EndpointRow = { id: h.newId("rep"), user_id: c.user.id, name, url: checkAddress(body.url), state: "unverified", verified_at: null, last_ok_at: null, last_fail_at: null, last_problem: null, deleted_at: null };
    rs().endpoints.push(e);
    handshake(e);
    return h.created({ endpoint: endpointOut(e), secret: newSecret() });
  });
  route("PATCH", "/me/endpoints/{id}", ({ caller, params, body }) => {
    const c = urlPerson(caller);
    const e = ownEndpoint(c, params[0]);
    if (body.name !== undefined) e.name = String(body.name).trim().slice(0, 40);
    if (body.url !== undefined) {
      const url = checkAddress(body.url);
      if (url !== e.url) {
        e.url = url;
        e.state = "unverified";
        e.verified_at = null;
        handshake(e);
      }
    }
    return endpointOut(e);
  });
  route("POST", "/me/endpoints/{id}/verify", ({ caller, params }) => {
    const e = ownEndpoint(urlPerson(caller), params[0]);
    handshake(e);
    return endpointOut(e);
  });
  route("POST", "/me/endpoints/{id}/test", ({ caller, params }) => {
    const e = ownEndpoint(urlPerson(caller), params[0]);
    if (e.state === "unverified") throw h.conflict("This URL hasn't answered the handshake yet: verify it first.");
    e.last_ok_at = h.nowIso();
    e.last_problem = null;
    return endpointOut(e);
  });
  route("POST", "/me/endpoints/{id}/rotate-secret", ({ caller, params }) => {
    ownEndpoint(urlPerson(caller), params[0]);
    return { secret: newSecret() };
  });
  route("DELETE", "/me/endpoints/{id}", ({ caller, params }) => {
    const e = ownEndpoint(urlPerson(caller), params[0]);
    e.deleted_at = h.nowIso();
    e.url = "https://removed.invalid/";
    for (const r of rs().routines) if (r.kind === "list_changes" && !r.deleted_at && !r.blocked && (r.settings as any)?.endpoint_id === e.id) r.blocked = { reason: "url_removed", at: h.nowIso() };
    return { deleted: true };
  });

  // ---- other addresses (26.20 item 4): the follower's, on the web; and the address's own links
  route("POST", "/routines/{id}/recipients", ({ caller, params, body }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    if (c.kind !== "user") throw h.forbidden("Only a person, on the web, adds an address");
    for (const k of Object.keys(body ?? {})) if (k !== "email" && k !== "show_list_name") throw h.invalid(`takes email and show_list_name; not ${k}`);
    if (!RECIPIENT_KINDS.includes(r.kind)) throw h.invalid("This kind of routine sends no email to share.");
    if (!rs().follows.get(r.id)?.get(c.user.id)) throw h.invalid("Follow this routine first; then you can add other addresses to its email.");
    const email = String(body.email ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw h.invalid("email must be an email address");
    const key = email.toLowerCase();
    if (rs().doNotAsk.has(key)) throw h.invalid("They've asked not to get these.");
    const before = rs().recipients.find((x) => x.routine_id === r.id && x.key === key);
    if (before) throw h.conflict(`Already asked on ${before.asked_on}.`);
    const mine = rs().recipients.filter((x) => x.routine_id === r.id && x.added_by === c.user.id && (x.state === "asked" || x.state === "yes")).length;
    if (mine >= 3) throw h.invalid("You've added 3 addresses to this routine, the most you may.");
    const at = h.nowIso();
    const row: RecipientRow = { id: h.newId("rcp"), routine_id: r.id, added_by: c.user.id, email, key, show_list: body.show_list_name === true, state: "asked", since: at, asked_on: at.slice(0, 10), token: h.randomToken(24) };
    rs().recipients.push(row);
    return h.created({ id: row.id, email: row.email, state: row.state, since: row.since });
  });
  route("DELETE", "/routines/{id}/recipients/{rid}", ({ caller, params }) => {
    const r = live(params[0]);
    const c = writerOf(caller, r);
    const x = rs().recipients.find((y) => y.id === params[1] && y.routine_id === r.id && y.added_by === c.user.id && y.state !== "removed");
    if (!x) throw h.notFound("Address not found");
    x.state = "removed";
    x.email = null;
    x.since = h.nowIso();
    return h.noContent;
  });
  const recipient = (token: string) => {
    const x = rs().recipients.find((y) => y.token === token && y.state !== "removed");
    const r = x ? rs().routines.find((y) => y.id === x.routine_id) : null;
    if (!x || !r) throw h.notFound("Not found");
    const list = r.list_id ? h.getList(r.list_id) : null;
    const name = !list ? "their lists on The Want MCP" : list.visibility === "private" && !x.show_list ? "a list on The Want MCP" : `"${list.title.slice(0, 40)}"`;
    const view = (): RecipientAskView => ({ from: `@${h.userById(x.added_by).handle} on The Want MCP`, list: name, what: RECIPIENT_WHAT[r.kind] ?? "routine emails", state: x.state as RecipientAskView["state"] });
    return { x, view };
  };
  route("GET", "/recipient-asks/{token}", ({ params }) => recipient(params[0]).view());
  route("POST", "/recipient-asks/{token}", ({ params, body }) => {
    const { x, view } = recipient(params[0]);
    if (body.answer !== "yes" && body.answer !== "no") throw h.invalid("answer must be yes or no");
    if (x.state === "asked") {
      x.state = body.answer;
      x.since = h.nowIso();
      if (body.answer === "no") {
        x.email = null;
        rs().doNotAsk.add(x.key);
      }
    }
    return view();
  });
  route("GET", "/recipient-stops/{token}", ({ params }) => recipient(params[0]).view());
  route("POST", "/recipient-stops/{token}", ({ params }) => {
    const { x, view } = recipient(params[0]);
    if (x.state === "asked" || x.state === "yes") {
      x.state = "stopped";
      x.since = h.nowIso();
      x.email = null;
    }
    rs().doNotAsk.add(x.key);
    return view();
  });
  // ---- "Stop emailing me about this routine" (26.4): GET never acts
  const emailStop = (token: string) => {
    const s = rs().emailStops.get(token);
    const r = s ? rs().routines.find((y) => y.id === s.routine_id) : null;
    if (!s || !r) throw h.notFound("Not found");
    const f = () => rs().follows.get(r.id)?.get(s.user_id) ?? null;
    const view = (): RoutineEmailStopView => ({ routine: { name: r.name, list_title: r.list_id ? h.getList(r.list_id).title : null }, done: !f()?.email });
    return { f, view };
  };
  route("GET", "/routine-email-stops/{token}", ({ params }) => emailStop(params[0]).view());
  route("POST", "/routine-email-stops/{token}", ({ params }) => {
    const { f, view } = emailStop(params[0]);
    const mine = f();
    if (mine) (mine.email = false), (mine.at_once = false);
    return view();
  });

  return { out, runOnce };
}
