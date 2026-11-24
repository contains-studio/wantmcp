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
  ActorRef, AgentInfo, Comment, Entry, EntryInput, EventType, FeedEntry, Item, ListDetail, ListSummary,
  Member, Page, PriceInput, PriceObservation, PurchaseInput, UserSelf, WantEvent,
} from "../app/lib/types.ts";
import { seedStore } from "./seed.ts";
import { newId, randomToken, type AgentRow, type EntryRow, type ItemRow, type ListRow, type Store, type UserRow } from "./store.ts";

export const MOCK_LOGIN_CODE = "123456";
const WEB = "https://wantmcp.com";
const PAGE_SIZE = 20;

let store: Store = seedStore();

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
  if (!c) throw unauthorized();
  if (!canWrite(c, listId)) throw forbidden();
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
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
  if (c) out.my_role = roleOf(c, l.id);
  return out;
}

function pricesFor(entryId: string): PriceObservation[] {
  return store.prices.filter((p) => p.entry_id === entryId).sort((a, b) => a.posted_at.localeCompare(b.posted_at));
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

function itemOut(i: ItemRow, c: Caller): Item {
  const entries = store.entries.filter((e) => e.item_id === i.id);
  const writer = canWrite(c, i.list_id);
  return {
    id: i.id,
    list_id: i.list_id,
    text: i.text,
    created_by: i.created_by,
    created_at: i.created_at,
    purchase: i.purchase,
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
    item: { id: item.id, text: item.text, purchase: item.purchase },
    list: { id: l.id, url: `${WEB}/l/${l.id}`, title: l.title, owner_handle: userById(l.owner_id).handle },
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
  return { id: u.id, email: u.email, handle: u.handle, updates_opt_in: u.updates_opt_in, created_at: u.created_at };
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
  store.codes.set(email, { code: MOCK_LOGIN_CODE, attempts: 0, expires: Date.now() + 10 * 60_000 });
  console.log(`[mock api] login code for ${email}: ${MOCK_LOGIN_CODE}`);
  return NO_CONTENT;
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
  return userSelf(user);
});
route("DELETE", "/me", ({ caller }) => {
  const { user } = requireSession(caller);
  store.users = store.users.filter((u) => u.id !== user.id);
  for (const [t, uid] of store.sessions) if (uid === user.id) store.sessions.delete(t);
  return userSelf(user);
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

route("DELETE", "/agents/{id}", ({ caller, params }) => {
  const c = requireSession(caller);
  const a = store.agents.find((x) => x.id === params[0]);
  if (!a || a.owner_id !== c.user.id) throw notFound("Agent not found");
  store.agents = store.agents.filter((x) => x !== a);
  return store.agents.filter((x) => x.owner_id === c.user.id).map(agentOut);
});

// public feed + lists
route("GET", "/feed", ({ url }) => {
  const rows = store.entries
    .filter((e) => e.status === "listed")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(feedRow);
  return paginate(rows, url.searchParams.get("cursor"));
});

route("GET", "/lists", ({ url, caller }) => {
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const rows = store.lists
    .filter((l) => store.items.some((i) => i.list_id === l.id))
    .filter((l) => !q || l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((l) => listSummary(l, caller));
  return paginate(rows, url.searchParams.get("cursor"));
});

route("POST", "/lists", ({ caller, body }) => {
  const c = requireSession(caller);
  const title = text("title", body.title, 140, true);
  const description = text("description", body.description, 500);
  const t = nowIso();
  const l: ListRow = { id: newId("lst"), title, description, owner_id: c.user.id, allow_outside_suggestions: true, created_at: t, updated_at: t };
  store.lists.push(l);
  store.members.push({ id: newId("mem"), list_id: l.id, user_id: c.user.id, invited_email: null, role: "owner", status: "active", token: null, created_at: t });
  return created(listSummary(l, c));
});

route("GET", "/lists/{id}", ({ caller, params }) => {
  const l = getList(params[0]);
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
  if (typeof body.allow_outside_suggestions === "boolean") l.allow_outside_suggestions = body.allow_outside_suggestions;
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
  return created(memberOut(m, true));
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

route("POST", "/invites/{token}/accept", ({ caller, params }) => {
  const c = requireSession(caller);
  const m = store.members.find((x) => x.token === params[0]);
  if (!m) throw notFound("This invite has expired or was revoked");
  if (store.members.some((x) => x.list_id === m.list_id && x.user_id === c.user.id && x.status === "active")) {
    store.members = store.members.filter((x) => x !== m);
  } else {
    m.user_id = c.user.id;
    m.status = "active";
    m.token = null;
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
  const i: ItemRow = { id: newId("itm"), list_id: params[0], text: text("text", body.text, 500, true), created_by: actorRef(c), created_at: nowIso(), purchase: null };
  store.items.push(i);
  touch(i.list_id);
  emit("item.created", i.list_id, actorRef(c), `${WEB}/l/${i.list_id}#${i.id}`, { item: { id: i.id, text: i.text } });
  return created(itemOut(i, c));
});

route("PATCH", "/items/{id}", ({ caller, params, body }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  i.text = text("text", body.text, 500, true);
  touch(i.list_id);
  return itemOut(i, c);
});

route("DELETE", "/items/{id}", ({ caller, params }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
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
  i.purchase = { purchased_at: nowIso(), purchased_by: actorRef(c), retailer, price, currency, entry_id: input.entry_id ?? null };
  touch(i.list_id);
  emit("item.purchased", i.list_id, actorRef(c), `${WEB}/l/${i.list_id}#${i.id}`, { item: { id: i.id, text: i.text } });
  return itemOut(i, c);
});

route("DELETE", "/items/{id}/purchase", ({ caller, params }) => {
  const i = getItem(params[0]);
  const c = requireWriter(caller, i.list_id);
  i.purchase = null;
  touch(i.list_id);
  return itemOut(i, c);
});

// entries
function getEntry(id: string): EntryRow {
  const e = store.entries.find((x) => x.id === id && x.status !== "rejected");
  if (!e) throw notFound("Entry not found");
  return e;
}

route("GET", "/items/{id}/entries", ({ caller, params, url }) => {
  const i = getItem(params[0]);
  const inc = url.searchParams.get("include_suggested") === "1";
  return { item: itemOut(i, caller), entries: visibleEntries(i.id, caller, inc).map(entryOut) };
});

route("POST", "/items/{id}/entries", ({ caller, params, body }) => {
  const i = getItem(params[0]);
  const l = getList(i.list_id);
  const input = body as unknown as EntryInput;
  const writer = canWrite(caller, l.id);
  if (caller && !writer) throw forbidden();
  if (!writer && !l.allow_outside_suggestions) throw forbidden("This list doesn't accept outside suggestions");
  const author: ActorRef = writer && caller ? actorRef(caller) : { kind: "outside", name: input.agent_name ? text("agent_name", input.agent_name, 60) : null };
  const productUrl = checkUrl("product_url", input.product_url, true)!;
  const urlKey = (u: string) => {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/$/, "")).toLowerCase();
  };
  const dup = store.entries.find((x) => x.item_id === i.id && x.status !== "rejected" && urlKey(x.product_url) === urlKey(productUrl));
  if (dup) throw new HttpError(409, "conflict", "That product is already on this item", { entry_id: dup.id });
  const firstPrice = decimal("price", input.price);
  if (firstPrice && !input.currency) throw invalid("currency is required when price is given");
  const t = nowIso();
  const e: EntryRow = {
    id: newId("ent"), item_id: i.id, list_id: l.id, status: writer ? "listed" : "suggested", author,
    title: text("title", input.title, 140, true),
    description: text("description", input.description, 500),
    product_url: productUrl,
    buy_url: checkUrl("buy_url", input.buy_url),
    image_url: checkUrl("image_url", input.image_url),
    retailer: text("retailer", input.retailer, 80) || new URL(productUrl).hostname.replace(/^www\./, ""),
    coupon_code: text("coupon_code", input.coupon_code, 40) || null,
    deal_starts_at: input.deal_starts_at ?? null,
    deal_ends_at: input.deal_ends_at ?? null,
    created_at: t, updated_at: t, promoted_by: null, promoted_at: null,
  };
  store.entries.push(e);
  if (firstPrice) {
    store.prices.push({ id: newId("prc"), entry_id: e.id, price: firstPrice, original_price: decimal("original_price", input.original_price), currency: text("currency", input.currency, 3, true).toUpperCase(), note: null, posted_by: author, posted_at: t });
  }
  touch(l.id);
  emit(writer ? "entry.listed" : "entry.suggested", l.id, author, `${WEB}/l/${l.id}#${e.id}`, { entry: entryOut(e) });
  return created(entryOut(e));
});

route("PATCH", "/entries/{id}", ({ caller, params, body }) => {
  const e = getEntry(params[0]);
  const c = requireWriter(caller, e.list_id);
  if (!sameActor(e.author, c) && roleOf(c, e.list_id) !== "owner") throw forbidden("Only the author or list owner can edit this");
  const input = body as Partial<EntryInput>;
  if (input.title !== undefined) e.title = text("title", input.title, 140, true);
  if (input.description !== undefined) e.description = text("description", input.description, 500);
  if (input.product_url !== undefined) e.product_url = checkUrl("product_url", input.product_url, true)!;
  if (input.image_url !== undefined) e.image_url = checkUrl("image_url", input.image_url);
  if (input.coupon_code !== undefined) e.coupon_code = input.coupon_code || null;
  e.updated_at = nowIso();
  return entryOut(e);
});

route("DELETE", "/entries/{id}", ({ caller, params }) => {
  const e = getEntry(params[0]);
  const c = requireWriter(caller, e.list_id);
  if (!sameActor(e.author, c) && roleOf(c, e.list_id) !== "owner") throw forbidden("Only the author or list owner can remove this");
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

route("GET", "/lists/{id}/suggestions", ({ caller, params, url }) => {
  const l = getList(params[0]);
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
  if (e.status === "suggested" && !canWrite(caller, e.list_id)) throw notFound("Entry not found");
  return pricesFor(e.id);
});

route("POST", "/entries/{id}/prices", ({ caller, params, body }) => {
  const e = getEntry(params[0]);
  const c = requireWriter(caller, e.list_id);
  const input = body as unknown as PriceInput;
  const p: PriceObservation = {
    id: newId("prc"), entry_id: e.id, price: decimal("price", input.price, true)!,
    original_price: decimal("original_price", input.original_price),
    currency: text("currency", input.currency, 3, true).toUpperCase(),
    note: text("note", input.note, 200) || null, posted_by: actorRef(c), posted_at: nowIso(),
  };
  store.prices.push(p);
  e.updated_at = p.posted_at;
  touch(e.list_id);
  emit("price.posted", e.list_id, actorRef(c), `${WEB}/l/${e.list_id}#${e.id}`, { price: p });
  return created(p);
});

// comments
route("GET", "/lists/{id}/comments", ({ params, url }) => {
  const l = getList(params[0]);
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
  if (!sameActor(cm.author, c) && roleOf(c, cm.list_id) !== "owner") throw forbidden("Only the author or list owner can delete this");
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
    .filter((e) => e.type !== "entry.suggested" || canWrite(c, e.list_id))
    .filter((e) => !types || types.includes(e.type))
    .slice(0, 100);
  return { events, next: events.at(-1)?.seq ?? after };
}
route("GET", "/lists/{id}/events", ({ caller, params, url }) => eventsFor(caller, [getList(params[0]).id], url));
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
  lists: store.lists.filter((l) => store.items.some((i) => i.list_id === l.id)).map((l) => ({ id: l.id, updated_at: l.updated_at })),
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
