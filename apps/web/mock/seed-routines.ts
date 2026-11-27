/**
 * SPEC 20 fixtures: sign in as routines@example.com to see routines (the mock shows them only to emails with
 * "routines" in them). Two lists shared with @sam (routines-sam@example.com):
 * - "Kitchen" (shopping): a weekly search routine on your key that has run once, with two suggestions waiting;
 * - "Garden jobs" (tasks): a routine your agent Claude made yesterday because you asked (Undo on /app);
 * - "Ana's birthday" (shopping): @sam's routine, on @sam's key, stopped because @sam's Exa account is out of credit;
 * - one want on Kitchen the routine stopped looking for.
 */
import type { ActorRef } from "../app/lib/types.ts";
import type { RoutineStore } from "./routines.ts";
import { nextRun } from "./routines.ts";
import type { Store } from "./store.ts";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export function seedRoutines(s: Store, rs: RoutineStore, now = Date.now()) {
  const at = (msAgo: number) => new Date(now - msAgo).toISOString().replace(/\.\d{3}Z$/, "Z");
  const me: ActorRef = { kind: "user", handle: "bright-wren-2207" };
  const sam: ActorRef = { kind: "user", handle: "sam" };
  const claude: ActorRef = { kind: "agent", agent_id: "agt_rt_claude", name: "Claude", owner_handle: me.handle };

  s.users.push(
    { id: "usr_rt", email: "routines@example.com", handle: me.handle, updates_opt_in: false, country: "US", time_zone: "America/New_York", created_at: at(30 * DAY) },
    { id: "usr_rt_sam", email: "routines-sam@example.com", handle: "sam", updates_opt_in: false, created_at: at(30 * DAY) },
  );
  s.agents.push({ id: "agt_rt_claude", name: "Claude", kind: "oauth", key: null, list_ids: ["lst_rt_kitchen", "lst_rt_garden"], owner_id: "usr_rt", created_at: at(10 * DAY), last_used_at: at(HOUR) });
  s.lists.push(
    { id: "lst_rt_kitchen", title: "Kitchen", description: "", owner_id: "usr_rt", allow_outside_suggestions: false, format: "shopping", visibility: "private", created_at: at(20 * DAY), updated_at: at(2 * HOUR) },
    { id: "lst_rt_garden", title: "Garden jobs", description: "", owner_id: "usr_rt", allow_outside_suggestions: false, format: "tasks", visibility: "private", created_at: at(20 * DAY), updated_at: at(3 * HOUR) },
  );
  s.lists.push({ id: "lst_rt_ana", title: "Ana's birthday", description: "", owner_id: "usr_rt_sam", allow_outside_suggestions: false, format: "shopping", visibility: "private", created_at: at(5 * DAY), updated_at: at(5 * HOUR) });
  s.members.push(
    { id: "mem_ana_sam", list_id: "lst_rt_ana", user_id: "usr_rt_sam", invited_email: null, role: "owner", status: "active", token: null, created_at: at(5 * DAY) },
    { id: "mem_ana_me", list_id: "lst_rt_ana", user_id: "usr_rt", invited_email: null, role: "member", status: "active", token: null, created_at: at(5 * DAY) },
  );
  s.items.push({ id: "itm_rt_ana_book", list_id: "lst_rt_ana", text: "A field guide to birds", created_by: sam, created_at: at(4 * DAY), purchase: null });
  for (const l of ["lst_rt_kitchen", "lst_rt_garden"]) {
    s.members.push(
      { id: `mem_${l}_me`, list_id: l, user_id: "usr_rt", invited_email: null, role: "owner", status: "active", token: null, created_at: at(20 * DAY) },
      { id: `mem_${l}_sam`, list_id: l, user_id: "usr_rt_sam", invited_email: null, role: "member", status: "active", token: null, created_at: at(19 * DAY) },
    );
  }
  s.items.push(
    { id: "itm_rt_kettle", list_id: "lst_rt_kitchen", text: "A good kettle", created_by: me, created_at: at(10 * DAY), purchase: null },
    { id: "itm_rt_boots", list_id: "lst_rt_kitchen", text: "Kids' winter boots, size 13", created_by: sam, created_at: at(9 * DAY), purchase: null },
    { id: "itm_rt_knife", list_id: "lst_rt_kitchen", text: "A bread knife", created_by: me, created_at: at(8 * DAY), purchase: null },
    // Two wants with nothing found yet, so Run now has something to search (and the live line something to show).
    { id: "itm_rt_headphones", list_id: "lst_rt_kitchen", text: "Noise-cancelling headphones for the train", created_by: me, created_at: at(2 * DAY), purchase: null },
    { id: "itm_rt_pan", list_id: "lst_rt_kitchen", text: "A cast-iron pan, 10 inch", created_by: sam, created_at: at(DAY), purchase: null },
    { id: "itm_rt_hedge", list_id: "lst_rt_garden", text: "Trim the hedge before the frost", created_by: me, created_at: at(7 * DAY), purchase: null, status: "open" },
  );

  const weekly = { every: "week" as const, interval: 1, days: ["fri" as const], time: "09:00", time_zone: "America/New_York", anchor: at(14 * DAY).slice(0, 10) };
  rs.routines.push(
    {
      id: "rtn_kitchen",
      list_id: "lst_rt_kitchen",
      kind: "exa_search",
      name: "Search the web for these wants",
      name_by: "server",
      schedule: weekly,
      paused: null,
      blocked: null,
      key_user_id: "usr_rt",
      next_run_at: nextRun(weekly, new Date(now)),
      created: { by: me, at: at(14 * DAY) },
      changed: { by: me, at: at(14 * DAY) },
      run_now_day: "",
      run_now_count: 0,
      deleted_at: null,
      stopped_items: ["itm_rt_knife"],
    },
    {
      id: "rtn_garden",
      list_id: "lst_rt_garden",
      kind: "exa_search",
      name: "Look for hedge trimming help nearby",
      name_by: "agent",
      schedule: { every: "week", interval: 2, days: ["mon"], time: "08:00", time_zone: "America/New_York", anchor: at(DAY).slice(0, 10) },
      paused: null,
      blocked: null,
      key_user_id: "usr_rt",
      next_run_at: nextRun({ every: "week", interval: 2, days: ["mon"], time: "08:00", time_zone: "America/New_York", anchor: "" }, new Date(now)),
      created: { by: claude, at: at(DAY) },
      changed: { by: claude, at: at(DAY) },
      run_now_day: "",
      run_now_count: 0,
      deleted_at: null,
      stopped_items: [],
    },
  );
  rs.routines.push({
    id: "rtn_ana",
    list_id: "lst_rt_ana",
    kind: "exa_search",
    name: "Search the web for these wants",
    name_by: "server",
    schedule: { every: "day", interval: 1, time: "07:00", time_zone: "Europe/London", anchor: at(3 * DAY).slice(0, 10) },
    paused: null,
    blocked: { reason: "out_of_credit", at: at(5 * HOUR) },
    key_user_id: "usr_rt_sam",
    next_run_at: null,
    created: { by: sam, at: at(3 * DAY) },
    changed: { by: sam, at: at(3 * DAY) },
    run_now_day: "",
    run_now_count: 0,
    deleted_at: null,
    stopped_items: [],
  });
  rs.runs.push({
    id: "run_kitchen_1",
    routine_id: "rtn_kitchen",
    trigger: "schedule",
    run_by: null,
    state: "ok",
    attempts: 1,
    queued_at: at(6 * DAY + HOUR),
    started_at: at(6 * DAY + HOUR),
    finished_at: at(6 * DAY + HOUR - 60_000),
    wants_searched: 3,
    suggestions_posted: 2,
    searches_used: 3,
    note: null,
  });
  const routineAuthor: ActorRef = { kind: "outside", name: "Search the web for these wants", routine: { id: "rtn_kitchen", kind: "exa_search", key_holder: me.handle } };
  for (const [id, item, title, url] of [
    ["ent_rt_1", "itm_rt_kettle", "Stagg EKG electric pour-over kettle", "https://shop.example.com/p/stagg-ekg"],
    ["ent_rt_2", "itm_rt_boots", "Kids' waterproof snow boots", "https://shop.example.com/p/kids-snow-boots"],
  ] as const) {
    s.entries.push({
      id,
      item_id: item,
      list_id: "lst_rt_kitchen",
      status: "suggested",
      author: routineAuthor,
      title,
      description: "From a search result, not checked on the store's page.",
      product_url: url,
      buy_url: null,
      image_url: null,
      retailer: "shop.example.com",
      coupon_code: null,
      deal_starts_at: null,
      deal_ends_at: null,
      created_at: at(6 * DAY),
      updated_at: at(6 * DAY),
      promoted_by: null,
      promoted_at: null,
    });
  }
  rs.changes.push(
    { id: "rch_kitchen_made", routine_id: "rtn_kitchen", at: at(14 * DAY), by: me, by_user_id: "usr_rt", change: "created", before: null, person_asked: null },
    { id: "rch_ana_made", routine_id: "rtn_ana", at: at(3 * DAY), by: sam, by_user_id: "usr_rt_sam", change: "created", before: null, person_asked: null },
    { id: "rch_garden_made", routine_id: "rtn_garden", at: at(DAY), by: claude, by_user_id: "usr_rt", change: "created", before: null, person_asked: "look for someone to trim the hedge every other Monday" },
  );
  rs.keys.push(
    { user_id: "usr_rt", last4: "7f3a", status: "ok", status_at: at(14 * DAY), monthly_cap: 100, used: 12 },
    { user_id: "usr_rt_sam", last4: "k29q", status: "out_of_credit", status_at: at(5 * HOUR), monthly_cap: 100, used: 40 },
  );
  rs.asks.set("ask_seed_kitchen", { routine_id: "rtn_kitchen", used: null });
  rs.asks.set("ask_seed_garden", { routine_id: "rtn_garden", used: null });
}
