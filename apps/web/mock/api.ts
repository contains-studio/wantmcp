/**
 * A mock of the Want MCP REST API (https://api.wantmcp.com/v1), in memory.
 *
 * Same routes and JSON shapes as the real API, enough to run and develop the web app
 * without a backend. It is not a reference implementation: validation is light and
 * there is no rate limiting.
 *
 *   handleMockRequest(new Request("http://mock/v1/feed"))
 *
 * Sign-in: any email, code 123456.
 */
import type {
  ActivityEvent, ActorRef, AgentInfo, ClaimPreview, Skill, HandoverResult, ListWithSummary, UnclaimedListResult, Comment, Entry, EntryInput, EventType, FeedEntry, Item, ItemStatus, ListDetail, ListFormat, ListSummary, ListVisibility,
  ItemSummary, ListSummaryPage, Member, OpenQuestionsPage, Page, PriceInput, PriceObservation, PriceSource, PurchaseInput, Question, UserSelf, WantEvent,
} from "../app/lib/types.ts";
import { HANDOVER_TTL_DAYS, UNCLAIMED_TTL_HOURS } from "../app/lib/claims.ts";
import { seedStore } from "./seed.ts";
import { emptyRoutineStore, registerRoutineRoutes, routinesFor, scheduleText, type RoutineStore } from "./routines.ts";
import { seedRoutines } from "./seed-routines.ts";
import { newId, randomToken, type AgentRow, type ClaimRow, type SkillRow, type EntryRow, type ItemRow, type ListRow, type Store, type UserRow } from "./store.ts";

export const MOCK_LOGIN_CODE = "123456";
const WEB = "https://wantmcp.com";
const PAGE_SIZE = 20;

// Seeded on the first request, not at import: in a Worker, Date.now() is frozen at 0
// during global-scope evaluation, which would date all seed data to 1970.
let store: Store = undefined as unknown as Store;
/** SPEC 20: routines and what goes with them (mock/routines.ts). Reset with the store. */
let routineStore: RoutineStore = emptyRoutineStore();
function seedAll() {
  store = seedStore();
  routineStore = emptyRoutineStore();
  seedRoutines(store, routineStore);
}

/** Reset to the seed data (used by tests and `POST /__reset`). */
export function resetMockStore() {
  seedAll();
}

// ---------- helpers

class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const notFound = (what = "Not found") => new HttpError(404, "not_found", what);
const forbidden = (what = "You can't do that on this list") => new HttpError(403, "forbidden", what);
const unauthorized = () => new HttpError(401, "unauthorized", "Sign in first");
const invalid = (what: string) => new HttpError(400, "invalid", what);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

type Caller =
  | { kind: "user"; user: UserRow }
  | { kind: "agent"; agent: AgentRow; user: UserRow }
  | null;

function resolveCaller(req: Request): Caller {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return null;
  const token = m[1].trim();
  if (token.startsWith("wk_")) {
    const agent = store.agents.find((a) => a.key === token);
    if (!agent) return null;
    agent.last_used_at = nowIso();
    return { kind: "agent", agent, user: userById(agent.owner_id) };
  }
  const uid = store.sessions.get(token);
  // A bearer the API doesn't know is a bad credential (401), as on the server, not an anonymous caller.
  if (!uid) throw unauthorized();
  const user = store.users.find((u) => u.id === uid);
  return user ? { kind: "user", user } : null;
}

function userById(id: string): UserRow {
  const u = store.users.find((x) => x.id === id);
  if (!u) throw notFound("User not found");
  return u;
}

function actorRef(c: NonNullable<Caller>): ActorRef {
  if (c.kind === "agent") return { kind: "agent", agent_id: c.agent.id, name: c.agent.name, owner_handle: c.user.handle };
  return { kind: "user", handle: c.user.handle };
}

function sameActor(a: ActorRef, c: NonNullable<Caller>): boolean {
  if (c.kind === "agent") return a.kind === "agent" && a.agent_id === c.agent.id;
  return a.kind === "user" && a.handle === c.user.handle;
}

/** Content counts as the caller's own if they posted it, or one of their agents did. */
function ownsContent(a: ActorRef, c: NonNullable<Caller>): boolean {
  if (sameActor(a, c)) return true;
  return c.kind === "user" && a.kind === "agent" && a.owner_handle === c.user.handle;
}

function requireAuthorOrOwner(a: ActorRef, c: NonNullable<Caller>, listId: string, what: string) {
  if (!ownsContent(a, c) && roleOf(c, listId) !== "owner") throw forbidden(`Only whoever posted this ${what}, or the list owner, can change it`);
}

function getList(id: string): ListRow {
  const l = store.lists.find((x) => x.id === id);
  if (!l) throw notFound("List not found");
  return l;
}

function roleOf(c: Caller, listId: string): "owner" | "member" | null {
  if (!c) return null;
  const m = store.members.find((x) => x.list_id === listId && x.user_id === c.user.id && x.status === "active");
  return m ? m.role : null;
}

function canWrite(c: Caller, listId: string): boolean {
  if (!c) return false;
  if (c.kind === "agent") return c.agent.list_ids.includes(listId) && roleOf(c, listId) !== null;
  return roleOf(c, listId) !== null;
}

function requireWriter(c: Caller, listId: string): NonNullable<Caller> {
  if (!c) {
    if (!isPublic(listId)) throw notFound("Not found");
    throw unauthorized();
  }
  if (!canWrite(c, listId)) {
    if (!isPublic(listId)) throw notFound("Not found");
    throw forbidden();
  }
  return c;
}

function requireSession(c: Caller): { kind: "user"; user: UserRow } {
  if (!c) throw unauthorized();
  if (c.kind !== "user") throw forbidden("This needs a signed-in person, not an agent");
  return c;
}

function requireOwner(c: Caller, listId: string) {
  const s = requireSession(c);
  if (roleOf(s, listId) !== "owner") throw forbidden("Only the list owner can do that");
  return s;
}

function touch(listId: string) {
  const l = store.lists.find((x) => x.id === listId);
  if (l) l.updated_at = nowIso();
}

function emit(type: EventType, listId: string, actor: ActorRef, url: string, extra: Partial<WantEvent> = {}) {
  const seq = (store.events.at(-1)?.seq ?? 0) + 1;
  store.events.push({ seq, type, list_id: listId, created_at: nowIso(), url, actor, ...extra });
}

function paginate<T>(rows: T[], cursor: string | null): Page<T> {
  const start = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
  const data = rows.slice(start, start + PAGE_SIZE);
  return { data, next_cursor: start + PAGE_SIZE < rows.length ? String(start + PAGE_SIZE) : null };
}

function checkUrl(field: string, v: unknown, required = false): string | null {
  if (v == null || v === "") {
    if (required) throw invalid(`${field} is required`);
    return null;
  }
  if (typeof v !== "string" || v.length > 2048) throw invalid(`${field} is not a valid link`);
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw invalid(`${field} is not a valid link`);
  }
  if (u.protocol !== "https:") throw invalid(`${field} must be https`);
  if (/^[\d.]+$/.test(u.hostname) || u.hostname.includes(":")) throw invalid(`${field} can't be an IP address`);
  return v;
}

function text(field: string, v: unknown, max: number, required = false): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw invalid(`${field} is required`);
  if (s.length > max) throw invalid(`${field} is too long (max ${max})`);
  return s;
}

function timestamp(field: string, v: unknown): string | null {
  if (v == null || v === "") return null;
  const t = Date.parse(String(v));
  if (!Number.isFinite(t)) throw invalid(`${field} must be an ISO 8601 timestamp`);
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function listFormat(v: unknown): ListFormat {
  if (v === "shopping" || v === "tasks" || v === "research") return v;
  throw invalid("format must be shopping, tasks or research");
}
function listVisibility(v: unknown): ListVisibility {
  if (v === "public" || v === "private") return v;
  throw invalid("visibility must be public or private");
}
function timestampOrNull(field: string, v: unknown): string | null {
  if (v == null || v === "") return null;
  const t = Date.parse(String(v));
  if (!Number.isFinite(t)) throw invalid(`${field} must be an ISO 8601 timestamp`);
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** A theme slug, or null. The mock stores any well-formed slug; the web app falls back for unknown ones. */
function themeSlug(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v);
  if (!/^[a-z0-9-]{1,40}$/.test(s)) throw invalid("theme must be a slug like black-friday");
  return s;
}

function decimal(field: string, v: unknown, required = false): string | null {
  if (v == null || v === "") {
    if (required) throw invalid(`${field} is required`);
    return null;
  }
  const s = String(v).trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) throw invalid(`${field} must be a decimal like 499.99`);
  return Number(s).toFixed(2);
}

// ---------- serializers

const fmt = (l: ListRow): ListFormat => l.format ?? "shopping";
const vis = (l: ListRow): ListVisibility => l.visibility ?? "public";

/**
 * SPEC 11.2: a private list is readable only by its writers. Everyone else gets not_found,
 * never forbidden, so its existence is not revealed.
 */
function readableList(id: string, c: Caller): ListRow {
  const l = getList(id);
  if (vis(l) === "private" && !canWrite(c, l.id)) throw notFound("List not found");
  return l;
}
const isPublic = (listId: string) => {
  const l = store.lists.find((x) => x.id === listId);
  return !!l && vis(l) === "public";
};

function listSummary(l: ListRow, c: Caller): ListSummary {
  const owner = userById(l.owner_id);
  const out: ListSummary = {
    id: l.id,
    url: `${WEB}/l/${l.id}`,
    title: l.title,
    description: l.description,
    owner_handle: owner.handle,
    // An outsider's item counts once a writer accepts it (SPEC 16.2), as on the server.
    item_count: store.items.filter((i) => i.list_id === l.id && !i.pending_review).length,
    // The real number for writers only; 0 for everyone else, so readers can't tell any exist.
    awaiting_review: canWrite(c, l.id) ? store.items.filter((i) => i.list_id === l.id && i.pending_review).length : 0,
    allow_outside_suggestions: l.allow_outside_suggestions,
    theme: l.theme ?? null,
    format: fmt(l),
    visibility: vis(l),
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
  if (c) out.my_role = roleOf(c, l.id);
  // SPEC 12.2: the note is for writers only.
  if (canWrite(c, l.id)) out.note = l.note ?? "";
  // SPEC 13.7: who has access, for writers only.
  out.access = canWrite(c, l.id) ? accessCounts(l.id) : null;
  // SPEC 13.1
  const pending = store.claims.find((x) => x.list_id === l.id && x.kind === "unclaimed" && !x.used_by);
  out.claim = pending ? { state: "unclaimed", expires_at: pending.expires_at } : null;
  // SPEC 20.10: the list's routines, for writers who can see routines; absent for everyone else (as an older build).
  if (c && routinesFor(c.user.email)?.visible) {
    out.routines = canWrite(c, l.id)
      ? routineStore.routines
          .filter((r) => r.list_id === l.id && !r.deleted_at)
          .map((r) => ({ id: r.id, name: r.name, name_by: r.name_by, kind: r.kind, schedule_text: scheduleText(r.schedule), paused: !!r.paused, blocked_reason: r.blocked?.reason ?? null, key_holder: r.key_user_id ? { handle: userById(r.key_user_id).handle } : null }))
      : null;
  }
  return out;
}

/** GET /me/lists?include=summary: the caller's lists, most recently active first, each with what /app shows. */
function listsWithSummary(c: NonNullable<Caller>): ListWithSummary[] {
  const isMe = (a: ActorRef) => a.kind === "user" && c.kind === "user" && a.handle === c.user.handle;
  return store.lists
    .filter((l) => canWrite(c, l.id))
    .map((l) => {
      // "Live items": held outsiders' items (SPEC 16.2) are not counted, as on the server.
      const items = store.items.filter((i) => i.list_id === l.id && !i.pending_review);
      const ids = new Set(items.map((i) => i.id));
      const shopping = fmt(l) === "shopping";
      const done = items.filter((i) => (shopping ? !!i.purchase : i.status === "done")).length;
      const waiting = store.questions.filter((q) => ids.has(q.item_id) && !q.answer && !isMe(q.asked_by)).length;
      const entries = store.entries.filter((e) => ids.has(e.item_id) && e.status === "listed" && !isMe(e.author)).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const e = entries[0];
      const price = e ? pricesFor(e.id).at(-1) : undefined;
      const noted = items.filter((i) => i.status_note && i.claimed_by && i.status !== "done").sort((a, b) => (b.status_note_at ?? "").localeCompare(a.status_note_at ?? ""))[0];
      return {
        ...listSummary(l, c),
        summary: {
          items: items.length,
          done,
          waiting,
          // SPEC 16.2: the caller writes these lists, so the real number.
          awaiting_review: store.items.filter((i) => i.list_id === l.id && i.pending_review).length,
          latest: e
            ? { actor: e.author, kind: "entry" as const, title: e.title, ...(price ? { price: { amount: price.price, currency: price.currency } } : {}), at: e.created_at, anchor: e.item_id }
            : null,
          note: noted
            ? { actor: noted.claimed_by!, text: noted.status_note!, item: { id: noted.id, text: noted.text }, at: noted.status_note_at ?? noted.claimed_at ?? l.updated_at, anchor: noted.id }
            : null,
        },
      };
    })
    .sort((a, b) => [b.updated_at, b.summary.latest?.at ?? ""].sort().at(-1)!.localeCompare([a.updated_at, a.summary.latest?.at ?? ""].sort().at(-1)!));
}

function accessCounts(listId: string) {
  const active = store.members.filter((m) => m.list_id === listId && m.status === "active" && m.user_id);
  const people = active.filter((m) => !userById(m.user_id!).placeholder).length;
  const writers = new Set(active.map((m) => m.user_id));
  const agents = store.agents.filter((a) => writers.has(a.owner_id) && a.list_ids.includes(listId)).length;
  const pending_invites = store.members.filter((m) => m.list_id === listId && m.status === "invited").length;
  return { people, agents, pending_invites };
}

function pricesFor(entryId: string): PriceObservation[] {
  // SPEC 12.5: older prices have no source and count as checked when posted.
  return store.prices
    .filter((p) => p.entry_id === entryId)
    .sort((a, b) => a.posted_at.localeCompare(b.posted_at))
    .map((p) => {
      const source: PriceSource = p.source ?? "unknown";
      return { ...p, source, source_url: p.source_url ?? null, checked_at: p.checked_at ?? p.posted_at, in_stock: p.in_stock ?? null, verified: source === "retailer_page" };
    });
}

function entryOut(e: EntryRow): Entry {
  const prices = pricesFor(e.id);
  return {
    id: e.id,
    item_id: e.item_id,
    list_id: e.list_id,
    url: `${WEB}/l/${e.list_id}#${e.id}`,
    status: e.status === "suggested" ? "suggested" : "listed",
    author: e.author,
    title: e.title,
    description: e.description,
    product_url: e.product_url,
    kind: e.kind ?? "product",
    links: e.links ?? [],
    buy_url: e.buy_url,
    image_url: e.image_url,
    retailer: e.retailer,
    coupon_code: e.coupon_code,
    deal_starts_at: e.deal_starts_at,
    deal_ends_at: e.deal_ends_at,
    current_price: prices.at(-1) ?? null,
    price_count: prices.length,
    comment_count: store.comments.filter((x) => x.target_type === "entry" && x.target_id === e.id).length,
    created_at: e.created_at,
    updated_at: e.updated_at,
    promoted_by: e.promoted_by,
    promoted_at: e.promoted_at,
  };
}

function openQuestion(itemId: string): Question | null {
  return store.questions.find((q) => q.item_id === itemId && !q.answer) ?? null;
}

function itemOut(i: ItemRow, c: Caller): Item {
  const entries = store.entries.filter((e) => e.item_id === i.id);
  const writer = canWrite(c, i.list_id);
  return {
    id: i.id,
    list_id: i.list_id,
    url: `${WEB}/l/${i.list_id}#${i.id}`,
    text: i.text,
    created_by: i.created_by,
    created_at: i.created_at,
    purchase: i.purchase,
    details: i.details ?? "",
    due_at: i.due_at ?? null,
    // SPEC 12.1: an item with an unanswered question is waiting on its owner (derived, as on the server).
    status: openQuestion(i.id) ? "waiting_on_owner" : (i.status ?? (i.purchase ? "done" : "open")),
    open_question: writer ? openQuestion(i.id) : null,
    ...(writer ? { questions: store.questions.filter((q) => q.item_id === i.id).sort((a, b) => a.asked_at.localeCompare(b.asked_at)) } : {}),
    claimed_by: i.claimed_by ?? null,
    claimed_at: i.claimed_by ? (i.claimed_at ?? null) : null,
    status_note: i.status_note ?? null,
    status_note_at: i.status_note ? (i.status_note_at ?? i.claimed_at ?? null) : null,
    text_by: i.text_by ?? (i.created_by.kind === "agent" ? "agent" : "person"),
    pending_review: !!i.pending_review,
    completion:
      i.completion ??
      (i.purchase ? { completed_at: i.purchase.purchased_at, completed_by: i.purchase.purchased_by, note: null, entry_id: i.purchase.entry_id } : null),
    entry_counts: {
      listed: entries.filter((e) => e.status === "listed").length,
      suggested: writer ? entries.filter((e) => e.status === "suggested").length : 0,
    },
    comment_count: store.comments.filter((x) => x.target_type === "item" && x.target_id === i.id).length,
    // SPEC 20.14: routines that stopped looking for this want, for writers who can see routines.
    ...(writer && c && routinesFor(c.user.email)?.visible
      ? { routine_stops: routineStore.routines.filter((r) => !r.deleted_at && r.stopped_items.includes(i.id)).map((r) => ({ routine_id: r.id, routine_name: r.name, name_by: r.name_by })) }
      : {}),
  };
}

function visibleEntries(itemId: string, c: Caller, includeSuggested: boolean): EntryRow[] {
  const item = store.items.find((i) => i.id === itemId);
  const writer = item ? canWrite(c, item.list_id) : false;
  return store.entries
    .filter((e) => e.item_id === itemId)
    .filter((e) => e.status === "listed" || (e.status === "suggested" && includeSuggested && writer))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function feedRow(e: EntryRow): FeedEntry {
  const item = store.items.find((i) => i.id === e.item_id)!;
  const l = getList(e.list_id);
  return {
    entry: entryOut(e),
    item: { id: item.id, url: `${WEB}/l/${l.id}#${item.id}`, text: item.text, purchase: item.purchase },
    list: { id: l.id, url: `${WEB}/l/${l.id}`, title: l.title, owner_handle: userById(l.owner_id).handle, theme: l.theme ?? null },
  };
}

function memberOut(m: (typeof store.members)[number], asOwner: boolean): Member {
  const out: Member = {
    id: m.id,
    role: m.role,
    status: m.status,
    handle: m.user_id ? userById(m.user_id).handle : null,
    created_at: m.created_at,
  };
  if (asOwner) out.invited_email = m.invited_email;
  return out;
}

function agentOut(a: AgentRow): AgentInfo {
  return {
    id: a.id,
    name: a.name,
    kind: a.kind,
    key_prefix: a.key ? a.key.slice(0, 7) : null,
    list_ids: a.list_ids,
    scope: a.scope ?? (a.kind === "account" ? "all" : "lists"),
    owner_handle: userById(a.owner_id).handle,
    created_at: a.created_at,
    last_used_at: a.last_used_at,
  };
}

function userSelf(u: UserRow): UserSelf {
  return {
    id: u.id, email: u.email, handle: u.handle, updates_opt_in: u.updates_opt_in,
    bio: u.bio ?? "", country: u.country ?? null, currency: u.currency ?? null, created_at: u.created_at,
    // SPEC 20.14: absent until routines are visible for this person (mock rule in mock/routines.ts).
    ...(routinesFor(u.email) ? { time_zone: u.time_zone ?? null, routines: routinesFor(u.email) } : {}),
  };
}

const ADJ = ["quiet", "brave", "amber", "lucky", "misty", "swift", "gentle", "bold", "sunny", "velvet"];
const ANIMALS = ["otter", "heron", "lynx", "badger", "wren", "fox", "puffin", "marten", "hare", "newt"];
function newHandle() {
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
  return `${pick(ADJ)}-${pick(ANIMALS)}-${1000 + Math.floor(Math.random() * 9000)}`;
}

// ---------- routes

type Ctx = { req: Request; url: URL; caller: Caller; params: string[]; body: Record<string, unknown> };
type Handler = (ctx: Ctx) => unknown | Promise<unknown>;
class Created {
  value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
}
const created = (v: unknown) => new Created(v);
const routes: Array<[method: string, pattern: RegExp, handler: Handler]> = [];
const route = (method: string, path: string, handler: Handler) =>
  routes.push([method, new RegExp("^" + path.replace(/\{[a-z_]+\}/g, "([^/]+)") + "$"), handler]);

const NO_CONTENT = Symbol("no content");

// auth
route("POST", "/auth/code", ({ body }) => {
  const email = text("email", body.email, 254, true).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalid("email is not valid"); // the server's own words; the web says them plainly
  // Lets contributors see the "email could not be sent" state.
  if (email === "fail@example.com") {
    throw new HttpError(503, "email_unavailable", "We couldn't send your sign-in email right now. Please try again in a few minutes.");
  }
  // Lets contributors see the rate-limit message.
  if (email === "slow@example.com") throw new HttpError(429, "rate_limited", "Too many codes for this address", { retry_after: 300 });
  const attemptId = "att_" + randomToken(24);
  store.codes.set(email, { code: MOCK_LOGIN_CODE, attempts: 0, expires: Date.now() + 10 * 60_000, attempt_id: attemptId });
  console.log(`[mock api] login code for ${email}: ${MOCK_LOGIN_CODE}`);
  return new Response(JSON.stringify({ attempt_id: attemptId }), { status: 200, headers: { "content-type": "application/json", "x-dev-login-code": MOCK_LOGIN_CODE } });
});

route("POST", "/auth/verify", ({ body }) => {
  const email = text("email", body.email, 254, true).toLowerCase();
  const code = text("code", body.code, 12, true);
  const rec = store.codes.get(email);
  if (!rec || rec.expires < Date.now()) throw invalid("That code has expired. Ask for a new one.");
  rec.attempts += 1;
  if (rec.attempts > 5) throw new HttpError(429, "rate_limited", "Too many attempts. Ask for a new code.");
  if (code !== rec.code) throw invalid("That code isn't right");
  // The attempt from POST /auth/code; a verify without it is still accepted during the transition.
  if (body.attempt_id !== undefined && body.attempt_id !== rec.attempt_id) throw invalid("That code is for another sign-in. Ask for a new one.");
  store.codes.delete(email);
  // As the API: the choice applies only to the account this call creates; an existing account's is never changed here.
  let user = store.users.find((u) => u.email === email);
  const created = !user;
  if (!user) {
    const src = typeof body.src === "string" && /^[a-z0-9_.-]{1,64}$/.test(body.src) ? body.src : null;
    user = { id: newId("usr"), email, handle: newHandle(), updates_opt_in: body.updates_opt_in === true, created_at: nowIso(), signup_src: src };
    store.users.push(user);
  }
  const token = "mock_sess_" + randomToken(32);
  store.sessions.set(token, user.id);
  return { token, user: userSelf(user), created };
});

route("POST", "/auth/logout", ({ req, caller }) => {
  requireSession(caller);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  store.sessions.delete(token);
  return NO_CONTENT;
});

// me
route("GET", "/me", ({ caller }) => userSelf(requireSession(caller).user));
route("PATCH", "/me", ({ caller, body }) => {
  const { user } = requireSession(caller);
  if (body.handle !== undefined) {
    const h = text("handle", body.handle, 40, true).toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(h)) throw invalid("Handles are 3 to 40 letters, numbers and dashes");
    if (store.users.some((u) => u.handle === h && u.id !== user.id)) throw new HttpError(409, "conflict", "That handle is taken");
    user.handle = h;
  }
  if (typeof body.updates_opt_in === "boolean") user.updates_opt_in = body.updates_opt_in;
  // SPEC 20.4: an IANA zone for new routines, set on the web.
  if (body.time_zone !== undefined && routinesFor(user.email)) {
    const tz = String(body.time_zone);
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
    } catch {
      throw invalid("time_zone must be an IANA time zone like Europe/London");
    }
    user.time_zone = tz;
  }
  // SPEC 12.2
  if (body.bio !== undefined) user.bio = text("bio", body.bio, 600);
  if (body.country !== undefined) {
    const v = body.country == null || body.country === "" ? null : String(body.country).toUpperCase();
    if (v !== null && (!/^[A-Z]{2}$/.test(v) || v === "UK")) throw invalid(v === "UK" ? "country: use GB for the United Kingdom" : "country must be a two-letter ISO code like GB");
    user.country = v;
  }
  if (body.currency !== undefined) {
    const v = body.currency == null || body.currency === "" ? null : String(body.currency).toUpperCase();
    if (v !== null && !/^[A-Z]{3}$/.test(v)) throw invalid("currency must be a three-letter ISO code like USD");
    user.currency = v;
  }
  return userSelf(user);
});
route("DELETE", "/me", ({ caller }) => {
  const { user } = requireSession(caller);
  store.users = store.users.filter((u) => u.id !== user.id);
  for (const [t, uid] of store.sessions) if (uid === user.id) store.sessions.delete(t);
  return userSelf(user);
});

route("GET", "/whoami", ({ caller }) => {
  if (!caller) throw unauthorized();
  return actorRef(caller);
});

route("GET", "/me/invites", ({ caller }) => {
  const c = requireSession(caller);
  return store.members
    .filter((m) => m.status === "invited" && m.invited_email === c.user.email)
    .filter((m) => !store.members.some((x) => x.list_id === m.list_id && x.user_id === c.user.id && x.status === "active"))
    .map((m) => {
      const l = getList(m.list_id);
      return { list: { id: l.id, title: l.title, owner_handle: userById(l.owner_id).handle }, invited_at: m.created_at };
    });
});

route("POST", "/me/invites/{list_id}/accept", ({ caller, params }) => {
  const c = requireSession(caller);
  const m = store.members.find((x) => x.list_id === params[0] && x.status === "invited" && x.invited_email === c.user.email);
  if (!m) throw notFound("No pending invite for this list");
  m.user_id = c.user.id;
  m.status = "active";
  return listSummary(getList(m.list_id), c);
});

route("GET", "/me/lists", ({ caller, url }) => {
  if (!caller) throw unauthorized();
  if (url.searchParams.get("include") === "summary") return { data: listsWithSummary(caller), next_cursor: null };
  return store.lists
    .filter((l) => canWrite(caller, l.id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((l) => listSummary(l, caller));
});

route("GET", "/me/feed", ({ caller, url }) => {
  const c = requireSession(caller);
  const listId = url.searchParams.get("list_id");
  const mine = new Set(store.lists.filter((l) => canWrite(c, l.id)).map((l) => l.id));
  const rows = store.entries
    .filter((e) => mine.has(e.list_id) && (!listId || e.list_id === listId) && e.status !== "rejected")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(feedRow);
  return paginate(rows, url.searchParams.get("cursor"));
});

// GET /me/activity (server 4e7db49): every kind of event on the lists the person writes, theirs included, newest
// first. The mock has no event log for its seed, so it derives the events from what the store holds.
route("GET", "/me/activity", ({ caller, url }) => {
  const c = requireSession(caller);
  const listId = url.searchParams.get("list_id");
  const lists = store.lists.filter((l) => canWrite(c, l.id) && (!listId || l.id === listId));
  const ids = new Set(lists.map((l) => l.id));
  const listOf = (id: string) => {
    const l = store.lists.find((x) => x.id === id)!;
    return { id: l.id, title: l.title };
  };
  const itemOf = (id: string | null | undefined) => {
    const i = id ? store.items.find((x) => x.id === id) : null;
    return i ? { id: i.id, text: i.text } : null;
  };
  const actor = (a: ActorRef): ActivityEvent["actor"] =>
    a.kind === "user" ? { kind: "person", name: a.handle, handle: a.handle } : a.kind === "agent" ? { kind: "agent", name: a.name, handle: a.owner_handle } : { kind: "outsider", name: a.name ?? "An outside agent" };
  const by = (a: ActorRef): ActivityEvent["by"] =>
    a.kind === "user" && a.handle === c.user.handle ? "you" : a.kind === "agent" && a.owner_handle === c.user.handle ? "your_agent" : "other";
  const out: Array<Omit<ActivityEvent, "id">> = [];
  const ev = (type: ActivityEvent["type"], at: string, list: string, item: string | null | undefined, who: ActorRef, text: ActivityEvent["text"]) =>
    out.push({ type, at, list: listOf(list), item: itemOf(item), actor: actor(who), by: by(who), text });
  for (const i of store.items.filter((x) => ids.has(x.list_id))) {
    ev("item.created", i.created_at, i.list_id, i.id, i.created_by, {});
    if (i.purchase) ev("item.purchased", i.purchase.purchased_at, i.list_id, i.id, i.purchase.purchased_by, i.purchase.price ? { price: { amount: i.purchase.price, currency: i.purchase.currency ?? "USD" } } : {});
    if (i.completion) ev("item.status_changed", i.completion.completed_at, i.list_id, i.id, i.completion.completed_by, { status: "done", ...(i.completion.note ? { status_note: i.completion.note } : {}) });
    else if (i.status === "in_progress" && i.claimed_by && i.claimed_at) ev("item.status_changed", i.claimed_at, i.list_id, i.id, i.claimed_by, { status: "in_progress", ...(i.status_note ? { status_note: i.status_note } : {}) });
  }
  for (const e of store.entries.filter((x) => ids.has(x.list_id) && x.status !== "rejected")) {
    const prices = store.prices.filter((p) => p.entry_id === e.id).sort((a, b) => a.posted_at.localeCompare(b.posted_at));
    const first = prices[0];
    ev(e.status === "suggested" ? "entry.suggested" : "entry.listed", e.created_at, e.list_id, e.item_id, e.author, {
      entry_title: e.title,
      ...(first ? { price: { amount: first.price, currency: first.currency, verified: first.verified ?? false } } : {}),
    });
    for (const p of prices.slice(1)) ev("price.posted", p.posted_at, e.list_id, e.item_id, p.posted_by, { entry_title: e.title, price: { amount: p.price, currency: p.currency, verified: p.verified ?? false } });
  }
  for (const cm of store.comments.filter((x) => ids.has(x.list_id))) {
    const item = cm.target_type === "item" ? cm.target_id : store.entries.find((e) => e.id === cm.target_id)?.item_id;
    ev("comment.created", cm.created_at, cm.list_id, item, cm.author, { comment: cm.body.length > 280 ? `${cm.body.slice(0, 277).replace(/\s+\S*$/, "")}…` : cm.body });
  }
  for (const q of store.questions) {
    const i = store.items.find((x) => x.id === q.item_id);
    if (!i || !ids.has(i.list_id)) continue;
    ev("question.asked", q.asked_at, i.list_id, i.id, q.asked_by, { question: q.text, options: q.options });
    if (q.answer) ev("question.answered", q.answer.answered_at, i.list_id, i.id, q.answer.answered_by, { question: q.text, answer: q.answer.text });
  }
  const rows = out.sort((a, b) => b.at.localeCompare(a.at)).map((e, n) => ({ id: String(out.length - n), ...e }));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
  const cursor = url.searchParams.get("cursor");
  const start = cursor ? rows.findIndex((r) => r.id === cursor) + 1 : 0;
  const data = rows.slice(start, start + limit);
  return { data, next_cursor: start + limit < rows.length ? data.at(-1)!.id : null };
});

// SPEC 23: page views from the web Worker (with the proxy secret on the real server), and the owner's traffic report.
const VISIT_PATHS = new Set(["/", "/connect", "/login", "/for", "/for/:slug", "/themes", "/themes/:slug", "/start", "/l/:id", "/l/:id/settings", "/claim", "/claim/:token", "/invite/:token", "/feedback", "/feedback/:id", "/unsubscribe/:token", "/report", "/privacy", "/terms", "/skills", "/search", "/authorize", "/app", "/app/new", "/app/activity", "/app/skills", "/app/account", "/app/traffic", "/app/lists/:id/settings", "/llms.txt", "/agents.txt", "/skill.md", "/developers", "/developers.md", "/connect/key"]);
route("POST", "/internal/visit", ({ body }) => {
  const path = String(body.path ?? "");
  if (!VISIT_PATHS.has(path)) throw invalid("path is not a known page");
  const host = typeof body.ref_host === "string" ? body.ref_host.toLowerCase().replace(/^www\./, "") : "direct";
  // The page counts; our own host is never a source (the server's OWN; localhost in development).
  const own = host === "wantmcp.com" || host === "localhost";
  const tag = typeof body.tag === "string" && /^[a-z0-9_-]{1,32}$/.test(body.tag) ? body.tag : null;
  store.visits.push({ at: nowIso(), path, ref_host: own ? "" : host || "direct", tag, signed_in: body.signed_in === true });
  return new Response(null, { status: 204 });
});
/** Who may read the traffic report (on the server, a configured list; here the demo owner). */
const TRAFFIC_READERS = new Set(["usr_demo"]);
route("GET", "/me/traffic", ({ caller, url }) => {
  const c = requireSession(caller);
  if (!TRAFFIC_READERS.has(c.user.id)) throw notFound("Not found");
  const days = Math.min(30, Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10) || 30));
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const visits = store.visits.filter((v) => Date.parse(v.at) >= since.getTime());
  const signUps = store.users.filter((u) => u.signup_src !== undefined && Date.parse(u.created_at) >= since.getTime());
  const day = (iso: string) => iso.slice(0, 10);
  const per_day = Array.from({ length: days }, (_, i) => {
    const date = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const vs = visits.filter((v) => day(v.at) === date);
    const si = vs.filter((v) => v.signed_in).length;
    return { date, visits: vs.length, signed_in: si, signed_out: vs.length - si, sign_ups: signUps.filter((u) => day(u.created_at) === date).length };
  });
  const top = (key: (v: (typeof visits)[number]) => string | null) => {
    const m = new Map<string, number>();
    for (const v of visits) {
      const k = key(v);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([name, n]) => ({ name, visits: n }));
  };
  const bySrc = new Map<string, number>();
  for (const u of signUps) bySrc.set(u.signup_src ?? "unknown", (bySrc.get(u.signup_src ?? "unknown") ?? 0) + 1);
  const signedIn = visits.filter((v) => v.signed_in).length;
  return {
    days,
    since: since.toISOString(),
    per_day,
    totals: { visits: visits.length, signed_in: signedIn, signed_out: visits.length - signedIn, sign_ups: signUps.length },
    sources: top((v) => v.ref_host || null),
    tags: top((v) => v.tag),
    paths: top((v) => v.path),
    sign_ups_by_source: [...bySrc].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([name, n]) => ({ name, sign_ups: n })),
  };
});

// SPEC 13.6: account keys (ak_) agents made for themselves; the person can see and remove them.
route("GET", "/me/agent-keys", ({ caller }) => {
  const c = requireSession(caller);
  return store.agents.filter((a) => a.owner_id === c.user.id && a.kind === "account").map(agentOut);
});
route("DELETE", "/me/agent-keys/{id}", ({ caller, params }) => {
  const c = requireSession(caller);
  const a = store.agents.find((x) => x.id === params[0] && x.owner_id === c.user.id && x.kind === "account");
  if (!a) throw notFound("Key not found");
  store.agents = store.agents.filter((x) => x !== a);
  return store.agents.filter((x) => x.owner_id === c.user.id && x.kind === "account").map(agentOut);
});

// Feature-email unsubscribe links. Mock: unsub_<anything> is a valid token, once.
const unsubscribed = new Set<string>();
route("GET", "/unsubscribe/{token}", ({ params }) => ({ valid: /^unsub_[a-z0-9_-]{4,60}$/i.test(params[0]), unsubscribed: unsubscribed.has(params[0]) }));
route("POST", "/unsubscribe", ({ body }) => {
  const token = text("token", body.token, 200, true);
  if (!/^unsub_[a-z0-9_-]{4,60}$/i.test(token)) throw notFound("This link doesn't work");
  unsubscribed.add(token);
  return NO_CONTENT;
});

// SPEC 14.2: a person's skills. A web session only: any agent credential is refused, for every route.
const SKILL_LIMIT = 20;
const BUILT_IN_SKILLS = new Set(["shop-a-want-list", "work-a-task-list", "research-a-question-list"]);

function skillSession(caller: Caller) {
  if (!caller) throw unauthorized();
  if (caller.kind !== "user") throw forbidden("Only a signed-in person can change skills.");
  return caller.user;
}

function skillOut(k: SkillRow): Skill {
  // The URI names the skill, never the person (SPEC 14.3); the mock's form is illustrative.
  return { id: k.id, name: k.name, title: k.title, description: k.description, body: k.body, enabled: k.enabled, uri: `skill://${k.name}/SKILL.md`, created_at: k.created_at, updated_at: k.updated_at };
}

function skillName(userId: string, title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56) || "skill";
  const taken = new Set(store.skills.filter((k) => k.user_id === userId).map((k) => k.name));
  let name = base;
  for (let n = 2; taken.has(name) || BUILT_IN_SKILLS.has(name); n++) name = `${base}-${n}`;
  return name;
}

function skillFields(body: Record<string, unknown>, partial: boolean) {
  const out: Partial<Pick<SkillRow, "title" | "description" | "body" | "enabled">> = {};
  if (!partial || body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) throw invalid("title is required");
    if (title.length > 80) throw invalid("title must be at most 80 characters");
    out.title = title;
  }
  if (!partial || body.body !== undefined) {
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) throw invalid("body is required");
    if (text.length > 20000) throw invalid("body must be at most 20000 characters");
    out.body = text;
  }
  if (body.description !== undefined && body.description !== null) {
    const d = String(body.description).trim();
    if (d.length > 300) throw invalid("description must be at most 300 characters");
    out.description = d;
  } else if (!partial) out.description = "";
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") throw invalid("enabled must be true or false");
    out.enabled = body.enabled;
  } else if (!partial) out.enabled = true;
  return out;
}

route("GET", "/me/skills", ({ caller }) => {
  const user = skillSession(caller);
  return { data: store.skills.filter((k) => k.user_id === user.id).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(skillOut) };
});

route("POST", "/me/skills", ({ caller, body }) => {
  const user = skillSession(caller);
  if (store.skills.filter((k) => k.user_id === user.id).length >= SKILL_LIMIT) {
    throw new HttpError(429, "rate_limited", `You have ${SKILL_LIMIT} skills. Delete one to add another.`);
  }
  const f = skillFields(body, false);
  const t = nowIso();
  const k: SkillRow = { id: newId("skl"), user_id: user.id, name: skillName(user.id, f.title!), title: f.title!, description: f.description ?? "", body: f.body!, enabled: f.enabled ?? true, created_at: t, updated_at: t };
  store.skills.push(k);
  return created(skillOut(k));
});

route("PATCH", "/me/skills/{id}", ({ caller, params, body }) => {
  const user = skillSession(caller);
  const k = store.skills.find((x) => x.id === params[0] && x.user_id === user.id);
  if (!k) throw notFound("Skill not found");
  Object.assign(k, skillFields(body, true), { updated_at: nowIso() });
  return skillOut(k);
});

route("DELETE", "/me/skills/{id}", ({ caller, params }) => {
  const user = skillSession(caller);
  const k = store.skills.find((x) => x.id === params[0] && x.user_id === user.id);
  if (!k) throw notFound("Skill not found");
  store.skills = store.skills.filter((x) => x !== k);
  return NO_CONTENT;
});

route("GET", "/me/agents", ({ caller, url }) => {
  const c = requireSession(caller);
  const listId = url.searchParams.get("list_id");
  return store.agents
    .filter((a) => a.owner_id === c.user.id && (!listId || a.list_ids.includes(listId)))
    .map(agentOut);
});

route("DELETE", "/agents/{id}", ({ caller, params, url }) => {
  const c = requireSession(caller);
  const a = store.agents.find((x) => x.id === params[0]);
  const listId = url.searchParams.get("list_id");
  // With list_id: this list only, for the agent's person or the list's owner (as the API does). A key left with no
  // list is revoked.
  if (a && listId && a.list_ids.includes(listId) && (a.owner_id === c.user.id || roleOf(c, listId) === "owner")) {
    a.list_ids = a.list_ids.filter((id) => id !== listId);
    if (a.kind === "key" && a.list_ids.length === 0) store.agents = store.agents.filter((x) => x !== a);
    return store.agents.filter((x) => x.list_ids.includes(listId)).map(agentOut);
  }
  if (!a || a.owner_id !== c.user.id) throw notFound("Agent not found");
  store.agents = store.agents.filter((x) => x !== a);
  return store.agents.filter((x) => x.owner_id === c.user.id).map(agentOut);
});

route("GET", "/lists/{id}/agents", ({ caller, params }) => {
  const c = requireSession(caller);
  const l = getList(params[0]);
  const role = roleOf(c, l.id);
  if (!role) throw forbidden();
  return store.agents
    .filter((a) => a.list_ids.includes(l.id) && (role === "owner" || a.owner_id === c.user.id))
    .map(agentOut);
});

// public feed + lists
route("GET", "/feed", ({ url }) => {
  const rows = store.entries
    .filter((e) => e.status === "listed" && isPublic(e.list_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(feedRow);
  return paginate(rows, url.searchParams.get("cursor"));
});

route("GET", "/lists", ({ url, caller }) => {
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const rows = store.lists
    .filter((l) => vis(l) === "public" && store.items.some((i) => i.list_id === l.id && !i.pending_review))
    .filter((l) => !q || l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((l) => listSummary(l, caller));
  return paginate(rows, url.searchParams.get("cursor"));
});

route("POST", "/lists", ({ caller, body }) => {
  const c = requireSession(caller);
  const title = text("title", body.title, 140, true);
  const description = text("description", body.description, 500);
  const format = listFormat(body.format ?? "shopping");
  const visibility = body.visibility === undefined || body.visibility === null ? (format === "shopping" ? "public" : "private") : listVisibility(body.visibility);
  const t = nowIso();
  const l: ListRow = {
    id: newId("lst"), title, description, owner_id: c.user.id, allow_outside_suggestions: visibility === "public",
    theme: themeSlug(body.theme), format, visibility, note: text("note", body.note, 600), created_at: t, updated_at: t,
  };
  store.lists.push(l);
  store.members.push({ id: newId("mem"), list_id: l.id, user_id: c.user.id, invited_email: null, role: "owner", status: "active", token: null, created_at: t });
  return created(listSummary(l, c));
});

route("GET", "/lists/{id}", ({ caller, params }) => {
  const l = readableList(params[0], caller);
  const writer = canWrite(caller, l.id);
  // SPEC 16.2: an outsider's item no writer has accepted is for writers only.
  const items = store.items.filter((i) => i.list_id === l.id && (writer || !i.pending_review)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!items.length && !writer) throw notFound("List not found");
  const detail: ListDetail = {
    ...listSummary(l, caller),
    items: items.map((i) => ({ ...itemOut(i, caller), entries: visibleEntries(i.id, caller, true).map(entryOut) })),
  };
  return detail;
});

route("PATCH", "/lists/{id}", ({ caller, params, body }) => {
  requireOwner(caller, params[0]);
  const l = getList(params[0]);
  if (body.title !== undefined) l.title = text("title", body.title, 140, true);
  if (body.description !== undefined) l.description = text("description", body.description, 500);
  if (body.note !== undefined) l.note = text("note", body.note, 600);
  if (typeof body.allow_outside_suggestions === "boolean") l.allow_outside_suggestions = body.allow_outside_suggestions;
  if (body.theme !== undefined) l.theme = themeSlug(body.theme);
  if (body.visibility !== undefined) {
    l.visibility = listVisibility(body.visibility);
    // Private lists take no outside suggestions.
    if (l.visibility === "private") l.allow_outside_suggestions = false;
  }
  if (body.format !== undefined) {
    if (store.items.some((i) => i.list_id === l.id)) throw new HttpError(409, "conflict", "The format can only change while the list has no items");
    l.format = listFormat(body.format);
  }
  l.updated_at = nowIso();
  return listSummary(l, caller);
});

route("DELETE", "/lists/{id}", ({ caller, params }) => {
  const c = requireOwner(caller, params[0]);
  const l = getList(params[0]);
  const out = listSummary(l, c);
  const itemIds = new Set(store.items.filter((i) => i.list_id === l.id).map((i) => i.id));
  const entryIds = new Set(store.entries.filter((e) => e.list_id === l.id).map((e) => e.id));
  store.lists = store.lists.filter((x) => x !== l);
  store.items = store.items.filter((i) => !itemIds.has(i.id));
  store.entries = store.entries.filter((e) => !entryIds.has(e.id));
  store.prices = store.prices.filter((p) => !entryIds.has(p.entry_id));
  store.comments = store.comments.filter((x) => x.list_id !== l.id);
  store.members = store.members.filter((m) => m.list_id !== l.id);
  for (const a of store.agents) a.list_ids = a.list_ids.filter((id) => id !== l.id);
  return out;
});

// members
route("GET", "/lists/{id}/members", ({ caller, params }) => {
  const l = getList(params[0]);
  if (!caller || !canWrite(caller, l.id)) throw forbidden();
  const asOwner = roleOf(caller, l.id) === "owner";
  return store.members.filter((m) => m.list_id === l.id).map((m) => memberOut(m, asOwner));
});

route("POST", "/lists/{id}/members", ({ caller, params, body }) => {
  requireOwner(caller, params[0]);
  const email = text("email", body.email, 254, true).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalid("email is not valid"); // the server's own words; the web says them plainly
  const existing = store.members.find((m) => m.list_id === params[0] && (m.invited_email === email || (m.user_id && userById(m.user_id).email === email)));
  if (existing) throw new HttpError(409, "conflict", "That person is already invited");
  const m = { id: newId("mem"), list_id: params[0], user_id: null, invited_email: email, role: "member" as const, status: "invited" as const, token: "inv_" + randomToken(24), created_at: nowIso(), invited_by: actorRef(caller!) };
  store.members.push(m);
  console.log(`[mock api] invite link for ${email}: /invite/${m.token}`);
  return new Response(JSON.stringify(memberOut(m, true)), { status: 201, headers: { "content-type": "application/json", "x-dev-invite-token": m.token } });
});

// SPEC 13.7: invite by email. A second invitation to the same address within a day sends no email (sent: false).
route("POST", "/lists/{id}/invites", ({ caller, params, body }) => {
  // SPEC 21.5: the owner, or one of the owner's own agents (its invitation goes out at once, as the owner's would).
  const c = caller?.kind === "agent" && roleOf({ kind: "user", user: caller.user }, params[0]) === "owner" ? caller : requireOwner(caller, params[0]);
  const email = text("email", body.email, 254, true).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalid("email is not valid"); // the server's own words; the web says them plainly
  if (email === "limit@example.com") throw new HttpError(429, "rate_limited", "Too many invitations from this list today", { limit: "invites.per_list_per_day" });
  const existing = store.members.find((m) => m.list_id === params[0] && (m.invited_email === email || (m.user_id && userById(m.user_id).email === email)));
  if (existing?.status === "active") throw new HttpError(409, "conflict", "That person can already write this list");
  if (existing) {
    const recent = Date.now() - Date.parse(existing.created_at) < 86_400_000;
    return { member: memberOut(existing, true), sent: !recent };
  }
  const m = { id: newId("mem"), list_id: params[0], user_id: null, invited_email: email, role: "member" as const, status: "invited" as const, token: "inv_" + randomToken(24), created_at: nowIso(), invited_by: actorRef(c) };
  store.members.push(m);
  console.log(`[mock api] invite link for ${email}: /invite/${m.token}`);
  return new Response(JSON.stringify({ member: memberOut(m, true), sent: true }), { status: 201, headers: { "content-type": "application/json", "x-dev-invite-token": m.token } });
});

// SPEC 13.7: who can write the list (writers only). Addresses are masked.
route("GET", "/lists/{id}/access", ({ caller, params }) => {
  const l = getList(params[0]);
  if (!caller || !canWrite(caller, l.id)) throw forbidden();
  const active = store.members.filter((m) => m.list_id === l.id && m.status === "active" && m.user_id);
  const writers = active.map((m) => ({ user: userById(m.user_id!), role: m.role })).filter((w) => !w.user.placeholder);
  const ids = new Set(active.map((m) => m.user_id));
  const mask = (e: string) => e.replace(/^(.)[^@]*(@.*)$/, "$1•••$2");
  return {
    people: writers.map((w) => ({ handle: w.user.handle, role: w.role })),
    agents: store.agents
      .filter((a) => ids.has(a.owner_id) && a.list_ids.includes(l.id))
      .map((a) => ({ id: a.id, name: a.name, kind: a.kind, owner_handle: userById(a.owner_id).handle })),
    pending_invites: store.members
      .filter((m) => m.list_id === l.id && m.status === "invited")
      .map((m) => ({ id: m.id, email: mask(m.invited_email ?? ""), invited_at: m.created_at, invited_by: m.invited_by ?? null })),
  };
});

route("DELETE", "/lists/{id}/members/{member_id}", ({ caller, params }) => {
  requireOwner(caller, params[0]);
  const m = store.members.find((x) => x.id === params[1] && x.list_id === params[0]);
  if (!m) throw notFound("Member not found");
  if (m.role === "owner") throw invalid("The owner can't be removed");
  store.members = store.members.filter((x) => x !== m);
  if (m.user_id) {
    for (const a of store.agents) if (a.owner_id === m.user_id) a.list_ids = a.list_ids.filter((id) => id !== params[0]);
  }
  return store.members.filter((x) => x.list_id === params[0]).map((x) => memberOut(x, true));
});

route("POST", "/invites/lookup", ({ body }) => invitePreview(text("token", body.token, 200, true)));
route("POST", "/invites/accept", ({ caller, body }) => acceptInvite(caller, text("token", body.token, 200, true)));
route("GET", "/invites/{token}", ({ params }) => invitePreview(params[0]));
route("POST", "/invites/{token}/accept", ({ caller, params }) => acceptInvite(caller, params[0]));

function invitePreview(token: string) {
  if (token.startsWith("inv_fail_")) throw new HttpError(503, "internal", "Service unavailable");
  const m = store.members.find((x) => x.token === token);
  if (!m) throw notFound("This invite has expired or was revoked");
  const l = getList(m.list_id);
  return { list: { id: l.id, title: l.title, owner_handle: userById(l.owner_id).handle }, status: m.status, invited_by: m.invited_by ?? null };
}

function acceptInvite(caller: Caller, token: string) {
  const c = requireSession(caller);
  const m = store.members.find((x) => x.token === token);
  if (!m) throw notFound("This invite has expired or was revoked");
  if (m.status === "active") {
    if (m.user_id !== c.user.id) throw new HttpError(409, "conflict", "This invite has already been used");
  } else if (store.members.some((x) => x.list_id === m.list_id && x.user_id === c.user.id && x.status === "active")) {
    store.members = store.members.filter((x) => x !== m);
  } else {
    // The token stays on the row so GET /invites/{token} can report "active".
    m.user_id = c.user.id;
    m.status = "active";
  }
  return listSummary(getList(m.list_id), c);
}

// claims (SPEC 13)
const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/** Mock only: richer claim previews for the e2e tests and reviews (SPEC 15). */
function claimFixture(kind: string, l: ListRow, by: ActorRef, t: string) {
  // Replace the default two wants.
  store.items = store.items.filter((i) => i.list_id !== l.id);
  const addItem = (text: string, extra: Partial<ItemRow> = {}) => {
    const i: ItemRow = { id: newId("itm"), list_id: l.id, text, created_by: by, created_at: nowIso(), purchase: null, status: "open", claimed_by: null, completion: null, ...extra };
    store.items.push(i);
    return i;
  };
  const addProduct = (item: ItemRow, title: string, retailer: string, price: string | null, original: string | null = null, image: string | null = null) => {
    const e: EntryRow = {
      id: newId("ent"), item_id: item.id, list_id: l.id, status: "listed", author: by, title, description: "", product_url: `https://example.com/p/${encodeURIComponent(title.toLowerCase().replace(/\W+/g, "-"))}`,
      kind: "product", links: [], buy_url: null, image_url: image, retailer, coupon_code: null, deal_starts_at: null, deal_ends_at: null, created_at: nowIso(), updated_at: nowIso(), promoted_by: null, promoted_at: null,
    };
    store.entries.push(e);
    if (price) store.prices.push({ id: newId("prc"), entry_id: e.id, price, original_price: original, currency: "USD", note: null, posted_by: by, posted_at: nowIso(), source: "search" });
  };
  if (kind === "car") {
    l.title = "Car accessories for the new Outback";
    const cover = addItem("All-weather floor mats that fit a 2025 Subaru Outback");
    addProduct(cover, "WeatherTech FloorLiner HP, front and rear", "WeatherTech", "239.99", "259.99", "/mock-images/monitor.svg");
    addProduct(cover, "Husky Liners X-act Contour, 2025 Outback", "AutoZone", "189.95");
    const mount = addItem("A magnetic phone mount for the dashboard vent");
    addProduct(mount, "iOttie Velox magnetic vent mount", "Best Buy", "26.99", "34.99", "/mock-images/keyboard.svg");
    addProduct(mount, "Belkin MagSafe vent mount Pro", "Apple", "39.99");
    const cargo = addItem("A cargo organizer for the trunk, collapsible");
    addProduct(cargo, "Drive Auto collapsible trunk organizer", "Amazon", "59.37", "79.99");
    const shade = addItem("Sunshade for the windshield that folds small");
    // SPEC 17.1: why nothing was found, in the agent's words.
    store.comments.push({
      id: newId("cmt"), list_id: l.id, target_type: "item", target_id: shade.id, url: `${WEB}/l/${l.id}#${shade.id}`, author: by,
      body: "The folding shades that fit the 2025 Outback are sold out at every store I checked. I'll look again on Friday.", created_at: nowIso(),
    });
    addItem("A dash cam with parking mode, front and rear");
    addItem("Seat-back organizers for the kids, two of them");
    addItem("A portable jump starter that fits in the glovebox");
  } else if (kind === "long") {
    l.title = "Everything we still need for the new apartment before the lease starts in January, including furniture, kitchen";
    for (let n = 1; n <= 20; n++) {
      const i = addItem(`Want number ${n}: something with a size, a colour and a budget, written the way people actually write wants`);
      if (n % 4 === 1) addProduct(i, `A product for want ${n} with a fairly long name to see how it wraps`, "Target", `${(n * 7.5).toFixed(2)}`);
    }
  } else if (kind === "tasks") {
    l.title = "Moving out";
    l.format = "tasks";
    addItem("Book a moving van for Saturday", { status: "in_progress", claimed_by: by, claimed_at: t, status_note: "Two quotes in: U-Haul $129, Budget $119. Waiting on Penske." });
    addItem("Cancel the gym membership", { status: "done", completion: { completed_at: t, completed_by: by, note: "Cancelled; last charge Dec 1.", entry_id: null } });
    addItem("Forward the mail");
  } else if (kind === "research") {
    l.title = "Is a heat pump worth it here?";
    l.format = "research";
    const q = addItem("What would it cost to run per year?", { status: "done" });
    store.entries.push({
      id: newId("ent"), item_id: q.id, list_id: l.id, status: "listed", author: by, title: "About $650 a year", description: "About $650 a year at 18 cents a kWh, against $560 for gas today.", product_url: null,
      kind: "answer", links: [], buy_url: null, image_url: null, retailer: "", coupon_code: null, deal_starts_at: null, deal_ends_at: null, created_at: t, updated_at: t, promoted_by: null, promoted_at: null,
    });
    addItem("Which rebates apply in Washington?");
  }
}

/**
 * Mock only: a token shaped clm_e2e_<unclaimed|soon|expired|handover>_<anything> makes its own fresh list the first
 * time it is seen, so each test (and each retry) gets a claim link nobody has used.
 */
function e2eClaim(token: string) {
  const m = /^clm_e2e_(unclaimed|soon|expired|handover|car|long|tasks|research)_[a-z0-9_-]{1,40}$/i.exec(token);
  if (!m || store.claims.some((x) => x.token === token)) return;
  const kind = m[1];
  const t = nowIso();
  const owner: UserRow = kind === "handover"
    ? (store.users.find((u) => u.id === "usr_kit") ?? userById("usr_demo"))
    : { id: newId("usr"), email: "", handle: newHandle(), updates_opt_in: false, created_at: t, placeholder: true };
  if (owner.placeholder) store.users.push(owner);
  const agentName = kind === "handover" ? "Kit" : kind === "soon" ? "ChatGPT" : kind === "car" ? "Muse" : "Claude";
  const l: ListRow = {
    id: newId("lst"), title: kind === "soon" ? "Packing for the move" : "Winter boots for Sam", description: "", owner_id: owner.id,
    allow_outside_suggestions: false, format: kind === "soon" ? "tasks" : "shopping", visibility: "private", created_at: t, updated_at: t,
  };
  store.lists.push(l);
  store.members.push({ id: newId("mem"), list_id: l.id, user_id: owner.id, invited_email: null, role: "owner", status: "active", token: null, created_at: t });
  const a: AgentRow = { id: newId("agt"), name: agentName, kind: "key", key: "wk_" + randomToken(40), list_ids: [l.id], owner_id: owner.id, created_at: t, last_used_at: null };
  store.agents.push(a);
  const by: ActorRef = { kind: "agent", agent_id: a.id, name: a.name, owner_handle: owner.handle };
  const item: ItemRow = { id: newId("itm"), list_id: l.id, text: "Waterproof winter boots, size 7 kids", created_by: by, created_at: t, purchase: null, status: "open", claimed_by: null, completion: null };
  store.items.push(item, { ...item, id: newId("itm"), text: "Warm socks to go with them" });
  if (kind === "unclaimed") {
    store.questions.push({ id: newId("qst"), item_id: item.id, text: "Velcro or laces? Velcro is easier for Sam to do alone.", options: ["Velcro", "Laces"], asked_by: by, asked_at: t, answer: null });
  }
  if (kind === "car" || kind === "long" || kind === "tasks" || kind === "research") claimFixture(kind, l, by, t);
  const LEFT: Record<string, number> = { unclaimed: 22 * 3_600_000, soon: 59 * 60_000, expired: -3_600_000, handover: 6 * 86_400_000, car: 22 * 3_600_000, long: 20 * 3_600_000, tasks: 22 * 3_600_000, research: 22 * 3_600_000 };
  store.claims.push({
    token, list_id: l.id, kind: kind === "handover" ? "handover" : "unclaimed", agent_name: agentName,
    from_user_id: kind === "handover" ? owner.id : null, expires_at: isoIn(LEFT[kind]), used_by: null,
  });
}

const liveClaim = (token: string): ClaimRow | null => {
  e2eClaim(token);
  const k = store.claims.find((x) => x.token === token);
  if (!k || !store.lists.some((l) => l.id === k.list_id)) return null;
  return k;
};
const expired = (k: ClaimRow) => Date.parse(k.expires_at) <= Date.now();

route("POST", "/lists/unclaimed", ({ body }) => {
  const agentName = text("agent_name", body.agent_name, 60, true);
  const title = text("title", body.title, 140, true);
  const format = listFormat(body.format ?? "shopping");
  const wants = Array.isArray(body.wants) ? (body.wants as Array<Record<string, unknown>>) : [];
  if (wants.length > 10) throw new HttpError(400, "invalid", "At most 10 wants when starting a list", { limit: "unclaimed.wants" });
  const t = nowIso();
  const holder: UserRow = { id: newId("usr"), email: "", handle: newHandle(), updates_opt_in: false, created_at: t, placeholder: true };
  store.users.push(holder);
  const l: ListRow = {
    id: newId("lst"), title, description: text("description", body.description, 500), owner_id: holder.id, allow_outside_suggestions: false,
    theme: themeSlug(body.theme), format, visibility: "private", note: text("note", body.note, 600), created_at: t, updated_at: t,
  };
  store.lists.push(l);
  store.members.push({ id: newId("mem"), list_id: l.id, user_id: holder.id, invited_email: null, role: "owner", status: "active", token: null, created_at: t });
  const key = "wk_" + randomToken(40);
  const a: AgentRow = { id: newId("agt"), name: agentName, kind: "key", key, list_ids: [l.id], owner_id: holder.id, created_at: t, last_used_at: null };
  store.agents.push(a);
  const by: ActorRef = { kind: "agent", agent_id: a.id, name: a.name, owner_handle: holder.handle };
  for (const w of wants) {
    store.items.push({
      id: newId("itm"), list_id: l.id, text: text("text", w.text, 500, true), created_by: by, created_at: t, purchase: null,
      details: text("details", w.details, 2000), due_at: timestampOrNull("due", w.due), status: "open", claimed_by: null, completion: null,
    });
  }
  const k: ClaimRow = { token: "clm_" + randomToken(32), list_id: l.id, kind: "unclaimed", agent_name: agentName, from_user_id: null, expires_at: isoIn(UNCLAIMED_TTL_HOURS * 3_600_000), used_by: null };
  store.claims.push(k);
  const out: UnclaimedListResult = { list: listSummary(l, null), key, claim_url: `${WEB}/claim/${k.token}`, expires_at: k.expires_at };
  return created(out);
});

route("POST", "/lists/{id}/handover", ({ caller, params }) => {
  const c = requireOwner(caller, params[0]);
  getList(params[0]);
  // One live link per list: asking again replaces it.
  store.claims = store.claims.filter((x) => !(x.list_id === params[0] && x.kind === "handover" && !x.used_by));
  const k: ClaimRow = { token: "clm_" + randomToken(32), list_id: params[0], kind: "handover", agent_name: "", from_user_id: c.user.id, expires_at: isoIn(HANDOVER_TTL_DAYS * 86_400_000), used_by: null };
  store.claims.push(k);
  const out: HandoverResult = { claim_url: `${WEB}/claim/${k.token}`, expires_at: k.expires_at };
  return created(out);
});

// Tokens travel in the body (POST /claims/lookup, /claims/claim), so they stay out of request logs.
// The path forms are the older shape, kept for clients that still use them.
route("POST", "/claims/lookup", ({ body }) => claimPreview(text("token", body.token, 200, true)));
route("POST", "/claims/claim", ({ caller, body }) => keepClaim(caller, text("token", body.token, 200, true)));
route("GET", "/claims/{token}", ({ params }) => claimPreview(params[0]));
route("POST", "/claims/{token}", ({ caller, params }) => keepClaim(caller, params[0]));

function claimPreview(token: string): ClaimPreview {
  // Mock only: tokens starting clm_fail_ answer as if the API were down, to exercise the page's fallback.
  if (token.startsWith("clm_fail_")) throw new HttpError(503, "internal", "Service unavailable");
  const k = liveClaim(token);
  if (!k || k.used_by || expired(k)) throw notFound("This link has expired or was already used");
  const l = getList(k.list_id);
  const format = fmt(l);
  const items = store.items.filter((i) => i.list_id === l.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const ids = new Set(items.map((i) => i.id));
  const open = store.questions.filter((q) => ids.has(q.item_id) && !q.answer);
  const listed = (itemId: string) => store.entries.filter((e) => e.item_id === itemId && e.status === "listed");
  // SPEC 15.1: up to three listed entries, cheapest current price first, then unpriced ones newest first.
  const claimEntries = (itemId: string) =>
    listed(itemId)
      .map((e) => ({ e, p: pricesFor(e.id).at(-1) ?? null }))
      .sort((x, y) => {
        if (x.p && y.p) return Number(x.p.price) - Number(y.p.price);
        if (x.p) return -1;
        if (y.p) return 1;
        return y.e.created_at.localeCompare(x.e.created_at);
      })
      .slice(0, 3)
      .map(({ e, p }) => ({
        title: e.title, retailer: e.retailer ?? "", image_url: e.image_url, product_url: e.product_url,
        price: p?.price ?? null, original_price: p?.original_price ?? null, currency: p?.currency ?? null,
        // SPEC 17.1: how sure the price is.
        price_source: p ? (p.source ?? "unknown") : null, verified: p ? p.source === "retailer_page" : false, checked_at: p ? (p.checked_at ?? p.posted_at) : null,
      }));
  const summary = (i: ItemRow): string | null => {
    if (format === "tasks") {
      const note = itemOut(i, null).status === "done" ? i.completion?.note : i.status_note;
      return note ? note.slice(0, 140) : null;
    }
    if (format === "research") {
      const answer = listed(i.id).find((e) => e.kind === "answer");
      return answer ? (answer.description || answer.title).slice(0, 140) : null;
    }
    return null;
  };
  // As on the list: open, in_progress, waiting_on_owner (an open question), done (bought, done or answered).
  const status = (i: ItemRow) => itemOut(i, null).status;
  const out: ClaimPreview = {
    kind: k.kind,
    ...(k.kind === "handover" && k.from_user_id ? { from: { handle: userById(k.from_user_id).handle } } : {}),
    list: {
      title: l.title, format, theme: l.theme ?? null,
      counts: {
        items: items.length,
        entries: store.entries.filter((e) => ids.has(e.item_id) && e.status === "listed").length,
        open_questions: open.length,
        items_with_entries: items.filter((i) => listed(i.id).length > 0).length,
      },
    },
    items: items.slice(0, 20).map((i) => ({
      text: i.text.slice(0, 140),
      status: status(i),
      entry_count: listed(i.id).length,
      entries: format === "shopping" ? claimEntries(i.id) : [],
      summary: summary(i),
      // SPEC 17.1: the newest comment on the item by an agent (on an unclaimed list, only its agent can write).
      note: (() => {
        const c = store.comments.filter((x) => x.target_type === "item" && x.target_id === i.id && x.author.kind === "agent").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return c ? { text: c.body.slice(0, 280), at: c.created_at } : null;
      })(),
    })),
    agent_name: k.agent_name,
    expires_at: k.expires_at,
    open_questions: open.map((q) => {
      const i = items.find((x) => x.id === q.item_id)!;
      return { id: q.id, text: q.text, options: q.options, item: { id: i.id, text: i.text.slice(0, 140) } };
    }),
  };
  return out;
}

function keepClaim(caller: Caller, token: string): ListSummary {
  const c = requireSession(caller);
  const k = liveClaim(token);
  if (!k) throw notFound("This link has expired or was already used");
  const l = getList(k.list_id);
  if (k.used_by) {
    // Idempotent for the same person.
    if (k.used_by !== c.user.id) throw new HttpError(409, "conflict", "Someone else has already kept this list");
    return listSummary(l, c);
  }
  if (expired(k)) throw notFound("This link has expired or was already used");
  const t = nowIso();
  const previous = l.owner_id;
  const ownerRow = store.members.find((m) => m.list_id === l.id && m.role === "owner");
  // Already a member: that row goes, the person becomes the owner.
  store.members = store.members.filter((m) => !(m.list_id === l.id && m.user_id === c.user.id && m.role !== "owner"));
  if (ownerRow) ownerRow.user_id = c.user.id;
  l.owner_id = c.user.id;
  if (k.kind === "unclaimed") {
    // The agent's key now belongs to the person; the placeholder goes.
    for (const a of store.agents) if (a.owner_id === previous) a.owner_id = c.user.id;
    store.users = store.users.filter((u) => u.id !== previous);
    l.visibility = "private";
  } else if (previous !== c.user.id) {
    // The previous owner stays on as a member, so their agents keep working.
    store.members.push({ id: newId("mem"), list_id: l.id, user_id: previous, invited_email: null, role: "member", status: "active", token: null, created_at: t });
  }
  k.used_by = c.user.id;
  l.updated_at = t;
  return listSummary(l, c);
}

// keys
route("POST", "/lists/{id}/keys", ({ caller, params, body }) => {
  const c = requireSession(caller);
  getList(params[0]);
  if (!roleOf(c, params[0])) throw forbidden();
  const name = text("agent_name", body.agent_name, 60, true);
  // As the API: at most 50 live agents per person. Mock only: the name "mock: limit" answers as if that were reached.
  if (name === "mock: limit" || store.agents.filter((x) => x.owner_id === c.user.id).length >= 50) {
    throw new HttpError(429, "rate_limited", "You have too many active agents; revoke some first");
  }
  const key = "wk_" + randomToken(40);
  const a: AgentRow = { id: newId("agt"), name, kind: "key", key, list_ids: [params[0]], owner_id: c.user.id, created_at: nowIso(), last_used_at: null };
  store.agents.push(a);
  return created({ agent: agentOut(a), key });
});

// items
function getItem(id: string): ItemRow {
  const i = store.items.find((x) => x.id === id);
  if (!i) throw notFound("Item not found");
  return i;
}

route("POST", "/lists/{id}/items", ({ caller, params, body }) => {
  const c = requireWriter(caller, getList(params[0]).id);
  const i: ItemRow = {
    id: newId("itm"), list_id: params[0], text: text("text", body.text, 500, true), created_by: actorRef(c), created_at: nowIso(), purchase: null,
    details: text("details", body.details, 2000), due_at: timestampOrNull("due_at", body.due_at), status: "open", claimed_by: null, completion: null,
  };
  store.items.push(i);
  touch(i.list_id);
  emit("item.created", i.list_id, actorRef(c), `${WEB}/l/${i.list_id}#${i.id}`, { item: { id: i.id, url: `${WEB}/l/${i.list_id}#${i.id}`, text: i.text } });
  return created(itemOut(i, c));
});

// SPEC 16.2: a person who can write the list accepts an outsider's item; it then shows like any other. Agents may not.
route("POST", "/items/{id}/accept", ({ caller, params }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  if (c.kind !== "user") throw new HttpError(403, "forbidden", "Only a person, signed in on the web, can accept an outsider's item.");
  if (i.pending_review) {
    i.pending_review = false;
    touch(i.list_id);
    emit("item.created", i.list_id, i.created_by, `${WEB}/l/${i.list_id}#${i.id}`, { item: { id: i.id, url: `${WEB}/l/${i.list_id}#${i.id}`, text: i.text } });
  }
  return itemOut(i, c);
});

route("PATCH", "/items/{id}", ({ caller, params, body }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  requireAuthorOrOwner(i.created_by, c, i.list_id, "item");
  if (body.text !== undefined) {
    i.text = text("text", body.text, 500, true);
    i.text_by = c.kind === "agent" ? "agent" : "person";
  }
  if (body.details !== undefined) i.details = text("details", body.details, 2000);
  if (body.due_at !== undefined) i.due_at = timestampOrNull("due_at", body.due_at);
  touch(i.list_id);
  return itemOut(i, c);
});

route("DELETE", "/items/{id}", ({ caller, params }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  requireAuthorOrOwner(i.created_by, c, i.list_id, "item");
  const out = itemOut(i, c);
  store.items = store.items.filter((x) => x !== i);
  store.entries = store.entries.filter((e) => e.item_id !== i.id);
  touch(i.list_id);
  return out;
});

route("POST", "/items/{id}/purchase", ({ caller, params, body }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  const input = body as PurchaseInput;
  let retailer = input.retailer ?? null;
  let price = decimal("price", input.price);
  let currency = input.currency ?? null;
  if (input.entry_id) {
    const e = store.entries.find((x) => x.id === input.entry_id && x.item_id === i.id);
    if (!e) throw invalid("That entry isn't on this item");
    const cur = pricesFor(e.id).at(-1);
    retailer = retailer ?? e.retailer;
    price = price ?? cur?.price ?? null;
    currency = currency ?? cur?.currency ?? null;
  }
  if (fmt(getList(i.list_id)) !== "shopping") throw invalid("Purchases are for shopping lists; set the item status instead");
  const q = openQuestion(i.id);
  if (q) throw new HttpError(409, "conflict", `Answer the open question first: “${q.text}”`);
  i.purchase = { purchased_at: nowIso(), purchased_by: actorRef(c), retailer, price, currency, entry_id: input.entry_id ?? null };
  i.status = "done";
  i.completion = { completed_at: i.purchase.purchased_at, completed_by: i.purchase.purchased_by, note: null, entry_id: i.purchase.entry_id };
  touch(i.list_id);
  emit("item.purchased", i.list_id, actorRef(c), `${WEB}/l/${i.list_id}#${i.id}`, { item: { id: i.id, url: `${WEB}/l/${i.list_id}#${i.id}`, text: i.text } });
  return itemOut(i, c);
});

route("DELETE", "/items/{id}/purchase", ({ caller, params }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  i.purchase = null;
  i.status = "open";
  i.completion = null;
  touch(i.list_id);
  return itemOut(i, c);
});

/** SPEC 11.3: set an item's status on any format. done on a shopping list = purchased without details. */
route("POST", "/items/{id}/status", ({ caller, params, body }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  const status = body.status as ItemStatus;
  if (status !== "open" && status !== "in_progress" && status !== "done") throw invalid("status must be open, in_progress or done");
  const note = text("note", body.note, 1000) || null;
  const entryId = body.entry_id ? String(body.entry_id) : null;
  if (entryId && !store.entries.some((e) => e.id === entryId && e.item_id === i.id && e.status === "listed")) throw invalid("That entry isn't on this item");
  const shopping = fmt(getList(i.list_id)) === "shopping";
  const q = openQuestion(i.id);
  if (q) throw new HttpError(409, "conflict", `Answer the open question first: “${q.text}”`);
  // Claims: an agent can't take an item someone else holds unless it says take_over; a person always can.
  if (status === "in_progress" && i.status === "in_progress" && i.claimed_by && !sameActor(i.claimed_by, c)) {
    if (c.kind === "agent" && body.take_over !== true) {
      throw new HttpError(409, "conflict", `Already in progress by ${i.claimed_by.kind === "agent" ? i.claimed_by.name : i.claimed_by.kind === "user" ? i.claimed_by.handle : "someone"}. Pass take_over: true to take it over.`);
    }
  }
  const sameHolder = status === "in_progress" && i.status === "in_progress" && i.claimed_by && sameActor(i.claimed_by, c);
  i.status = status;
  // The note stays until the status changes again; re-sending in_progress with a new note posts progress.
  i.status_note = status === "done" ? null : note;
  i.status_note_at = i.status_note ? nowIso() : null;
  if (status === "open") {
    i.claimed_by = null;
    i.claimed_at = null;
    i.completion = null;
    if (shopping) i.purchase = null;
  } else if (status === "in_progress") {
    if (!sameHolder) {
      i.claimed_by = actorRef(c);
      i.claimed_at = nowIso();
    }
    i.completion = null;
    if (shopping) i.purchase = null;
  } else {
    const at = nowIso();
    i.completion = { completed_at: at, completed_by: actorRef(c), note, entry_id: entryId };
    if (shopping) i.purchase = { purchased_at: at, purchased_by: actorRef(c), retailer: null, price: null, currency: null, entry_id: entryId };
  }
  touch(i.list_id);
  emit("item.status_changed" as EventType, i.list_id, actorRef(c), `${WEB}/l/${i.list_id}#${i.id}`, { item: { id: i.id, url: `${WEB}/l/${i.list_id}#${i.id}`, text: i.text } });
  return itemOut(i, c);
});

// SPEC 12.1: questions for the owner
function priceSource(v: unknown, fallback: PriceSource): PriceSource {
  if (v == null || v === "") return fallback;
  if (v === "retailer_page" || v === "aggregator" || v === "search" || v === "user" || v === "unknown") return v;
  throw invalid("source must be retailer_page, aggregator, search, user or unknown");
}
function checkedAt(v: unknown, fallback: string): string {
  if (v == null || v === "") return fallback;
  const t = Date.parse(String(v));
  if (!Number.isFinite(t)) throw invalid("checked_at must be an ISO 8601 timestamp");
  if (t > Date.now() + 60_000) throw invalid("checked_at can't be in the future");
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
}

route("POST", "/items/{id}/questions", ({ caller, params, body }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  const done = i.status === "done" || !!i.purchase;
  if (done) throw new HttpError(409, "conflict", "This item is finished: reopen it first");
  const open = openQuestion(i.id);
  if (open) throw new HttpError(409, "conflict", `There's already an open question: “${open.text}”`);
  const qText = text("text", body.text, 500, true);
  const rawOptions = Array.isArray(body.options) ? body.options : [];
  const options = [...new Set(rawOptions.map((o: unknown, n: number) => text(`options[${n}]`, o, 80, true)))];
  if (options.length > 6) throw invalid("At most 6 options");
  const q: Question = { id: newId("qst"), item_id: i.id, text: qText, options, asked_by: actorRef(c), asked_at: nowIso(), answer: null };
  store.questions.push(q);
  // Asking releases any claim.
  i.status = "open";
  i.claimed_by = null;
  i.claimed_at = null;
  touch(i.list_id);
  emit("question.asked", i.list_id, actorRef(c), `${WEB}/l/${i.list_id}#${i.id}`, { item: { id: i.id, url: `${WEB}/l/${i.list_id}#${i.id}`, text: i.text }, question: q } as Partial<WantEvent>);
  return created(q);
});

route("POST", "/questions/{id}/answer", ({ caller, params, body }) => {
  const q = store.questions.find((x) => x.id === params[0]);
  if (!q) throw notFound("Question not found");
  const i = getItem(q.item_id);
  const c = requireWriter(caller, i.list_id);
  if (q.answer) throw new HttpError(409, "conflict", "This question is already answered");
  q.answer = { text: text("text", body.text, 2000, true), answered_by: actorRef(c), answered_at: nowIso() };
  i.status = "open";
  touch(i.list_id);
  emit("question.answered", i.list_id, actorRef(c), `${WEB}/l/${i.list_id}#${i.id}`, { item: { id: i.id, url: `${WEB}/l/${i.list_id}#${i.id}`, text: i.text }, question: q } as Partial<WantEvent>);
  return q;
});

/** SPEC 12.4: the compact read. Best price: newest observation per listed entry, checked in the last 24 hours, verified first. */
function bestPrice(itemId: string) {
  const day = Date.now() - 24 * 3600_000;
  const fresh = store.entries
    .filter((e) => e.item_id === itemId && e.status === "listed")
    .map((e) => pricesFor(e.id).at(-1))
    .filter((p): p is PriceObservation => !!p && Date.parse(p.checked_at) >= day);
  const pool = fresh.some((p) => p.verified) ? fresh.filter((p) => p.verified) : fresh;
  if (!pool.length) return null;
  const counts = new Map<string, number>();
  for (const p of pool) counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1);
  const cur = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const best = pool.filter((p) => p.currency === cur).sort((a, b) => Number(a.price) - Number(b.price))[0];
  return { entry_id: best.entry_id, price: best.price, currency: best.currency, source: best.source, verified: best.verified, checked_at: best.checked_at };
}

/** Open questions across every list the caller can write, newest first (count is the total). */
route("GET", "/me/questions", ({ caller, url }) => {
  if (!caller) throw unauthorized();
  const rows = store.questions
    .filter((q) => !q.answer)
    .map((q) => ({ q, item: store.items.find((i) => i.id === q.item_id) }))
    .filter((r): r is { q: Question; item: ItemRow } => !!r.item && canWrite(caller, r.item.list_id))
    .sort((a, b) => b.q.asked_at.localeCompare(a.q.asked_at));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
  const start = Math.max(0, parseInt(url.searchParams.get("cursor") ?? "0", 10) || 0);
  const page: OpenQuestionsPage = {
    questions: rows.slice(start, start + limit).map(({ q, item }) => {
      const l = getList(item.list_id);
      return {
        id: q.id, text: q.text, options: q.options, asked_at: q.asked_at, asked_by: q.asked_by,
        item: { id: item.id, text: item.text.slice(0, 140), url: `${WEB}/l/${l.id}#${item.id}` },
        list: { id: l.id, title: l.title, url: `${WEB}/l/${l.id}` },
      };
    }),
    count: rows.length,
    next_cursor: start + limit < rows.length ? String(start + limit) : null,
  };
  return page;
});

route("GET", "/lists/{id}/summary", ({ caller, params }) => {
  const l = readableList(params[0], caller);
  const shopping = fmt(l) === "shopping";
  const items: ItemSummary[] = store.items
    .filter((i) => i.list_id === l.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((i) => {
      const full = itemOut(i, caller);
      return {
        id: full.id, url: full.url, text: full.text, details_preview: full.details.slice(0, 240), status: full.status, due_at: full.due_at,
        claimed_by: full.claimed_by, claimed_at: full.claimed_at, open_question: full.open_question, entry_counts: full.entry_counts,
        comment_count: full.comment_count, best_price: shopping ? bestPrice(i.id) : null,
      };
    });
  const page: ListSummaryPage = { list: listSummary(l, caller), items, next_cursor: null };
  return page;
});

// entries
function getEntry(id: string): EntryRow {
  const e = store.entries.find((x) => x.id === id && x.status !== "rejected");
  if (!e) throw notFound("Entry not found");
  return e;
}

route("GET", "/items/{id}/entries", ({ caller, params, url }) => {
  const i = getItem(params[0]);
  readableList(i.list_id, caller);
  const inc = url.searchParams.get("include_suggested") === "1";
  return { item: itemOut(i, caller), entries: visibleEntries(i.id, caller, inc).map(entryOut) };
});

route("POST", "/items/{id}/entries", ({ caller, params, body }) => {
  const i = getItem(params[0]);
  const l = getList(i.list_id);
  const input = body as unknown as EntryInput;
  const writer = canWrite(caller, l.id);
  if (vis(l) === "private" && !writer) throw notFound("Item not found");
  if (caller && !writer) throw forbidden();
  if (!writer && !l.allow_outside_suggestions) throw forbidden("This list doesn't accept outside suggestions");
  const format = fmt(l);
  const shopping = format === "shopping";
  const author: ActorRef = writer && caller ? actorRef(caller) : { kind: "outside", name: input.agent_name ? text("agent_name", input.agent_name, 60) : null };
  const productUrl = checkUrl("product_url", input.product_url, shopping);
  const urlKey = (u: string) => {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/$/, "")).toLowerCase();
  };
  if (shopping && productUrl) {
    const dup = store.entries.find((x) => x.item_id === i.id && x.status !== "rejected" && x.product_url && urlKey(x.product_url) === urlKey(productUrl));
    if (dup) throw new HttpError(409, "conflict", "That product is already on this item", { entry_id: dup.id });
  }
  const firstPrice = decimal("price", input.price);
  if (firstPrice && !shopping) throw invalid("Prices are only for shopping lists");
  if (firstPrice && !input.currency) throw invalid("currency is required when price is given");
  const rawLinks = (input as { links?: unknown }).links;
  if (rawLinks !== undefined && !Array.isArray(rawLinks)) throw invalid("links must be a list of https links");
  const links = ((rawLinks as unknown[]) ?? []).slice(0, 9).map((u, n) => checkUrl(`links[${n}]`, u, true)!);
  if (links.length > 8) throw invalid("At most 8 links");
  const t = nowIso();
  const e: EntryRow = {
    id: newId("ent"), item_id: i.id, list_id: l.id, status: writer ? "listed" : "suggested", author,
    title: text("title", input.title, 140, true),
    description: text("description", input.description, writer && !shopping ? 4000 : 500),
    product_url: productUrl,
    kind: shopping ? "product" : format === "tasks" ? "update" : "answer",
    links,
    buy_url: checkUrl("buy_url", input.buy_url),
    image_url: checkUrl("image_url", input.image_url),
    retailer: text("retailer", input.retailer, 80) || (productUrl ? new URL(productUrl).hostname.replace(/^www\./, "") : ""),
    coupon_code: text("coupon_code", input.coupon_code, 40) || null,
    deal_starts_at: timestamp("deal_starts_at", input.deal_starts_at),
    deal_ends_at: timestamp("deal_ends_at", input.deal_ends_at),
    created_at: t, updated_at: t, promoted_by: null, promoted_at: null,
  };
  store.entries.push(e);
  if (firstPrice) {
    const source = priceSource(input.price_source, writer && caller?.kind === "user" ? "user" : "unknown");
    store.prices.push({
      id: newId("prc"), entry_id: e.id, price: firstPrice, original_price: decimal("original_price", input.original_price),
      currency: text("currency", input.currency, 3, true).toUpperCase(), note: null, posted_by: author, posted_at: t,
      source, source_url: checkUrl("price_source_url", input.price_source_url), checked_at: checkedAt(input.price_checked_at, t),
      in_stock: typeof input.in_stock === "boolean" ? input.in_stock : null, verified: source === "retailer_page",
    });
  }
  touch(l.id);
  emit(writer ? "entry.listed" : "entry.suggested", l.id, author, `${WEB}/l/${l.id}#${e.id}`, { entry: entryOut(e) });
  return created(entryOut(e));
});

route("PATCH", "/entries/{id}", ({ caller, params, body }) => {
  const e = getEntry(params[0]);
  const c = requireWriter(caller, e.list_id);
  requireAuthorOrOwner(e.author, c, e.list_id, "product");
  const input = body as Partial<EntryInput>;
  if (input.title !== undefined) e.title = text("title", input.title, 140, true);
  const shopping = fmt(getList(e.list_id)) === "shopping";
  if (input.description !== undefined) e.description = text("description", input.description, shopping ? 500 : 4000);
  if (input.product_url !== undefined) e.product_url = checkUrl("product_url", input.product_url, shopping);
  const patchLinks = (input as { links?: unknown }).links;
  if (patchLinks !== undefined) {
    if (!Array.isArray(patchLinks) || patchLinks.length > 8) throw invalid("links must be at most 8 https links");
    e.links = patchLinks.map((u, n) => checkUrl(`links[${n}]`, u, true)!);
  }
  if (input.buy_url !== undefined) e.buy_url = checkUrl("buy_url", input.buy_url);
  if (input.image_url !== undefined) e.image_url = checkUrl("image_url", input.image_url);
  if (input.retailer !== undefined) e.retailer = text("retailer", input.retailer, 80) || (e.product_url ? new URL(e.product_url).hostname.replace(/^www\./, "") : "");
  if (input.coupon_code !== undefined) e.coupon_code = text("coupon_code", input.coupon_code, 40) || null;
  if (input.deal_starts_at !== undefined) e.deal_starts_at = timestamp("deal_starts_at", input.deal_starts_at);
  if (input.deal_ends_at !== undefined) e.deal_ends_at = timestamp("deal_ends_at", input.deal_ends_at);
  e.updated_at = nowIso();
  return entryOut(e);
});

route("DELETE", "/entries/{id}", ({ caller, params }) => {
  const e = getEntry(params[0]);
  const c = requireWriter(caller, e.list_id);
  requireAuthorOrOwner(e.author, c, e.list_id, "product");
  store.entries = store.entries.filter((x) => x !== e);
  return entryOut(e);
});

route("POST", "/entries/{id}/promote", ({ caller, params }) => {
  const e = getEntry(params[0]);
  const c = requireWriter(caller, e.list_id);
  if (e.status !== "suggested") throw new HttpError(409, "conflict", "This entry is already listed");
  e.status = "listed";
  e.promoted_by = actorRef(c);
  e.promoted_at = nowIso();
  e.updated_at = e.promoted_at;
  touch(e.list_id);
  emit("entry.listed", e.list_id, actorRef(c), `${WEB}/l/${e.list_id}#${e.id}`, { entry: entryOut(e) });
  return entryOut(e);
});

route("POST", "/entries/{id}/reject", ({ caller, params }) => {
  const e = getEntry(params[0]);
  requireWriter(caller, e.list_id);
  if (e.status !== "suggested") throw new HttpError(409, "conflict", "Only suggestions can be rejected");
  const out = entryOut(e);
  e.status = "rejected";
  return out;
});

route("GET", "/lists/{id}/prices", ({ caller, params }) => {
  const l = readableList(params[0], caller);
  const writer = canWrite(caller, l.id);
  const prices: Record<string, PriceObservation[]> = {};
  for (const e of store.entries) {
    if (e.list_id !== l.id || e.status === "rejected" || (e.status === "suggested" && !writer)) continue;
    prices[e.id] = pricesFor(e.id);
  }
  return { prices };
});

route("GET", "/lists/{id}/suggestions", ({ caller, params, url }) => {
  const l = readableList(params[0], caller);
  requireWriter(caller, l.id);
  const rows = store.entries
    .filter((e) => e.list_id === l.id && e.status === "suggested")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(feedRow);
  return paginate(rows, url.searchParams.get("cursor"));
});

// prices
route("GET", "/entries/{id}/prices", ({ params, caller }) => {
  const e = getEntry(params[0]);
  readableList(e.list_id, caller);
  if (e.status === "suggested" && !canWrite(caller, e.list_id)) throw notFound("Entry not found");
  return pricesFor(e.id);
});

route("POST", "/entries/{id}/prices", ({ caller, params, body }) => {
  const e = getEntry(params[0]);
  const c = requireWriter(caller, e.list_id);
  if (fmt(getList(e.list_id)) !== "shopping") throw invalid("Prices are only for shopping lists");
  const input = body as unknown as PriceInput;
  const p: PriceObservation = {
    id: newId("prc"), entry_id: e.id, price: decimal("price", input.price, true)!,
    original_price: decimal("original_price", input.original_price),
    currency: text("currency", input.currency, 3, true).toUpperCase(),
    note: text("note", input.note, 200) || null, posted_by: actorRef(c), posted_at: nowIso(),
    // SPEC 12.5: a person's price is theirs ("user") unless they say otherwise.
    source: "unknown", source_url: null, checked_at: "", in_stock: null, verified: false,
  };
  p.source = priceSource(input.source, c.kind === "user" ? "user" : "unknown");
  p.source_url = checkUrl("source_url", input.source_url);
  p.checked_at = checkedAt(input.checked_at, p.posted_at);
  p.in_stock = typeof input.in_stock === "boolean" ? input.in_stock : null;
  p.verified = p.source === "retailer_page";
  store.prices.push(p);
  e.updated_at = p.posted_at;
  touch(e.list_id);
  emit("price.posted", e.list_id, actorRef(c), `${WEB}/l/${e.list_id}#${e.id}`, { price: p });
  return created(p);
});

// comments
route("GET", "/lists/{id}/comments", ({ params, url, caller }) => {
  const l = readableList(params[0], caller);
  const tt = url.searchParams.get("target_type");
  const tid = url.searchParams.get("target_id");
  const suggestedIds = new Set(store.entries.filter((e) => e.status !== "listed").map((e) => e.id));
  const rows = store.comments
    .filter((x) => x.list_id === l.id && !(x.target_type === "entry" && suggestedIds.has(x.target_id)))
    .filter((x) => (!tt || x.target_type === tt) && (!tid || x.target_id === tid))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return paginate(rows, url.searchParams.get("cursor"));
});

route("POST", "/comments", ({ caller, body }) => {
  const tt = body.target_type;
  const tid = String(body.target_id ?? "");
  let listId: string;
  if (tt === "item") listId = getItem(tid).list_id;
  else if (tt === "entry") listId = getEntry(tid).list_id;
  else throw invalid("target_type must be item or entry");
  const c = requireWriter(caller, listId);
  const cm: Comment = { id: newId("cmt"), list_id: listId, target_type: tt, target_id: tid, url: "", author: actorRef(c), body: text("body", body.body, 1000, true), created_at: nowIso() };
  cm.url = `${WEB}/l/${listId}#${cm.id}`;
  store.comments.push(cm);
  touch(listId);
  emit("comment.created", listId, cm.author, cm.url, { comment: cm });
  return created(cm);
});

route("DELETE", "/comments/{id}", ({ caller, params }) => {
  const cm = store.comments.find((x) => x.id === params[0]);
  if (!cm) throw notFound("Comment not found");
  const c = requireWriter(caller, cm.list_id);
  requireAuthorOrOwner(cm.author, c, cm.list_id, "comment");
  store.comments = store.comments.filter((x) => x !== cm);
  return cm;
});

// events
function eventsFor(c: Caller, listIds: string[] | null, url: URL) {
  const after = parseInt(url.searchParams.get("after") ?? "0", 10) || 0;
  const types = url.searchParams.get("types")?.split(",").filter(Boolean);
  const events = store.events
    .filter((e) => e.seq > after)
    .filter((e) => !listIds || listIds.includes(e.list_id))
    .filter((e) => (e.type !== "entry.suggested" && !e.type.startsWith("question.")) || canWrite(c, e.list_id))
    // SPEC 11.2: on a private list every event is writers-only.
    .filter((e) => isPublic(e.list_id) || canWrite(c, e.list_id))
    .filter((e) => !types || types.includes(e.type))
    .slice(0, 100);
  return { events, next: events.at(-1)?.seq ?? after };
}
route("GET", "/lists/{id}/events", ({ caller, params, url }) => eventsFor(caller, [readableList(params[0], caller).id], url));
route("GET", "/me/events", ({ caller, url }) => {
  if (!caller) throw unauthorized();
  return eventsFor(caller, store.lists.filter((l) => canWrite(caller, l.id)).map((l) => l.id), url);
});

// reports + sitemap
route("POST", "/reports", ({ body }) => {
  const tt = String(body.target_type ?? "");
  if (!["list", "item", "entry", "comment"].includes(tt)) throw invalid("Unknown report target");
  const reason = text("reason", body.reason, 1000, true);
  store.reports.push({ target_type: tt, target_id: String(body.target_id ?? ""), reason, created_at: nowIso() });
  console.log(`[mock api] report on ${tt} ${body.target_id}: ${reason}`);
  return NO_CONTENT;
});

// SPEC 16.1: feedback, from anyone. Mock only: text "mock: rate limit" answers as the daily limit would.
route("POST", "/feedback", ({ body, caller }) => {
  const kind = String(body.kind ?? "");
  if (kind !== "bug" && kind !== "expectation" && kind !== "request") throw invalid("kind must be bug, expectation or request");
  const t = text("text", body.text, 2000, true);
  if (t === "mock: rate limit") throw new HttpError(429, "rate_limited", "That's a lot of feedback from one network today. Try again tomorrow.", { limit: "feedback.per_network_per_day" });
  const expected = text("expected", body.expected, 1000) || null;
  const about = text("about", body.about, 80) || null;
  const list = typeof body.list === "string" && body.list ? body.list : null;
  const id = newId("fbk");
  const row: (typeof store.feedback)[number] = { id, kind, text: t, expected, about, list, created_at: nowIso(), item_id: null };
  store.feedback.push(row);
  // SPEC 16.2: a task on the feedback list, written by an outsider and held until a writer accepts it.
  if (store.feedback_list) {
    const prefix = kind === "bug" ? "Bug" : kind === "expectation" ? "Expected" : "Request";
    row.item_id = newId("itm");
    store.items.push({
      id: row.item_id, list_id: store.feedback_list, text: `${prefix}: ${t.replace(/\s+/g, " ").slice(0, 120)}`,
      details: [t, expected ? `Expected: ${expected}` : "", `${caller?.kind === "user" ? "From a person" : caller ? "From an agent" : "From someone not signed in"} on the web${about ? `, about ${about}` : ""}`].filter(Boolean).join("\n\n"),
      created_by: { kind: "outside", name: null }, created_at: nowIso(), purchase: null, status: "open", claimed_by: null, completion: null,
      text_by: "outsider", pending_review: true,
    });
  }
  return created({ id, received: true as const, status_url: `${WEB}/feedback/${id}` });
});

// SPEC 16.6: where a report stands, for whoever holds its id; no credential. Never the report's text or its sender.
route("GET", "/feedback/{id}", ({ params }) => {
  const r = store.feedback.find((f) => f.id === params[0]);
  if (!r) throw notFound("Feedback not found");
  const i = r.item_id ? store.items.find((x) => x.id === r.item_id) : undefined;
  const status = !r.item_id ? "received" : !i ? "closed" : i.pending_review ? "received" : i.status === "done" ? "done" : i.status === "in_progress" || i.status === "waiting_on_owner" ? "in_progress" : "accepted";
  const times = [r.created_at, i?.claimed_at, i?.completion?.completed_at, i?.status_note_at].filter((x): x is string => !!x).sort();
  return {
    id: r.id, kind: r.kind, status, note: status === "done" ? (i?.completion?.note ?? null) : null,
    received_at: r.created_at, updated_at: times.at(-1)!,
  };
});

route("GET", "/sitemap", () => ({
  lists: store.lists.filter((l) => vis(l) === "public" && store.items.some((i) => i.list_id === l.id && !i.pending_review)).map((l) => ({ id: l.id, updated_at: l.updated_at })),
}));

route("GET", "/health", () => ({ ok: true, mock: true }));

route("POST", "/__reset", () => {
  resetMockStore();
  return NO_CONTENT;
});

// ---------- entry point

/**
 * Handle a request whose path starts with `/v1`. Any origin works, e.g.
 * `new Request("http://mock/v1/lists/lst_desk2026")`.
 */
// SPEC 20: routines (mock/routines.ts).
registerRoutineRoutes({
  rs: () => routineStore,
  route: route as never,
  helpers: {
    nowIso,
    newId,
    randomToken,
    requireSession,
    requireWriter,
    canWrite,
    actorRef: actorRef as never,
    getList,
    userById,
    lists: () => store.lists,
    items: () => store.items,
    entries: () => store.entries,
    unclaimed: (listId: string) => store.claims.some((x) => x.list_id === listId && x.kind === "unclaimed" && !x.used_by),
    emit: emit as never,
    webUrl: WEB,
    notFound,
    forbidden,
    invalid,
    conflict: (what: string, details?: unknown) => new HttpError(409, "conflict", what, details),
    created,
    noContent: NO_CONTENT,
  },
});

export async function handleMockRequest(req: Request): Promise<Response> {
  if (!store) seedAll();
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/v1/, "").replace(/\/$/, "") || "/";
  try {
    let body: Record<string, unknown> = {};
    if (req.method !== "GET" && req.method !== "HEAD") {
      const raw = await req.text();
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          throw invalid("Body must be JSON");
        }
      }
    }
    const caller = resolveCaller(req);
    for (const [method, pattern, handler] of routes) {
      if (method !== req.method) continue;
      const m = pattern.exec(path);
      if (!m) continue;
      const result = await handler({ req, url, caller, params: m.slice(1).map(decodeURIComponent), body });
      if (result === NO_CONTENT) return new Response(null, { status: 204 });
      if (result instanceof Response) return result;
      if (result instanceof Created) return json(result.value, 201);
      return json(result);
    }
    throw notFound(`No route for ${req.method} ${path}`);
  } catch (err) {
    if (err instanceof HttpError) {
      return json({ error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) } }, err.status);
    }
    console.error("[mock api]", err);
    return json({ error: { code: "internal", message: "Mock API error" } }, 500);
  }
}
