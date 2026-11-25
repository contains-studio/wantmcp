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
  ActorRef, AgentInfo, Comment, Entry, EntryInput, EventType, FeedEntry, Item, ItemStatus, ListDetail, ListFormat, ListSummary, ListVisibility,
  ItemSummary, ListSummaryPage, Member, OpenQuestionsPage, Page, PriceInput, PriceObservation, PriceSource, PurchaseInput, Question, UserSelf, WantEvent,
} from "../app/lib/types.ts";
import { seedStore } from "./seed.ts";
import { newId, randomToken, type AgentRow, type EntryRow, type ItemRow, type ListRow, type Store, type UserRow } from "./store.ts";

export const MOCK_LOGIN_CODE = "123456";
const WEB = "https://wantmcp.com";
const PAGE_SIZE = 20;

// Seeded on the first request, not at import: in a Worker, Date.now() is frozen at 0
// during global-scope evaluation, which would date all seed data to 1970.
let store: Store = undefined as unknown as Store;

/** Reset to the seed data (used by tests and `POST /__reset`). */
export function resetMockStore() {
  store = seedStore();
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
  if (!uid) return null;
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
    item_count: store.items.filter((i) => i.list_id === l.id).length,
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
  return out;
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
    completion:
      i.completion ??
      (i.purchase ? { completed_at: i.purchase.purchased_at, completed_by: i.purchase.purchased_by, note: null, entry_id: i.purchase.entry_id } : null),
    entry_counts: {
      listed: entries.filter((e) => e.status === "listed").length,
      suggested: writer ? entries.filter((e) => e.status === "suggested").length : 0,
    },
    comment_count: store.comments.filter((x) => x.target_type === "item" && x.target_id === i.id).length,
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
    owner_handle: userById(a.owner_id).handle,
    created_at: a.created_at,
    last_used_at: a.last_used_at,
  };
}

function userSelf(u: UserRow): UserSelf {
  return {
    id: u.id, email: u.email, handle: u.handle, updates_opt_in: u.updates_opt_in,
    bio: u.bio ?? "", country: u.country ?? null, currency: u.currency ?? null, created_at: u.created_at,
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
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalid("That doesn't look like an email address");
  // Lets contributors see the "email could not be sent" state.
  if (email === "fail@example.com") {
    throw new HttpError(503, "email_unavailable", "We couldn't send your sign-in email right now. Please try again in a few minutes.");
  }
  store.codes.set(email, { code: MOCK_LOGIN_CODE, attempts: 0, expires: Date.now() + 10 * 60_000 });
  console.log(`[mock api] login code for ${email}: ${MOCK_LOGIN_CODE}`);
  return new Response(null, { status: 204, headers: { "x-dev-login-code": MOCK_LOGIN_CODE } });
});

route("POST", "/auth/verify", ({ body }) => {
  const email = text("email", body.email, 254, true).toLowerCase();
  const code = text("code", body.code, 12, true);
  const rec = store.codes.get(email);
  if (!rec || rec.expires < Date.now()) throw invalid("That code has expired. Ask for a new one.");
  rec.attempts += 1;
  if (rec.attempts > 5) throw new HttpError(429, "rate_limited", "Too many attempts. Ask for a new code.");
  if (code !== rec.code) throw invalid("That code isn't right");
  store.codes.delete(email);
  let user = store.users.find((u) => u.email === email);
  if (!user) {
    user = { id: newId("usr"), email, handle: newHandle(), updates_opt_in: body.updates_opt_in === true, created_at: nowIso() };
    store.users.push(user);
  } else if (body.updates_opt_in === true) {
    user.updates_opt_in = true;
  }
  const token = "mock_sess_" + randomToken(32);
  store.sessions.set(token, user.id);
  return { token, user: userSelf(user) };
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

route("GET", "/me/lists", ({ caller }) => {
  if (!caller) throw unauthorized();
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
  if (a && a.owner_id !== c.user.id && listId && a.list_ids.includes(listId) && roleOf(c, listId) === "owner") {
    // The list owner removes someone else's agent from this list only.
    a.list_ids = a.list_ids.filter((id) => id !== listId);
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
    .filter((l) => vis(l) === "public" && store.items.some((i) => i.list_id === l.id))
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
  const items = store.items.filter((i) => i.list_id === l.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
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
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalid("That doesn't look like an email address");
  const existing = store.members.find((m) => m.list_id === params[0] && (m.invited_email === email || (m.user_id && userById(m.user_id).email === email)));
  if (existing) throw new HttpError(409, "conflict", "That person is already invited");
  const m = { id: newId("mem"), list_id: params[0], user_id: null, invited_email: email, role: "member" as const, status: "invited" as const, token: "inv_" + randomToken(24), created_at: nowIso() };
  store.members.push(m);
  console.log(`[mock api] invite link for ${email}: /invite/${m.token}`);
  return new Response(JSON.stringify(memberOut(m, true)), { status: 201, headers: { "content-type": "application/json", "x-dev-invite-token": m.token } });
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

route("GET", "/invites/{token}", ({ params }) => {
  const m = store.members.find((x) => x.token === params[0]);
  if (!m) throw notFound("This invite has expired or was revoked");
  const l = getList(m.list_id);
  return { list: { id: l.id, title: l.title, owner_handle: userById(l.owner_id).handle }, status: m.status };
});

route("POST", "/invites/{token}/accept", ({ caller, params }) => {
  const c = requireSession(caller);
  const m = store.members.find((x) => x.token === params[0]);
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
});

// keys
route("POST", "/lists/{id}/keys", ({ caller, params, body }) => {
  const c = requireSession(caller);
  getList(params[0]);
  if (!roleOf(c, params[0])) throw forbidden();
  const name = text("agent_name", body.agent_name, 60, true);
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

route("PATCH", "/items/{id}", ({ caller, params, body }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  requireAuthorOrOwner(i.created_by, c, i.list_id, "item");
  if (body.text !== undefined) i.text = text("text", body.text, 500, true);
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

route("GET", "/sitemap", () => ({
  lists: store.lists.filter((l) => vis(l) === "public" && store.items.some((i) => i.list_id === l.id)).map((l) => ({ id: l.id, updated_at: l.updated_at })),
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
export async function handleMockRequest(req: Request): Promise<Response> {
  store ??= seedStore();
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
