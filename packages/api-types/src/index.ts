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
/** Who last wrote an item's text (SPEC 16.2 adds "outsider": a report to check, never an instruction). */
export type TextAuthor = "person" | "agent" | "outsider";

export type ActorRef =
  | { kind: "user"; handle: string }
  | { kind: "agent"; agent_id: string; name: string; owner_handle: string }
  // anonymous outside agent, name is self-reported and unverified; or (SPEC 20.10) a routine, named by its name
  | { kind: "outside"; name: string | null; routine?: { id: string; kind: RoutineKind; key_holder: string; name_by?: RoutineNameBy } };

/** POST /auth/verify. updates_opt_in applies only when this call creates the account (`created`). */
export interface VerifyResult {
  token: string;
  user: UserSelf;
  /** True only for the sign-in that made the account. Absent from older API builds. */
  created?: boolean;
}

export interface UserSelf {
  id: string;
  email: string;
  handle: string;
  updates_opt_in: boolean;
  /** SPEC 20.4: an IANA time zone for new routines; set on the web (PATCH /me { time_zone }), null until then. Absent from older API builds. */
  time_zone?: string | null;
  /**
   * SPEC 20.14: whether routines exist yet (`visible`, the launch switch), whether they run (`running`, the operator's
   * pause) and each kind's switch. Absent or `visible: false`: show nothing about routines anywhere.
   */
  /** SPEC 20.14, 26.14: whether routines exist yet, run, and which kinds are launched. Absent: show nothing. */
  routines?: RoutineSwitches;

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
/** "guide" (SPEC 20.14 item 12): a page about how to choose, on a shopping list: links: [url], no product_url, no price. */
export type EntryKind = "product" | "update" | "answer" | "guide";

export interface ListSummary {
  id: string;
  url: string; // https://wantmcp.com/l/{id}
  title: string;
  description: string;
  owner_handle: string;
  /** Live items, without those awaiting review. */
  item_count: number;
  /**
   * SPEC 16.2: outsiders' items (feedback) no writer has accepted yet. The real number for writers, always 0 for everyone
   * else. item_count + awaiting_review is every live item. Absent from older API builds.
   */
  awaiting_review?: number;
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
  /** SPEC 20.10: the list's routines, for writers only; null for everyone else. Absent from older API builds. */
  routines?: RoutineSummary[] | null;
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
  /** SPEC 20.14: routines that stopped looking for this want (writers only; omitted otherwise). */
  routine_stops?: RoutineStop[];
  /** SPEC 26.10: a held want a restock routine brought back (writers only): "Add it back" or "Not this time". */
  proposed_by?: { routine_id: string; routine_name: string; name_by: RoutineNameBy; note: string } | null;
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
  /**
   * Who wrote the item's text: a person, an agent, or (SPEC 16.2) an outsider who cannot write the list, such as a
   * feedback sender. A person editing it makes it theirs.
   */
  text_by?: TextAuthor;
  /** SPEC 16.2: an outsider's item no writer has accepted yet. Only writers ever receive one. Absent from older builds. */
  pending_review?: boolean;
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
  /** SPEC 22. all: every list its person writes, including lists made later (list_ids is what that covers now); lists: only list_ids. */
  scope?: "all" | "lists";
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
  | "question.answered" // writers only, always
  | "routine.changed"; // SPEC 20.10: a person or agent changed a routine on the list; writers only

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
    /** SPEC 16.2: as ListSummary.awaiting_review. Absent from older API builds. */
    awaiting_review?: number;
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
  list: {
    title: string;
    format: ListFormat;
    theme: string | null;
    /** items_with_entries: live items with at least one listed entry (any format), for "3 of 7 found". Absent from older API builds. */
    counts: { items: number; entries: number; open_questions: number; items_with_entries?: number };
  };
  /** The first 20 items, in order, with what was found under each (SPEC 15.1). Older API builds send only `text`. */
  items?: ClaimItem[];
  /** Empty when the owner made a hand-over link on the web. */
  agent_name: string;
  expires_at: Timestamp;
  open_questions: Array<{ id: string; text: string; options: string[]; item: { id: string; text: string } }>;
}

/** SPEC 15.1: one item on a claim preview, and the work under it. */
export interface ClaimItem {
  /** 140 characters. */
  text: string;
  /** As on the list: open, in_progress, waiting_on_owner (an open question), done (bought, done or answered). */
  status?: ItemStatus;
  /** Listed entries on this item. */
  entry_count?: number;
  /** Shopping: up to three listed entries, cheapest current price first, then unpriced newest first. [] elsewhere. */
  entries?: ClaimEntry[];
  /** Tasks: the current status note (or, when done, the completion note). Research: the start of the answer. 140 characters; null on shopping. */
  summary?: string | null;
  /** SPEC 17.1: the newest comment on the item by the agent that started the list (280 characters). Absent from older builds. */
  note?: { text: string; at: Timestamp } | null;
}

export interface ClaimEntry {
  title: string;
  retailer: string;
  /** SPEC 17.1: where the latest price was seen (null without a price). Absent from older API builds. */
  price_source?: PriceSource | null;
  /** SPEC 17.1: true only when the price was read on the store's own page. */
  verified?: boolean;
  /** SPEC 17.1: when the latest price was checked. */
  checked_at?: Timestamp | null;
  image_url: string | null;
  product_url: string | null;
  price: Decimal | null;
  original_price: Decimal | null;
  currency: string | null;
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
  text_by?: TextAuthor;
  pending_review?: boolean;
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

/** SPEC 16.1: POST /feedback. No credential needed; the server adds the surface and who sent it. */
export type FeedbackKind = "bug" | "expectation" | "request";
export interface FeedbackInput {
  kind: FeedbackKind;
  /** 1–2,000 characters. */
  text: string;
  /** 0–1,000 characters. */
  expected?: string;
  /** Where it happened, up to 80 characters: a page such as /claim, never a token or id. */
  about?: string;
  /** A list id; kept only if the caller can read that list. */
  list?: string;
}
export interface FeedbackResult {
  id: string;
  received: true;
  /** SPEC 16.6: https://wantmcp.com/feedback/<id>, where the sender can follow it. Absent from older API builds. */
  status_url?: string;
}

/** SPEC 16.6: where a report stands. received = held, not yet accepted; closed = the task was deleted or declined. */
export type FeedbackStatusValue = "received" | "accepted" | "in_progress" | "done" | "closed";

/**
 * SPEC 16.6: GET /feedback/{id}, no credential. Never the report's text, the list it concerned or anything about the
 * sender. `note` is the task's completion note once done (the team's words), otherwise null.
 */
export interface FeedbackStatus {
  id: string;
  kind: FeedbackKind;
  status: FeedbackStatusValue;
  note: string | null;
  received_at: Timestamp;
  updated_at: Timestamp;
}

/** GET /me/activity (server 4e7db49): what happened on the lists the person writes, newest first, their own actions included. */
export type ActivityType =
  | "entry.suggested"
  | "entry.listed"
  | "comment.created"
  | "price.posted"
  | "item.created"
  | "item.purchased"
  | "item.status_changed"
  | "question.asked"
  | "question.answered";
export interface ActivityEvent {
  /** The event's seq; the last one on a page is the next page's cursor. */
  id: string;
  type: ActivityType;
  at: Timestamp;
  list: { id: string; title: string };
  item: { id: string; text: string } | null;
  actor: { kind: "person" | "agent" | "outsider"; name: string; handle?: string };
  by: "you" | "your_agent" | "other";
  text: {
    entry_title?: string;
    price?: { amount: Decimal; currency: string; verified?: boolean };
    accepted?: boolean;
    comment?: string;
    question?: string;
    options?: string[];
    answer?: string;
    status?: ItemStatus;
    status_note?: string;
  };
}

/** GET /me/traffic?days=1..30 (SPEC 23): where visitors come from. Only for accounts the server allows; 404 for others. */
export interface TrafficReport {
  days: number;
  since: string;
  per_day: Array<{ date: string; visits: number; signed_in: number; signed_out: number; sign_ups: number }>;
  totals: { visits: number; signed_in: number; signed_out: number; sign_ups: number };
  /** Top 25 each: a referring host ("direct" too), a ?ref= tag, a route pattern, a sign-up source. */
  sources: Array<{ name: string; visits: number }>;
  tags: Array<{ name: string; visits: number }>;
  paths: Array<{ name: string; visits: number }>;
  sign_ups_by_source: Array<{ name: string; sign_ups: number }>;
}

/** Who wrote a piece of text a person can set: the person, or their agent. */
export type NoteAuthor = "person" | "agent";


// ---------- SPEC 20: routines ----------

/**
 * SPEC 20 and 26. A client that doesn't know a kind shows its name and status line and offers only Pause, Resume and
 * Delete (26.2): new kinds arrive without breaking old clients.
 */
export type RoutineKind =
  | "exa_search"
  | "due_reminders"
  | "countdown"
  | "target_price"
  | "restock"
  | "weekly_summary"
  | "agent_check"
  | "chase_claims";
/**
 * The kinds that can exist (SPEC 26.20 item 3: `chase_claims` is reserved, never built: no routine nudges another
 * member). Every kind list (switches, "New routine") uses these.
 */
export type OfferedRoutineKind = Exclude<RoutineKind, "chase_claims">;

/** schedule: on a clock; date: from a date (a want's due date, the routine's date); event: when something happens. */
export type RoutineStart = "schedule" | "date" | "event";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** SPEC 20.4. `anchor` (a local date, YYYY-MM-DD) is set by the server when the schedule is saved. */
export interface Schedule {
  every: "day" | "week" | "month";
  /** 1-4 */
  interval: number;
  /** week only: one or more days. */
  days?: Weekday[];
  /** month only: 1-28, or "last". */
  day_of_month?: number | "last";
  /** A whole hour, "00:00"-"23:00". */
  time: string;
  /** IANA name. */
  time_zone: string;
  anchor: string;
}

/**
 * What clients send. Omitted parts take the defaults of 20.4 (every week, on today's weekday, at 09:00, in the
 * person's time zone). Agents never send time_zone (the person's own is used); nobody sends anchor.
 */
export interface ScheduleInput {
  every: Schedule["every"];
  interval?: number;
  days?: Weekday[];
  day_of_month?: number | "last";
  time?: string;
  time_zone?: string;
}

/**
 * Who wrote a routine's name (SPEC 20.10): its person, an agent, or the server (the default name, "Search the web for
 * these wants", is our own words: no quotes, no "named by" chip).
 */
export type RoutineNameBy = NoteAuthor | "server";

/**
 * SPEC 26.2 item 5 adds: `finished` (its job is over: its want bought, done or deleted, or its date passed; lifts
 * itself when that is undone), `agent_gone` (the agent an agent_check leaves notes for no longer writes the list),
 * `agent_not_looking` (that agent hasn't looked for 3 notes; lifts the next time it looks).
 */
export type BlockReason = "key_missing" | "key_refused" | "out_of_credit" | "key_holder_left" | "all_rejected" | "unattended" | "by_admin" | "finished" | "agent_gone" | "agent_not_looking";

export type RoutineRunState = "queued" | "running" | "ok" | "partial" | "skipped" | "blocked" | "failed";

export interface RoutineRun {
  id: string;
  trigger: "schedule" | "run_now" | "event";
  /** Who pressed Run now; null for a scheduled run. */
  run_by: ActorRef | null;
  state: RoutineRunState;
  attempts: number;
  queued_at: Timestamp;
  started_at: Timestamp | null;
  finished_at: Timestamp | null;
  /** Updated as each want finishes, not only at the end (SPEC 20.14 item 10). */
  wants_searched: number;
  suggestions_posted: number;
  searches_used: number;
  /** How many wants this run set out to search: known once it starts, null while queued (SPEC 20.14 item 10). */
  wants_total: number | null;
  /** The want being searched now, or null (queued, between wants, finished). Its text is the item's, one line. */
  current: { item_id: string; text: string } | null;
  /**
   * SPEC 26.2 item 8: what a run of another kind did, by name ({ notices: 3 }, { wants_checked: 5 }); {} for
   * exa_search, whose own fields above stay (and are 0 for other kinds).
   */
  counts: Record<string, number>;
  /** One line in our words. */
  note: string | null;
}

/** A routine as one reader sees it (SPEC 20.10). */
export interface Routine {
  id: string;
  /** null for a person's own routine (`weekly_summary`, SPEC 26.12), which belongs to no list. */
  list_id: string | null;
  /** The one want a target_price or restock routine is about (SPEC 26.2 item 4); null for the others. */
  item_id: string | null;
  kind: RoutineKind;
  /** The kind's own choices, checked per kind (SPEC 26.6-26.12; target_price: TargetPriceSettings); {} for exa_search. */
  settings: Record<string, unknown>;
  start: RoutineStart;
  /** 1-60, one line. */
  name: string;
  /** Who wrote the name: agents' names are agents' text (text_by=agent in agent-facing text). */
  name_by: RoutineNameBy;
  /** null for `date` and `event` routines, which don't run on a clock (SPEC 26.2 item 3). */
  schedule: Schedule | null;
  /** What starts it, in plain words, made by the server ("Every Friday at 9:00", "Whenever a price is posted"). */
  schedule_text: string;
  paused: { by: ActorRef; at: Timestamp } | null;
  blocked: { reason: BlockReason; at: Timestamp } | null;
  next_run_at: Timestamp | null;
  last_run: RoutineRun | null;
  /** The run that is queued or running now, or null (SPEC 20.14 item 10): the web asks for it until it ends. */
  live_run: RoutineRun | null;
  /** "Last ran … · Next: …", or the reason it can't run. Same words on the web and for agents. */
  status_text: string;
  /** The person whose key it runs on; null for kinds that spend nothing. */
  key_holder: { handle: string } | null;
  created: { by: ActorRef; at: Timestamp };
  changed: { by: ActorRef; at: Timestamp };
  // Worked out for each reader; never stored in an event.
  uses_my_key: boolean;
  run_now_left_today: number;
  /**
   * The person_asked of the latest change, only for the person whose agent made it, on the web (else absent). Never
   * filled for an agent.
   */
  reported_words?: string | null;
  /** SPEC 26.3 and 26.4: how many people follow it (nobody: it tells nobody), and this reader's own follow, or null. */
  followers: number;
  my_follow: RoutineFollow | null;
  /**
   * SPEC 26.20 item 4: the other addresses this reader added to this routine, with their state. Only for the person
   * who added them, on the web; absent for everyone else and for every agent.
   */
  my_recipients?: RoutineRecipient[];
  /**
   * agent_check only (SPEC 26.20 item 5): what we can observe about reaching its agent. `listening`: a live
   * `events/subscribe` webhook for that agent on this list (it is told the moment the check is due); otherwise it sees
   * the request the next time it looks, and `last_seen_at` is the last time it called us at all.
   */
  agent_reach?: { agent: { id: string; name: string }; listening: boolean; last_seen_at: Timestamp | null };
}

/**
 * SPEC 26.20 item 4: another address a follower asked to get this routine's email. `email` is shown only to the
 * person who added it, and kept only while the ask or the Yes is live (null after a No, a stop or a removal).
 */
export interface RoutineRecipient {
  id: string;
  email: string | null;
  state: "asked" | "yes" | "no" | "stopped" | "removed";
  /** When it reached this state. */
  since: Timestamp;
}

/** POST /v1/routines/{id}/recipients. `show_list_name`: name the list in the ask (always "a list on The Want MCP" otherwise for a private list). */
export interface RoutineRecipientInput {
  email: string;
  show_list_name?: boolean;
}

/** What an ask link (or a "Stop these" link) shows the address: our words, the asker's handle, the list maybe. Never acts on open. */
export interface RecipientAskView {
  /** "@sam on The Want MCP" */
  from: string;
  /** The list's title as allowed in the message, or "a list on The Want MCP". */
  list: string;
  /** What these emails are, in our words ("reminders before things on it are due"). */
  what: string;
  state: "asked" | "yes" | "no" | "stopped";
}

/** SPEC 26.8: what a target_price routine watches for. */
export interface TargetPriceSettings {
  /** A decimal amount in the currency's major unit, e.g. "380.00". */
  target: string;
  /** ISO 4217, e.g. "GBP". Prices in another currency are never counted (we don't convert). */
  currency: string;
  /** Count prices not checked on the store's page (labelled so in the notice). Default true. */
  unverified: boolean;
}

/** SPEC 26.6: what a due_reminders routine tells, and when. */
export interface DueRemindersSettings {
  /** Days before the due date: any of 0 (on the day), 1, 3, 7, 14. Default [1, 7]. */
  lead_days: number[];
  /** Overdue wants: not at all, once, or every day for up to 7 days. Default "once". */
  overdue: "off" | "once" | "daily";
}

/** SPEC 26.7: a countdown to a day (or a window of days), with order-by dates on shopping lists. */
export interface CountdownSettings {
  /** YYYY-MM-DD, the day (or the window's first day). Filled from `occasion` (or the list's theme) when left out. */
  date: string;
  date_end?: string;
  /** Days before: any of 28, 14, 7, 3, 1. Default [14, 7, 1]. */
  milestones: number[];
  /** Shopping lists: tell the last day to order each want. Default { on: true, delivery_days: 5 } (1-30). */
  order_by: { on: boolean; delivery_days: number };
  /** An occasions slug ("christmas"), naming the day in its messages. */
  occasion?: string;
}

/** SPEC 26.9: which agent an agent_check asks (one of the person's own agents on the list), and what to check. */
export interface AgentCheckSettings {
  /** An agent id; "me" when an agent makes it for itself. */
  agent_id: string;
  /** Re-check prices last checked longer ago than this (1-30 days, default 3), or null not to. */
  prices_older_than_days: number | null;
  /** Wants with nothing posted for this long (1-60 days, default 7), or null not to. */
  stuck_after_days: number | null;
}

/** SPEC 26.12: which of the person's lists a weekly summary covers ("all" they write when it runs, or chosen ones). */
export interface WeeklySummarySettings {
  lists: "all" | string[];
}

/** SPEC 26.10: when a restock routine brings a bought want back (always asking first, in this step). */
export interface RestockSettings {
  /** 1-52 weeks or 1-12 months after it was bought. Default { unit: "week", count: 4 }. */
  after: { unit: "week" | "month"; count: number };
}

/** SPEC 26.7: a day the admin keeps for countdowns to start from (GET/PUT /v1/admin/occasions). */
export interface Occasion {
  slug: string;
  year: number;
  /** YYYY-MM-DD */
  date: string;
  date_end: string | null;
  label: string;
}

/**
 * SPEC 26.4: one person's own choice for one routine. Following is the app (notices in "For you"); `email` and
 * `at_once` (target_price only) are stored now and used once the email rules are built: until then nothing of step 2
 * is ever emailed.
 */
export interface RoutineFollow {
  routine_id: string;
  email: boolean;
  at_once: boolean;
}

export type RoutineNoticeWhat = "due_soon" | "overdue" | "countdown" | "order_by" | "at_price" | "summary" | "agent_looked" | "agent_not_looking" | "chase";

/**
 * SPEC 26.3: one thing a routine tells one person, in the app ("For you"). The text is ours, with only the list's own
 * want texts and its writers' facts in it; never a stranger's words.
 */
export interface RoutineNotice {
  id: string;
  routine: { id: string; name: string; name_by: RoutineNameBy; kind: RoutineKind };
  list: { id: string; title: string } | null;
  item: { id: string; text: string } | null;
  what: RoutineNoticeWhat;
  text: string;
  /** Where to act (a page on the web). */
  link: string;
  /** The local date it is about (YYYY-MM-DD), or null. */
  due_on: string | null;
  created_at: Timestamp;
  seen: boolean;
}

/** ListSummary.routines entries (writers only). */
export interface RoutineSummary {
  id: string;
  name: string;
  name_by: RoutineNameBy;
  kind: RoutineKind;
  schedule_text: string;
  paused: boolean;
  blocked_reason: BlockReason | null;
  key_holder: { handle: string } | null;
}

/** "settings" (SPEC 26.15): a change to the kind's own choices, with an Undo like any other. */
export type RoutineChangeKind = "created" | "renamed" | "rescheduled" | "paused" | "resumed" | "deleted" | "restored" | "run_now" | "settings";

/**
 * SPEC 20.14 item 2: one change a person's agent made, for "For you" (GET /me/routine-changes, the person's own web
 * session only). Deleted routines are included (Undo brings them back).
 */
export interface RoutineChange {
  id: string;
  routine: { id: string; name: string; name_by: RoutineNameBy; deleted: boolean; list: { id: string; title: string } };
  change: RoutineChangeKind;
  by: ActorRef;
  at: Timestamp;
  /** What the agent reported the person said; only ever in that person's own web session. */
  reported_words: string | null;
  /** Within 7 days, and the routine can still be restored to how it was. */
  can_undo: boolean;
}

/**
 * SPEC 20.14 item 1. visible: the launch switch (routine.visible); running: visible and routine.all.enabled; a kind:
 * running and its own switch. Absent or visible false: show nothing about routines.
 */
export interface RoutineSwitches {
  visible: boolean;
  running: boolean;
  /** Per kind: running for this reader (visible to them, and not paused by us). */
  kinds: Record<OfferedRoutineKind, boolean>;
  /**
   * SPEC 26.14: per kind, whether it is launched for this reader (`routine.<kind>.visible`; preview accounts see every
   * kind). A kind not visible is not offered under "New routine" and its routines don't run.
   */
  kinds_visible: Record<OfferedRoutineKind, boolean>;
  /** What each kind is, for the web's wording (SPEC 20.14 item 12): the numbers are written once, on the server. */
  about: { exa_search: RoutineKindAbout };
}

/** SPEC 20.14 item 12: roughly what a routine kind costs on the person's own key, in US dollars. */
export interface RoutineKindAbout {
  /** One search of one want, by the list's format (shopping pages are classified, which costs more). */
  cost_per_search_usd: Record<ListFormat, number>;
  /** Checking a key: one bare search. */
  key_check_usd: number;
}

/** The routine.changed event's fixed fields (SPEC 20.10). */
export interface RoutineChangedPayload {
  routine: {
    id: string;
    list_id: string;
    kind: RoutineKind;
    name: string;
    name_by: RoutineNameBy;
    /** null for date and event routines (SPEC 26.2 item 9). */
    schedule: Schedule | null;
    paused: boolean;
    blocked_reason: BlockReason | null;
    key_holder_handle: string | null;
  };
  change: RoutineChangeKind;
  key_holder_changed: boolean;
}

/** POST /lists/{id}/routines. `person_asked` (1-200) is required on every write by an agent. */
export interface RoutineInput {
  kind: RoutineKind;
  name?: string;
  /** Kinds that start by a schedule only. */
  schedule?: ScheduleInput;
  /** target_price and restock: the want (SPEC 26.2 item 4). */
  item_id?: string;
  /** The kind's own choices, checked per kind; unknown keys are refused, naming the allowed ones. */
  settings?: Record<string, unknown>;
  /**
   * SPEC 26.4: a person on the web follows what they make, and must say how (`email` and `at_once` stored, not yet
   * sent). Agents never send it: their person follows in the app only.
   */
  follow?: { email: boolean; at_once?: boolean };
  person_asked?: string;
}

/** PATCH /routines/{id}. */
export interface RoutinePatch {
  name?: string;
  schedule?: ScheduleInput;
  /** The kind's own choices (SPEC 26.15), checked per kind; a "settings" change with an Undo. */
  settings?: Record<string, unknown>;
  /** true: the person's pause. */
  paused?: boolean;
  /** true: clear the person's pause and any block a person may clear, and become the key holder (20.2). */
  resume?: boolean;
  person_asked?: string;
}

/**
 * What a write returns through Services: the routine and the 20.2 sentence for the person ("New routine on …"), so
 * the web and agents say the same thing. REST returns `routine` alone.
 */
export interface RoutineWrite {
  routine: Routine;
  tell_your_person: string;
}

/** SPEC 20.7: what a routine-ask link shows; no stranger's text. */
export interface RoutineAskView {
  routine: { name: string; list_title: string };
  /** True once the link was used. */
  done: boolean;
  /**
   * Which choice was made last, or null before any (SPEC 20.14 item 7): afterwards the page offers the other choice,
   * which works once. Answering the same choice again changes nothing.
   */
  answered: "keep" | "pause" | null;
}

/**
 * For get_updates' needs_you.target_price_reached (an agent of a person who follows a target_price routine, on a list
 * that agent writes): the price that person was waiting for is reached. Only the list's own facts: the want's text,
 * the price and where (a writer's or their agent's retailer name, else the page's host). Stays until the routine's
 * next check finds the price above the target, the want is bought, or the routine is deleted.
 */
export interface TargetPriceReached {
  list_id: string;
  item: { id: string; text: string };
  entry_id: string;
  price: Decimal;
  currency: string;
  retailer: string;
  /** Checked on the store's page. */
  verified: boolean;
  reached_at: Timestamp;
}

/** For get_updates' needs_you.routines_blocked: routines on the agent's person's key that their person can fix. */
export interface RoutineBlockedForPerson {
  list: { id: string; title: string };
  routine: { id: string; name: string; name_by: RoutineNameBy };
  reason: BlockReason;
  fix_url: string;
}

/** SPEC 20.5. Never the key: its last 4 characters and status only. */
export interface ServiceKey {
  service: "exa";
  last4: string;
  status: "ok" | "refused" | "out_of_credit";
  status_at: Timestamp;
  /** Searches per UTC calendar month, 10-5000. */
  monthly_cap: number;
  used_this_month: number;
  routines: Array<{ id: string; name: string; list: { id: string; title: string } }>;
}

/** PUT /me/service-keys/exa. */
export interface ServiceKeyInput {
  key: string;
  /** Default true: one bare search for a fixed harmless query (RoutineKindAbout.key_check_usd of the person's credit). */
  check?: boolean;
}

/** SPEC 20.8. */
/**
 * SPEC 20.8 and 26.4: the person's routine email kinds, their email hour, and every routine they follow.
 * `routine_digest`: one email a day at `email_hour` with their followed-by-email routines' notices (default on; sent
 * only while some followed routine has email ticked). `routine_at_once`: a target_price notice at once for those
 * who ticked it (default on).
 */
export interface EmailPrefs {
  kinds: { routine_key: boolean; routine_unattended: boolean; routine_digest: boolean; routine_at_once: boolean };
  /** 0-23, the person's own time zone; default 8 ("Your daily routine email comes at about 8:00"). */
  email_hour: number;
  follows: Array<RoutineFollow & { routine: { id: string; name: string; name_by: RoutineNameBy; kind: RoutineKind }; list: { id: string; title: string } | null }>;
}

/** PATCH /me/email-prefs: any of the kinds, the email hour, or `stop_all` (every routine email off at once). */
export interface EmailPrefsPatch {
  kinds?: Partial<EmailPrefs["kinds"]>;
  email_hour?: number;
  stop_all?: true;
}

/** SPEC 26.4: what a "Stop emailing me about this routine" link shows; it never acts on open. */
export interface RoutineEmailStopView {
  routine: { name: string; list_title: string | null };
  /** Its email is already off for this person. */
  done: boolean;
}

/** The web's name for the change record (the server calls it RoutineChange). */
export type RoutineChangeRecord = RoutineChange;

/** SPEC 20.14: a want a routine stopped looking for (Item.routine_stops, writers only). */
export interface RoutineStop {
  routine_id: string;
  routine_name: string;
  name_by: RoutineNameBy;
}
