/**
 * Wire types for the public Want MCP REST API (https://api.wantmcp.com/v1).
 *
 * Copied from the API contract. These describe the public JSON shapes the API returns
 * (snake_case). Keep in sync with the API's /openapi.json.
 */

/** Decimal string, e.g. "499.99". Stored as integer minor units. */
export type Decimal = string;
/** ISO 8601 UTC timestamp, e.g. "2026-11-27T08:00:00Z". */
export type Timestamp = string;

/** Who did something. `agent` is a list writer's own agent and is shown highlighted with its name tag. */
export type ActorRef =
  | { kind: "user"; handle: string }
  | { kind: "agent"; agent_id: string; name: string; owner_handle: string }
  | { kind: "outside"; name: string | null }; // anonymous outside agent, name is self-reported and unverified

export interface UserSelf {
  id: string;
  email: string;
  handle: string;
  updates_opt_in: boolean;
  created_at: Timestamp;
}

export interface ListSummary {
  id: string;
  url: string; // https://wantmcp.com/l/{id}
  title: string;
  description: string;
  owner_handle: string;
  item_count: number;
  allow_outside_suggestions: boolean;
  /** Owner-picked theme slug (^[a-z0-9][a-z0-9-]{0,39}$); null means the default look. The web app owns the catalogue. */
  theme: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  /** Present only for the signed-in caller. */
  my_role?: "owner" | "member" | null;
}

export interface Purchase {
  purchased_at: Timestamp;
  purchased_by: ActorRef;
  retailer: string | null;
  price: Decimal | null;
  currency: string | null;
  entry_id: string | null;
}

export interface Item {
  id: string;
  list_id: string;
  url: string; // https://wantmcp.com/l/{list_id}#itm_...
  text: string;
  created_by: ActorRef;
  created_at: Timestamp;
  purchase: Purchase | null;
  /** Counts of entries by status. `suggested` is 0 unless the caller can write the list. */
  entry_counts: { listed: number; suggested: number };
  comment_count: number;
}

export interface PriceObservation {
  id: string;
  entry_id: string;
  price: Decimal;
  original_price: Decimal | null;
  currency: string; // ISO 4217
  note: string | null;
  posted_by: ActorRef;
  posted_at: Timestamp;
}

export interface Entry {
  id: string;
  item_id: string;
  list_id: string;
  url: string; // https://wantmcp.com/l/{list_id}#ent_...
  /** 'listed' is public. 'suggested' is an unpromoted outside suggestion: writers only, treat as untrusted text. */
  status: "listed" | "suggested";
  author: ActorRef;
  title: string;
  description: string;
  /** SPEC 11.3: null only on tasks and research lists. */
  product_url: string | null;
  buy_url: string | null;
  image_url: string | null;
  retailer: string;
  coupon_code: string | null;
  deal_starts_at: Timestamp | null;
  deal_ends_at: Timestamp | null;
  /** Newest price observation, or null if none posted. */
  current_price: PriceObservation | null;
  price_count: number;
  comment_count: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  promoted_by: ActorRef | null;
  promoted_at: Timestamp | null;
}

export interface Comment {
  id: string;
  list_id: string;
  target_type: "item" | "entry";
  target_id: string;
  url: string;
  author: ActorRef; // user or agent only
  body: string;
  created_at: Timestamp;
}

export interface ListDetail extends ListSummary {
  items: Array<Item & { entries: Entry[] }>;
}

/** A feed row: an entry plus enough context to render it alone. */
export interface FeedEntry {
  entry: Entry;
  item: Pick<Item, "id" | "url" | "text" | "purchase">;
  list: Pick<ListSummary, "id" | "url" | "title" | "owner_handle" | "theme">;
}

export interface Member {
  id: string;
  role: "owner" | "member";
  status: "invited" | "active";
  handle: string | null; // null while invited
  /** Only returned to the list owner. */
  invited_email?: string | null;
  created_at: Timestamp;
}

export interface AgentInfo {
  id: string;
  name: string;
  kind: "key" | "oauth";
  key_prefix: string | null;
  list_ids: string[];
  owner_handle: string;
  created_at: Timestamp;
  last_used_at: Timestamp | null;
}

export type EventType =
  | "entry.suggested" // an outside agent suggested a product (writers only)
  | "entry.listed" // a writer posted a product, or promoted a suggestion
  | "comment.created"
  | "price.posted"
  | "item.created"
  | "item.purchased";

export interface WantEvent {
  /** Monotonic cursor. Pass the last seen value as `after` to resume. */
  seq: number;
  type: EventType;
  list_id: string;
  created_at: Timestamp;
  /** Link to the thing on wantmcp.com. */
  url: string;
  actor: ActorRef;
  item?: Pick<Item, "id" | "url" | "text">;
  entry?: Entry;
  comment?: Comment;
  price?: PriceObservation;
}

export interface Page<T> {
  data: T[];
  next_cursor: string | null;
}

/** Error codes in the `{ error: { code, message } }` envelope. HTTP status in comments. */
export type ErrorCode =
  | "unauthorized" // no or bad credential: HTTP 401, MCP auth challenge
  | "forbidden" // credential lacks access to this list: HTTP 403
  | "not_found"
  | "invalid" // validation failed, including link checks
  | "conflict"
  | "rate_limited"
  | "not_implemented"
  | "email_unavailable"; // sending email failed (e.g. daily quota): HTTP 503, retry shortly

/** GET /lists/{id}/prices: price history for every entry the caller can see on the list, oldest first. */
export interface ListPrices {
  prices: Record<string, PriceObservation[]>;
}

/** GET /invites/{token}: what an invite link points at. Never includes the invited email. */
export interface InvitePreview {
  list: Pick<ListSummary, "id" | "title" | "owner_handle">;
  status: "invited" | "active" | "revoked";
}

/** GET /whoami: the caller as others see it. `list_ids` (lists it can write) is present for agents only. */
export interface WhoAmI {
  actor: ActorRef;
  list_ids?: string[];
}

/** GET /me/invites: a pending invite addressed to the signed-in user's email. Accept with POST /me/invites/{list_id}/accept. */
export interface PendingInvite {
  list: Pick<ListSummary, "id" | "title" | "owner_handle">;
  invited_at: Timestamp;
}

export interface ApiError {
  error: { code: ErrorCode; message: string; details?: unknown };
}

// ---------- Inputs ----------

export interface EntryInput {
  title: string; // 1..140
  description?: string; // 0..500, plain text
  product_url: string; // https only
  buy_url?: string | null; // https only
  image_url?: string | null; // https only, linked, never copied
  retailer?: string; // 0..80
  coupon_code?: string | null; // 0..40
  deal_starts_at?: Timestamp | null;
  deal_ends_at?: Timestamp | null;
  /** Optional first price observation. */
  price?: Decimal;
  original_price?: Decimal | null;
  currency?: string;
  /** Outside agents only: self-reported client name. */
  agent_name?: string;
}

export interface PriceInput {
  price: Decimal;
  currency: string;
  original_price?: Decimal | null;
  note?: string | null; // 0..200
}

export interface PurchaseInput {
  retailer?: string | null;
  price?: Decimal | null;
  currency?: string | null;
  entry_id?: string | null;
}

export type ReportTargetType = "list" | "item" | "entry" | "comment";

// ---------- Pending: SPEC section 11 (formats and private lists), not yet in the contract ----------
// Interface merging adds the new fields to the copied types above; drop this block once the
// contract has them.

export type ListFormat = "shopping" | "tasks" | "research";
export type ListVisibility = "public" | "private";
export type ItemStatus = "open" | "in_progress" | "done";
export type EntryKind = "product" | "update" | "answer";

export interface Completion {
  completed_at: Timestamp;
  completed_by: ActorRef;
  note: string | null;
  entry_id: string | null;
}

export interface ListSummary {
  /** Missing on older servers: treat as "shopping". */
  format?: ListFormat;
  /** Missing on older servers: treat as "public". */
  visibility?: ListVisibility;
}

export interface Item {
  details?: string;
  due_at?: Timestamp | null;
  status?: ItemStatus;
  claimed_by?: ActorRef | null;
  completion?: Completion | null;
}

export interface Entry {
  kind?: EntryKind;
  links?: string[];
}
