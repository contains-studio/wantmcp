/**
 * Wire types for the public Want MCP REST API (https://api.wantmcp.com/v1).
 *
 * Copied from the API contract (wire types and inputs only). These describe the public JSON shapes
 * the API returns (snake_case). Keep in sync with the API's /openapi.json.
 */

// ---------- Wire types ----------

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
  /** SPEC 12.2. The person's standing preferences, 0..600 plain text. Only ever returned to its person (and as context to their own agents). */
  bio: string;
  /** ISO 3166-1 alpha-2, e.g. "GB". */
  country: string | null;
  /** ISO 4217, e.g. "GBP". */
  currency: string | null;
  created_at: Timestamp;
}

export type ListFormat = "shopping" | "tasks" | "research";
export type ListVisibility = "public" | "private";
/** `waiting_on_owner` while the item has an open question (SPEC 12.1). */
export type ItemStatus = "open" | "in_progress" | "waiting_on_owner" | "done";
/** Statuses a caller can set directly; `waiting_on_owner` comes from asking a question. */
export type SettableItemStatus = "open" | "in_progress" | "done";
export type PriceSource = "retailer_page" | "aggregator" | "search" | "user" | "unknown";
export type EntryKind = "product" | "update" | "answer";

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
  /** SPEC 11.1. Default 'shopping'. Changeable by the owner only while the list has no items. */
  format: ListFormat;
  /** SPEC 11.2. A private list is readable only by its writers; to everyone else it does not exist. */
  visibility: ListVisibility;
  created_at: Timestamp;
  updated_at: Timestamp;
  /**
   * SPEC 13.7. For callers who can write the list: people who can write it (owner and active members), agents that
   * can, and invitations not yet accepted. null for everyone else. Absent from older API builds.
   */
  access?: { people: number; agents: number; pending_invites: number } | null;
  /** SPEC 13.1. Non-null while the list is unclaimed (started by an agent, waiting for its person to keep it). */
  claim?: { state: "unclaimed"; expires_at: Timestamp } | null;
  /** SPEC 12.2. The list's own note (0..600). Present only when the caller can write the list. */
  note?: string;
  /** Who wrote the note, for writers. */
  note_by?: "person" | "agent" | null;
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

/** How an item was finished. On shopping lists it mirrors `purchase`. */
export interface Completion {
  completed_at: Timestamp;
  completed_by: ActorRef;
  note: string | null;
  entry_id: string | null;
}

export interface Item {
  id: string;
  list_id: string;
  url: string; // https://wantmcp.com/l/{list_id}#itm_...
  text: string;
  /** Plain text, 0..2000, written by list writers. */
  details: string;
  due_at: Timestamp | null;
  status: ItemStatus;
  /** SPEC 12.1. The unanswered question, for writers; null for everyone else. */
  open_question: Question | null;
  /** SPEC 12.1. Every question on the item, oldest first. Writers only; absent for everyone else. */
  questions?: Question[];
  /** Who moved it to in_progress. Cleared when it goes back to open. */
  claimed_by: ActorRef | null;
  /** When the current claim started. */
  claimed_at: Timestamp | null;
  /**
   * The note given with the latest in_progress (or a release back to open): what the agent is doing now. Stays until
   * the status changes again. Absent from older API builds.
   */
  status_note?: string | null;
  /** When the status note was written. */
  status_note_at?: Timestamp | null;
  completion: Completion | null;
  /** Who wrote the item's text: a person, or an agent. A person editing it makes it theirs. */
  text_by?: "person" | "agent";
  created_by: ActorRef;
  created_at: Timestamp;
  /** Shopping lists only; null elsewhere. */
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
  /** SPEC 12.5. Where the price was seen. Older prices are `unknown`. */
  source: PriceSource;
  source_url: string | null;
  /** When the price was checked; defaults to `posted_at`. */
  checked_at: Timestamp;
  in_stock: boolean | null;
  /** True only for `retailer_page`. */
  verified: boolean;
}

/** SPEC 12.1. Never returned to anyone who cannot write the list. */
export interface Question {
  id: string;
  item_id: string;
  text: string;
  options: string[];
  asked_by: ActorRef;
  asked_at: Timestamp;
  answer: {
    text: string;
    answered_by: ActorRef;
    answered_at: Timestamp;
    /** How the answer arrived: on the web, in an agent's form (elicitation), or relayed by an agent. Absent from older API builds. */
    via?: "web" | "agent_form" | "agent" | null;
    via_agent?: { id: string; name: string } | null;
  } | null;
}

export interface Entry {
  id: string;
  item_id: string;
  list_id: string;
  url: string; // https://wantmcp.com/l/{list_id}#ent_...
  /** 'listed' is public. 'suggested' is an unpromoted outside suggestion: writers only, treat as untrusted text. */
  status: "listed" | "suggested";
  /** product on shopping lists, update on tasks, answer on research. */
  kind: EntryKind;
  author: ActorRef;
  title: string;
  description: string;
  /** Required on shopping lists; may be null on tasks and research lists. */
  product_url: string | null;
  /** 0..8 extra https links (sources, references). */
  links: string[];
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
  /** key: a write key for one list; oauth: a connected client; account: an account key (ak_, SPEC 13.6) for every list. */
  kind: "key" | "oauth" | "account";
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
  | "item.purchased"
  | "item.status_changed"
  | "question.asked" // writers only, always
  | "question.answered"; // writers only, always

export interface WantEvent {
  /** Monotonic cursor. Pass the last seen value as `after` to resume. */
  seq: number;
  type: EventType;
  list_id: string;
  created_at: Timestamp;
  /** Link to the thing on wantmcp.com. */
  url: string;
  actor: ActorRef;
  item?: Pick<Item, "id" | "url" | "text"> & { status?: ItemStatus; claimed_by?: ActorRef | null };
  entry?: Entry;
  comment?: Comment;
  price?: PriceObservation;
  question?: Question;
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
  /** Who sent the invitation: the person, or their agent (SPEC 13.7 share_list). Requested; absent from older API builds. */
  invited_by?: ActorRef | null;
}

/** GET /me/lists?include=summary: one list as /app shows it. */
export interface ListWithSummary extends ListSummary {
  summary: {
    items: number;
    /** Bought, done or answered. */
    done: number;
    /** Open questions someone other than the caller asked. */
    waiting: number;
    /** The newest thing by someone other than the caller (the caller's own agents count as someone else). */
    latest: {
      actor: ActorRef;
      kind: "entry" | "price" | "comment" | "status" | "answer" | "question";
      title: string;
      price?: { amount: Decimal; currency: string };
      at: Timestamp;
      /** The item id to link to. */
      anchor: string;
    } | null;
    note: { actor: ActorRef; text: string; item: { id: string; text: string }; at: Timestamp; anchor: string } | null;
  };
}

/**
 * SPEC 14.2: a person's own standing instructions, served to that person's agents only. Written only with a web
 * session; any agent credential gets forbidden.
 */
export interface Skill {
  id: string;
  /** Slug for the skill's URI, made by the server from the title on create; it does not change on edit. */
  name: string;
  /** 1–80 characters. */
  title: string;
  /** When an agent should use it, 0–300 characters, as stored: "" when the person left it empty (never null). */
  description: string;
  /** The instructions, 1–20,000 characters. */
  body: string;
  enabled: boolean;
  uri: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** POST /me/skills */
export interface SkillInput {
  title: string;
  body: string;
  description?: string;
  enabled?: boolean;
}

/** PATCH /me/skills/{id} */
export type SkillPatch = Partial<SkillInput>;

/** GET /me/skills: oldest first, no paging. */
export interface SkillList {
  data: Skill[];
}

/** GET /unsubscribe/{token}. */
export interface UnsubscribeState {
  valid: boolean;
  unsubscribed: boolean;
}

/** SPEC 13.1: POST /lists/unclaimed (no credential). */
export interface UnclaimedListInput {
  title: string;
  format?: ListFormat; // default shopping
  /** The agent's own name; becomes the key's agent tag. Required. */
  agent_name: string;
  /** Up to 10 initial items. `due` is an ISO 8601 timestamp. */
  wants?: Array<{ text: string; details?: string; due?: Timestamp | null }>;
  theme?: string | null;
  note?: string;
  description?: string;
}

export interface UnclaimedListResult {
  list: ListSummary;
  /** An ordinary write key for this one list (shown once). */
  key: string;
  /** https://wantmcp.com/claim/<claim_token>, for the person. */
  claim_url: string;
  expires_at: Timestamp;
}

/** SPEC 13.2: GET /claims/{claim_token}. Never includes the key. 404 when unknown, used or expired. */
export interface ClaimPreview {
  /** unclaimed: started by an agent with no account (13.1); handover: an owner handing a list to a person (13.6). */
  kind: "unclaimed" | "handover";
  /** Handover only: who is handing the list over. */
  from?: { handle: string };
  list: { title: string; format: ListFormat; theme: string | null; counts: { items: number; entries: number; open_questions: number } };
  /** The first ten wants, in order. Absent from older API builds. */
  items?: Array<{ text: string }>;
  /** Empty when the owner made a hand-over link on the web. */
  agent_name: string;
  expires_at: Timestamp;
  open_questions: Array<{ id: string; text: string; options: string[]; item: { id: string; text: string } }>;
}

/** SPEC 13.6: POST /lists/{id}/handover. */
export interface HandoverResult {
  claim_url: string;
  expires_at: Timestamp;
}

/** SPEC 13.7: POST /lists/{id}/invites. */
export interface ShareListResult {
  member: Member;
  /** False when an invitation to this address was already sent in the last 24 hours (no second email). */
  sent: boolean;
}

/** SPEC 13.7: GET /lists/{id}/access (writers only). */
export interface ListAccess {
  people: Array<{ handle: string; role: "owner" | "member" }>;
  agents: Array<{ id: string; name: string; kind: "key" | "oauth" | "account"; owner_handle: string }>;
  pending_invites: Array<{ id: string; email: string; invited_at: Timestamp; invited_by: ActorRef | null }>;
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
  description?: string; // 0..500 (shopping, outside suggestions) or 0..4000 (writers on tasks/research), plain text
  /** https only. Required on shopping lists, optional on tasks and research. */
  product_url?: string | null;
  /** 0..8 https URLs. */
  links?: string[];
  buy_url?: string | null; // https only
  image_url?: string | null; // https only, linked, never copied
  retailer?: string; // 0..80
  coupon_code?: string | null; // 0..40
  deal_starts_at?: Timestamp | null;
  deal_ends_at?: Timestamp | null;
  /** Optional first price observation. Shopping lists only. */
  price?: Decimal;
  original_price?: Decimal | null;
  currency?: string;
  /** Provenance of `price` (SPEC 12.5). Default: `user` for a person, `unknown` otherwise. */
  price_source?: PriceSource;
  price_source_url?: string | null;
  price_checked_at?: Timestamp | null;
  in_stock?: boolean | null;
  /** Outside agents only: self-reported client name. */
  agent_name?: string;
}

export interface PriceInput {
  price: Decimal;
  currency: string;
  original_price?: Decimal | null;
  note?: string | null; // 0..200
  /** SPEC 12.5. Default: `user` for a person, `unknown` otherwise. */
  source?: PriceSource;
  source_url?: string | null; // https, link-checked
  /** Default now. Not in the future. */
  checked_at?: Timestamp | null;
  in_stock?: boolean | null;
}

/** SPEC 12.2. What an agent should know about its person and the list. */
export interface AgentContext {
  bio: string;
  country: string | null;
  currency: string | null;
  /** The list's note when the caller can write it, else null. */
  list_note: string | null;
}

/** SPEC 12.4: the compact per-item read. */
export interface BestPrice {
  entry_id: string;
  price: Decimal;
  currency: string;
  source: PriceSource;
  verified: boolean;
  checked_at: Timestamp;
}

export interface ItemSummary {
  id: string;
  url: string;
  text: string;
  /** First 240 characters of `details`. */
  details_preview: string;
  status: ItemStatus;
  due_at: Timestamp | null;
  claimed_by: ActorRef | null;
  claimed_at: Timestamp | null;
  status_note?: string | null;
  status_note_at?: Timestamp | null;
  text_by?: "person" | "agent";
  /** Writers only; null for everyone else. */
  open_question: Question | null;
  entry_counts: { listed: number; suggested: number };
  comment_count: number;
  /** Shopping lists: lowest current price checked within 24 hours, verified preferred. Null elsewhere or if none. */
  best_price: BestPrice | null;
}

export interface ListSummaryPage {
  list: ListSummary;
  items: ItemSummary[];
  next_cursor: string | null;
}

/** SPEC 12.3: one line of the "what changed" digest. */
export interface Update {
  seq: number;
  type: EventType;
  at: Timestamp;
  list_id: string;
  url: string;
  actor: ActorRef;
  item?: { id: string; text: string; status?: ItemStatus };
  entry?: { id: string; title: string; status: "listed" | "suggested" };
  comment?: { id: string; body: string };
  price?: { price: Decimal; currency: string; source: PriceSource; verified: boolean };
  /** Writers only. */
  question?: { id: string; text: string; options: string[]; answer: string | null };
}

export interface StalledClaim {
  list_id: string;
  item: { id: string; url: string; text: string };
  claimed_by: ActorRef;
  claimed_at: Timestamp;
}

export interface UpdatesDigest {
  /** Oldest first ("newest last"). The caller's own actions are left out. */
  updates: Update[];
  /** Items claimed (in_progress) for more than 24 hours. */
  stalled_claims: StalledClaim[];
  /** Event cursor after this page; pass as `since` to resume explicitly. */
  next: number;
  has_more: boolean;
}

export interface ItemInput {
  text: string; // 1..500
  details?: string; // 0..2000
  due_at?: Timestamp | null;
}

export interface StatusInput {
  status: SettableItemStatus;
  note?: string | null; // 0..1000
  entry_id?: string | null;
  /** in_progress on an item another agent holds is a conflict unless this is true. Humans never need it. */
  take_over?: boolean;
}

export interface QuestionInput {
  text: string; // 1..500
  options?: string[]; // up to 6, each 1..80
}

export interface PurchaseInput {
  retailer?: string | null;
  price?: Decimal | null;
  currency?: string | null;
  entry_id?: string | null;
}

/** Targets of POST /reports. */
export type ReportTargetType = "list" | "item" | "entry" | "comment";

/** GET /v1/me/questions: open questions across every list the caller can write, newest first. */
export interface OpenQuestionsPage {
  questions: Array<{
    id: string;
    text: string;
    /** [] when the answer is free text. */
    options: string[];
    asked_at: Timestamp;
    asked_by: ActorRef;
    item: { id: string; /** first 140 characters */ text: string; url: string };
    list: { id: string; title: string; url: string };
  }>;
  /** Total open questions the caller can see, not the page size. */
  count: number;
  next_cursor: string | null;
}
