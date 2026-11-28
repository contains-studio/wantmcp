/**
 * SPEC 20 fixtures: sign in as routines@example.com to see routines (the mock shows them only to emails with
 * "routines" in them). Two lists shared with @sam (routines-sam@example.com):
 * - "Kitchen" (shopping): a weekly search routine on your key that has run once, with two suggestions waiting;
 * - "Garden jobs" (tasks): a routine your agent Claude made yesterday because you asked (Undo on /app);
 * - "Ana's birthday" (shopping): @sam's routine, on @sam's key, stopped because @sam's Exa account is out of credit;
 * - one want on Kitchen the routine stopped looking for.
 */
import type { ActorRef, RoutineKind } from "../app/lib/types.ts";
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
  // An agent that runs on its own (mock rule: an account key listens for events), for "Ask my agent to check" (26.20 item 5).
  s.agents.push({ id: "agt_rt_hermes", name: "Hermes", kind: "account", key: "ak_mock_rt_hermes", list_ids: ["lst_rt_garden"], owner_id: "usr_rt", created_at: at(3 * DAY), last_used_at: at(HOUR) });
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
  // SPEC 26.10: a restock routine on the coffee beans, and the want it brought back, held for a writer.
  s.items.push({
    id: "itm_rt_beans",
    list_id: "lst_rt_kitchen",
    text: "Whole coffee beans, 1kg",
    created_by: me,
    created_at: at(HOUR),
    purchase: null,
    pending_review: true,
    proposed_by: { routine_id: "rtn_beans", routine_name: "Bring back “Whole coffee beans, 1kg”", name_by: "server", note: "Bought on 1 Nov at Trader Joe's for $14.99 · brought back by your routine" },
  });
  rs.routines.push({
    id: "rtn_beans",
    list_id: "lst_rt_kitchen",
    kind: "restock",
    item_id: "itm_rt_beans",
    settings: { after: { unit: "week", count: 4 } },
    start: "event",
    name: "Bring back “Whole coffee beans, 1kg”",
    name_by: "server",
    schedule: null,
    paused: null,
    blocked: null,
    key_user_id: null,
    next_run_at: null,
    created: { by: me, at: at(30 * DAY) },
    changed: { by: me, at: at(30 * DAY) },
    run_now_day: "",
    run_now_count: 0,
    deleted_at: null,
    stopped_items: [],
  });

  // SPEC 26.3: two things routines told this person, waiting under "For you".
  rs.notices.push(
    {
      id: "ntc_price",
      user_id: "usr_rt",
      routine: { id: "rtn_beans", name: "Tell me when “A cast-iron pan, 10 inch” is at my price", name_by: "server", kind: "target_price" },
      list: { id: "lst_rt_kitchen", title: "Kitchen" },
      item: { id: "itm_rt_pan", text: "A cast-iron pan, 10 inch" },
      what: "at_price",
      text: "At your price: $39.99 at Target for “A cast-iron pan, 10 inch”, seen 2 h ago by Claude, not checked on the store's page",
      link: "https://wantmcp.com/l/lst_rt_kitchen#itm_rt_pan",
      due_on: null,
      created_at: at(2 * HOUR),
      seen: false,
    },
    {
      id: "ntc_countdown",
      user_id: "usr_rt",
      routine: { id: "rtn_ana_countdown", name: "Countdown to Christmas", name_by: "server", kind: "countdown" },
      list: { id: "lst_rt_ana", title: "Ana's birthday" },
      item: null,
      what: "countdown",
      text: "28 days to Christmas on “Ana's birthday”: 1 want has nothing yet",
      link: "https://wantmcp.com/l/lst_rt_ana",
      due_on: null,
      created_at: at(5 * HOUR),
      seen: false,
    },
  );

  // A kind this web build doesn't know yet (26.2): its card shows its name and status, Pause and Delete only.
  rs.routines.push({
    id: "rtn_future",
    list_id: "lst_rt_garden",
    // Not a kind of today's contract: stands for one a later server adds.
    kind: "call_url" as RoutineKind,
    item_id: null,
    settings: {},
    start: "schedule",
    name: "Call my URL when something changes",
    name_by: "server",
    schedule: { every: "week", interval: 1, days: ["sun"], time: "18:00", time_zone: "America/New_York", anchor: at(2 * DAY).slice(0, 10) },
    paused: null,
    blocked: null,
    key_user_id: null,
    next_run_at: null,
    created: { by: me, at: at(2 * DAY) },
    changed: { by: me, at: at(2 * DAY) },
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
    wants_total: 3,
    current: null,
    counts: {},
  });
  const routineAuthor: ActorRef = { kind: "outside", name: "Search the web for these wants", routine: { id: "rtn_kitchen", kind: "exa_search", key_holder: me.handle, name_by: "server" } };
  // The real mix the owner saw (27 Nov 2026): some with a picture, most without, a long title, a guide, a product.
  const found: Array<{ id: string; item: string; title: string; url: string; image: string | null; kind?: "guide" }> = [
    { id: "ent_rt_1", item: "itm_rt_kettle", title: "Stagg EKG electric pour-over kettle", url: "https://www.amazon.com/dp/B077JBQZPX", image: "/mock-images/espresso.svg" },
    { id: "ent_rt_3", item: "itm_rt_kettle", title: "The best electric kettles, tested", url: "https://www.seriouseats.com/best-electric-kettles", image: null, kind: "guide" },
    {
      id: "ent_rt_2",
      item: "itm_rt_boots",
      title: "Kids' Waterproof Insulated Snow Boots with Faux Fur Lining, Non-Slip Rubber Sole, for Toddler, Little Kid and Big Kid",
      url: "https://www.target.com/p/kids-snow-boots/-/A-87654321",
      image: null,
    },
  ];
  for (const f of found) {
    const guide = f.kind === "guide";
    s.entries.push({
      id: f.id,
      item_id: f.item,
      list_id: "lst_rt_kitchen",
      status: "suggested",
      author: routineAuthor,
      title: f.title,
      description: guide ? "" : "From a search result, not checked on the store's page.",
      product_url: guide ? null : f.url,
      links: guide ? [f.url] : undefined,
      kind: guide ? "guide" : undefined,
      buy_url: null,
      image_url: f.image,
      retailer: guide ? "" : new URL(f.url).hostname.replace(/^www\./, ""),
      coupon_code: null,
      deal_starts_at: null,
      deal_ends_at: null,
      created_at: at(6 * DAY),
      updated_at: at(6 * DAY),
      promoted_by: null,
      promoted_at: null,
    });
  }
  // The kettle as the owner's test describes it (SPEC 20.14 item 13): two products, one held guide (above), one kept
  // guide and two comments.
  const kept = (id: string, title: string, url: string, guide: boolean, by: ActorRef, ago: number) =>
    s.entries.push({
      id,
      item_id: "itm_rt_kettle",
      list_id: "lst_rt_kitchen",
      status: "listed",
      author: guide ? routineAuthor : by,
      title,
      description: "",
      product_url: guide ? null : url,
      links: guide ? [url] : undefined,
      kind: guide ? "guide" : undefined,
      buy_url: null,
      image_url: null,
      retailer: guide ? "" : new URL(url).hostname.replace(/^www\./, ""),
      coupon_code: null,
      deal_starts_at: null,
      deal_ends_at: null,
      created_at: at(ago),
      updated_at: at(ago),
      promoted_by: guide ? sam : null,
      promoted_at: guide ? at(ago - HOUR) : null,
    });
  kept("ent_rt_p1", "Fellow Corvo EKG electric kettle", "https://fellowproducts.com/products/corvo-ekg", false, claude, 4 * DAY);
  kept("ent_rt_p2", "Cosori gooseneck electric kettle", "https://www.amazon.com/dp/B07T1CH2HH", false, claude, 4 * DAY);
  kept("ent_rt_g1", "The 8 Best Electric Kettles of 2026", "https://www.seriouseats.com/best-electric-kettles-2026", true, sam, 3 * DAY);
  s.comments.push(
    { id: "cmt_rt_1", list_id: "lst_rt_kitchen", target_type: "item", target_id: "itm_rt_kettle", url: "https://wantmcp.com/l/lst_rt_kitchen#cmt_rt_1", author: sam, body: "The Corvo is lovely but loud.", created_at: at(2 * DAY) },
    { id: "cmt_rt_2", list_id: "lst_rt_kitchen", target_type: "item", target_id: "itm_rt_kettle", url: "https://wantmcp.com/l/lst_rt_kitchen#cmt_rt_2", author: me, body: "Under $100 please.", created_at: at(DAY) },
  );
  // A public list for guides as notes, seen by a writer and by a visitor (SPEC 20.14 item 13): one want with two
  // products, one held guide, one kept guide and two comments.
  s.lists.push({ id: "lst_rt_coffee", title: "Coffee corner", description: "", owner_id: "usr_rt", allow_outside_suggestions: false, format: "shopping", visibility: "public", created_at: at(9 * DAY), updated_at: at(HOUR) });
  s.members.push({ id: "mem_coffee_me", list_id: "lst_rt_coffee", user_id: "usr_rt", invited_email: null, role: "owner", status: "active", token: null, created_at: at(9 * DAY) });
  s.items.push({ id: "itm_rt_grinder", list_id: "lst_rt_coffee", text: "A burr coffee grinder", created_by: me, created_at: at(8 * DAY), purchase: null });
  const coffee = (id: string, title: string, url: string, guide: boolean, status: "listed" | "suggested", ago: number) =>
    s.entries.push({
      id,
      item_id: "itm_rt_grinder",
      list_id: "lst_rt_coffee",
      status,
      author: guide ? routineAuthor : claude,
      title,
      description: "",
      product_url: guide ? null : url,
      links: guide ? [url] : undefined,
      kind: guide ? "guide" : undefined,
      buy_url: null,
      image_url: null,
      retailer: guide ? "" : new URL(url).hostname.replace(/^www\./, ""),
      coupon_code: null,
      deal_starts_at: null,
      deal_ends_at: null,
      created_at: at(ago),
      updated_at: at(ago),
      promoted_by: guide && status === "listed" ? sam : null,
      promoted_at: guide && status === "listed" ? at(ago - HOUR) : null,
    });
  coffee("ent_cf_p1", "Baratza Encore ESP burr grinder", "https://www.baratza.com/encore-esp", false, "listed", 5 * DAY);
  coffee("ent_cf_p2", "Fellow Opus conical burr grinder", "https://fellowproducts.com/products/opus", false, "listed", 5 * DAY);
  coffee("ent_cf_g1", "The 6 Best Coffee Grinders of 2026", "https://www.seriouseats.com/best-coffee-grinders", true, "listed", 3 * DAY);
  coffee("ent_cf_g2", "How to choose a burr grinder", "https://www.homegrounds.co/burr-grinder-guide", true, "suggested", DAY);
  s.comments.push(
    { id: "cmt_cf_1", list_id: "lst_rt_coffee", target_type: "item", target_id: "itm_rt_grinder", url: "https://wantmcp.com/l/lst_rt_coffee#cmt_cf_1", author: me, body: "Something quiet for mornings.", created_at: at(2 * DAY) },
    { id: "cmt_cf_2", list_id: "lst_rt_coffee", target_type: "item", target_id: "itm_rt_grinder", url: "https://wantmcp.com/l/lst_rt_coffee#cmt_cf_2", author: claude, body: "Both grind fine enough for espresso.", created_at: at(DAY) },
  );
  // A stranger's suggestion on the same list, for the two treatments side by side: text only, link not clickable.
  s.entries.push({
    id: "ent_rt_stranger",
    item_id: "itm_rt_kettle",
    list_id: "lst_rt_kitchen",
    status: "suggested",
    author: { kind: "outside", name: "DealFinder" },
    title: "Gooseneck kettle, 40% off today",
    description: "Limited offer.",
    product_url: "https://deals.example.net/kettle?aff=123",
    buy_url: null,
    image_url: "https://deals.example.net/kettle.jpg",
    retailer: "deals.example.net",
    coupon_code: null,
    deal_starts_at: null,
    deal_ends_at: null,
    created_at: at(5 * DAY),
    updated_at: at(5 * DAY),
    promoted_by: null,
    promoted_at: null,
  });
  rs.changes.push(
    { id: "rch_kitchen_made", routine_id: "rtn_kitchen", at: at(14 * DAY), by: me, by_user_id: "usr_rt", change: "created", before: null, person_asked: null },
    { id: "rch_ana_made", routine_id: "rtn_ana", at: at(3 * DAY), by: sam, by_user_id: "usr_rt_sam", change: "created", before: null, person_asked: null },
    { id: "rch_garden_made", routine_id: "rtn_garden", at: at(DAY), by: claude, by_user_id: "usr_rt", change: "created", before: null, person_asked: "look for someone to trim the hedge every other Monday" },
  );
  rs.keys.push(
    { user_id: "usr_rt", last4: "7f3a", status: "ok", status_at: at(14 * DAY), monthly_cap: 100, used: 12 },
    { user_id: "usr_rt_sam", last4: "k29q", status: "out_of_credit", status_at: at(5 * HOUR), monthly_cap: 100, used: 40 },
  );
  // SPEC 26.20 item 4: due-date reminders on Garden jobs, followed by email, with one address that said yes and one
  // still asked; the ask's and the stop's links for the signed-out pages; and the routine email's "Stop emailing me".
  rs.routines.push({
    id: "rtn_garden_due", list_id: "lst_rt_garden", kind: "due_reminders", item_id: null, settings: { lead_days: [1, 7], overdue: "once" }, start: "date",
    name: "Remind me before things are due", name_by: "server", schedule: null, paused: null, blocked: null, key_user_id: null, next_run_at: null,
    created: { by: me, at: at(6 * DAY) }, changed: { by: me, at: at(6 * DAY) }, run_now_day: "", run_now_count: 0, deleted_at: null, stopped_items: [],
  });
  rs.follows.set("rtn_garden_due", new Map([["usr_rt", { routine_id: "rtn_garden_due", email: true, at_once: false }]]));
  rs.recipients.push(
    { id: "rcp_seed_mum", routine_id: "rtn_garden_due", added_by: "usr_rt", email: "mum@example.com", key: "mum@example.com", show_list: false, state: "yes", since: at(4 * DAY), asked_on: at(5 * DAY).slice(0, 10), token: "rcpmockyes0000000000000000" },
    { id: "rcp_seed_neighbour", routine_id: "rtn_garden_due", added_by: "usr_rt", email: "neighbour@example.com", key: "neighbour@example.com", show_list: true, state: "asked", since: at(DAY), asked_on: at(DAY).slice(0, 10), token: "rcpmockasked00000000000000" },
  );
  rs.emailStops.set("resmockgarden0000000000000", { routine_id: "rtn_garden_due", user_id: "usr_rt" });
  // SPEC 26.21: two saved URLs, one working and one that stopped answering, used by a routine on Kitchen it blocked.
  rs.endpoints.push(
    { id: "rep_seed_n8n", user_id: "usr_rt", name: "My n8n", url: "https://hooks.n8n.example/webhook/abc", state: "ok", verified_at: at(3 * DAY), last_ok_at: at(2 * HOUR), last_fail_at: null, last_problem: null, deleted_at: null },
    { id: "rep_seed_old", user_id: "usr_rt", name: "Old server", url: "https://old.example.net/hook", state: "failing", verified_at: at(9 * DAY), last_ok_at: at(4 * DAY), last_fail_at: at(DAY), last_problem: "The URL did not answer within 10 seconds.", deleted_at: null },
  );
  rs.routines.push({
    id: "rtn_kitchen_url", list_id: "lst_rt_kitchen", kind: "list_changes", item_id: null,
    settings: { endpoint_id: "rep_seed_old", types: ["item.created", "price.posted"], content: "ids" }, start: "event",
    name: "Send this list's changes to a URL", name_by: "server", schedule: null, paused: null, blocked: { reason: "url_failing", at: at(DAY) },
    key_user_id: "usr_rt", next_run_at: null, created: { by: me, at: at(8 * DAY) }, changed: { by: me, at: at(8 * DAY) },
    run_now_day: "", run_now_count: 0, deleted_at: null, stopped_items: [],
  });
  rs.asks.set("ask_seed_kitchen", { routine_id: "rtn_kitchen", used: null });
  rs.asks.set("ask_seed_garden", { routine_id: "rtn_garden", used: null });
}
