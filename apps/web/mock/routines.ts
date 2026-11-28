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
  RoutineChange,
  RoutineChangeRecord,
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
  list_id: string;
  kind: "exa_search";
  name: string;
  name_by: RoutineNameBy;
  schedule: Schedule;
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
  change: RoutineChange;
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
  emailPrefs: Map<string, EmailPrefs["kinds"]>;
  views: Map<string, Timestamp>;
  asks: Map<string, { routine_id: string; used: "keep" | "pause" | null }>;
}

export const emptyRoutineStore = (): RoutineStore => ({ routines: [], runs: [], changes: [], keys: [], emailPrefs: new Map(), views: new Map(), asks: new Map() });

// ---------- the launch switch (mock rule)

export function routinesFor(email: string): UserSelf["routines"] | undefined {
  if (!email.includes("routines")) return undefined;
  const running = !email.includes("paused");
  return { visible: true, running, kinds: { exa_search: running }, about: { exa_search: { cost_per_search_usd: { shopping: 0.017, tasks: 0.012, research: 0.012 }, key_check_usd: 0.007 } } };
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
  if (every === "week") {
    const days = input?.days?.length ? input.days : [DAYS[now.getUTCDay()]];
    if (days.some((d) => !DAYS.includes(d))) return "days must be mon to sun";
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
    forbidden: (what?: string) => Error;
    invalid: (what: string) => Error;
    conflict: (what: string, details?: unknown) => Error;
    created: (v: unknown) => unknown;
    noContent: unknown;
  };
}

const RUN_NOW_PER_DAY = 3;
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
    const routine: Routine = {
      id: r.id,
      list_id: r.list_id,
      item_id: null,
      kind: r.kind,
      settings: {},
      start: "schedule",
      name: r.name,
      name_by: r.name_by,
      schedule: r.schedule,
      schedule_text: scheduleText(r.schedule),
      paused: r.paused,
      blocked: r.blocked,
      next_run_at: r.paused || r.blocked ? null : r.next_run_at,
      last_run: lastRun(r.id),
      live_run: live ? strip(live) : null,
      status_text: statusText(r, lastRun(r.id), mine, holder?.handle ?? null),
      key_holder: holder ? { handle: holder.handle } : null,
      created: r.created,
      changed: r.changed,
      uses_my_key: mine,
      run_now_left_today: left,
    };
    // The person's own agent's words, to that person on the web only.
    if (c?.kind === "user" && latest?.person_asked && latest.by_user_id === c.user.id) routine.reported_words = latest.person_asked;
    return routine;
  }
  const strip = ({ routine_id: _r, ...run }: RunRow): RoutineRun => run;
  const live = (id: string) => {
    const r = rs().routines.find((x) => x.id === id && !x.deleted_at);
    if (!r) throw h.notFound("Routine not found");
    return r;
  };
  const writerOf = (c: any, r: RoutineRow) => {
    visibleFor(c);
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
  const record = (c: any, r: RoutineRow, change: RoutineChange, before: RoutineRow | null, personAsked: string | null, keyChanged: boolean) => {
    const at = h.nowIso();
    const by = h.actorRef(c);
    r.changed = { by, at };
    rs().changes.push({ id: h.newId("rch"), routine_id: r.id, at, by, by_user_id: c.user.id, change, before, person_asked: personAsked });
    const holder = r.key_user_id ? h.userById(r.key_user_id) : null;
    h.emit("routine.changed", r.list_id, by, `${h.webUrl}/app/lists/${r.list_id}/settings#routines`, {
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
    };
    plans.set(run.id, { wants, t0: Date.now() });
    rs().runs.push(run);
    return run;
  }
  const plans = new Map<string, { wants: Array<{ item_id: string; text: string }>; t0: number }>();
  const QUEUED_MS = 800;
  const WANT_MS = 900;

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
    const list = r ? h.getList(r.list_id) : null;
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
    if (body.kind !== "exa_search") throw h.invalid("kind must be exa_search");
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
    let change: RoutineChange | null = null;
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 60 || /[\r\n]/.test(name)) throw h.invalid("name: 1 to 60 characters, one line");
      if (name !== r.name) {
        r.name = name;
        r.name_by = c.kind === "agent" ? "agent" : "person";
        change = "renamed";
      }
    }
    if (body.schedule) {
      const sched = normaliseSchedule({ ...body.schedule, time_zone: body.schedule.time_zone ?? r.schedule.time_zone }, r.schedule.time_zone);
      if (typeof sched === "string") throw h.invalid(sched);
      if (scheduleText(sched) !== scheduleText(r.schedule)) {
        if (runsPer28(sched) > runsPer28(r.schedule)) takeKey(c, r);
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
      takeKey(c, r);
      r.paused = null;
      if (r.blocked && ["key_holder_left", "all_rejected", "unattended", "key_missing", "key_refused", "out_of_credit"].includes(r.blocked.reason)) r.blocked = null;
      r.next_run_at = nextRun(r.schedule);
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
    if (r.paused || r.blocked) throw h.conflict("It's paused or stopped: resume it first.");
    if (liveRun(r.id)) throw h.conflict("It's running now; its results will be in its history shortly.");
    if (r.run_now_day !== today()) {
      r.run_now_day = today();
      r.run_now_count = 0;
    }
    if (r.run_now_count >= RUN_NOW_PER_DAY) throw h.conflict(`It has run ${RUN_NOW_PER_DAY} times today already; it runs again on its schedule.`);
    const before = snapshot(r);
    const holderBefore = r.key_user_id;
    takeKey(c, r);
    r.run_now_count++;
    const run = runOnce(r, c, "run_now");
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
    h.requireWriter(c, rs().routines[idx].list_id);
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
    return {
      data: rs()
        .routines.filter((r) => !r.deleted_at && h.canWrite(c, r.list_id))
        .map((r) => ({ ...out(r, c), list: { id: r.list_id, title: h.getList(r.list_id).title } })),
    };
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
        if (!r || !h.canWrite(c, r.list_id)) return [];
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
      .routines.filter((r) => r.key_user_id === userId && !r.deleted_at)
      .map((r) => ({ id: r.id, name: r.name, list: { id: r.list_id, title: h.getList(r.list_id).title } })),
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

  // ---- how each person hears (20.8), web only
  const prefs = (id: string) => rs().emailPrefs.get(id) ?? { routine_key: false, routine_unattended: true };
  route("GET", "/me/email-prefs", ({ caller }) => {
    const c = keysCaller(caller);
    return { kinds: prefs(c.user.id) };
  });
  route("PATCH", "/me/email-prefs", ({ caller, body }) => {
    const c = keysCaller(caller);
    const next = { ...prefs(c.user.id) };
    for (const k of ["routine_key", "routine_unattended"] as const) if (typeof body.kinds?.[k] === "boolean") next[k] = body.kinds[k];
    rs().emailPrefs.set(c.user.id, next);
    return { kinds: next };
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
    return { routine: { name: r.name, list_title: h.getList(r.list_id).title }, done: !!a.used, answered: a.used };
  });
  route("POST", "/routine-asks/{token}", ({ params, body }) => {
    const { a, r } = ask(params[0]);
    if (body.action !== "keep" && body.action !== "pause") throw h.invalid("action must be keep or pause");
    // Used for this action already: nothing more to do. The other choice stays open (the page offers it afterwards).
    if (a.used === body.action) return { routine: { name: r.name, list_title: h.getList(r.list_id).title }, done: true, answered: a.used };
    if (body.action === "keep") r.paused = null;
    a.used = body.action;
    if (body.action === "pause") {
      const holder = r.key_user_id ? h.userById(r.key_user_id) : null;
      r.paused = { by: { kind: "user", handle: holder?.handle ?? "" }, at: h.nowIso() };
    }
    return { routine: { name: r.name, list_title: h.getList(r.list_id).title }, done: true, answered: a.used };
  });

  return { out, runOnce };
}
