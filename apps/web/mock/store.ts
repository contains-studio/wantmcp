/**
 * In-memory state for the mock API. Everything resets when the process restarts.
 */
import type { ActorRef, Comment, Completion, EntryKind, EventType, ItemStatus, ListFormat, ListVisibility, PriceObservation, Purchase, Question, Timestamp, WantEvent } from "../app/lib/types.ts";

/** A stored price: older rows have no provenance yet (SPEC 12.5), the API fills it in. */
export type PriceRow = Omit<PriceObservation, "source" | "source_url" | "checked_at" | "in_stock" | "verified"> &
  Partial<Pick<PriceObservation, "source" | "source_url" | "checked_at" | "in_stock" | "verified">>;

export interface UserRow {
  id: string;
  /** SPEC 13.1: the hidden account holding an unclaimed list. Never shown as a person. */
  placeholder?: boolean;
  email: string;
  handle: string;
  updates_opt_in: boolean;
  /** SPEC 12.2 */
  bio?: string;
  country?: string | null;
  currency?: string | null;
  created_at: Timestamp;
}

export interface ListRow {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  allow_outside_suggestions: boolean;
  theme?: string | null;
  format?: ListFormat;
  visibility?: ListVisibility;
  /** SPEC 12.2: writers only. */
  note?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MemberRow {
  id: string;
  list_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: "owner" | "member";
  status: "invited" | "active";
  token: string | null;
  created_at: Timestamp;
  /** Who sent the invitation (SPEC 13.7). */
  invited_by?: ActorRef | null;
}

export interface AgentRow {
  id: string;
  name: string;
  kind: "key" | "oauth" | "account";
  key: string | null;
  list_ids: string[];
  owner_id: string;
  created_at: Timestamp;
  last_used_at: Timestamp | null;
}

export interface ItemRow {
  id: string;
  list_id: string;
  text: string;
  created_by: ActorRef;
  created_at: Timestamp;
  purchase: Purchase | null;
  details?: string;
  due_at?: Timestamp | null;
  status?: ItemStatus;
  claimed_by?: ActorRef | null;
  claimed_at?: Timestamp | null;
  completion?: Completion | null;
  status_note?: string | null;
  status_note_at?: Timestamp | null;
  text_by?: "person" | "agent";
}

export interface EntryRow {
  id: string;
  item_id: string;
  list_id: string;
  status: "listed" | "suggested" | "rejected";
  author: ActorRef;
  title: string;
  description: string;
  product_url: string | null;
  kind?: EntryKind;
  links?: string[];
  buy_url: string | null;
  image_url: string | null;
  retailer: string;
  coupon_code: string | null;
  deal_starts_at: Timestamp | null;
  deal_ends_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  promoted_by: ActorRef | null;
  promoted_at: Timestamp | null;
}

/** SPEC 13: a claim link. Unclaimed lists are held by a hidden placeholder user until someone keeps them. */
export interface ClaimRow {
  token: string;
  list_id: string;
  kind: "unclaimed" | "handover";
  agent_name: string;
  /** Handover: the owner handing the list over. */
  from_user_id: string | null;
  expires_at: Timestamp;
  used_by: string | null;
}

/** SPEC 14.2 */
export interface SkillRow {
  id: string;
  user_id: string;
  name: string;
  title: string;
  description: string;
  body: string;
  enabled: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Store {
  users: UserRow[];
  sessions: Map<string, string>; // token -> user id
  codes: Map<string, { code: string; attempts: number; expires: number; attempt_id?: string }>;
  lists: ListRow[];
  members: MemberRow[];
  agents: AgentRow[];
  items: ItemRow[];
  entries: EntryRow[];
  prices: PriceRow[];
  /** SPEC 12.1: never shown to anyone who cannot write the list. */
  questions: Question[];
  comments: Comment[];
  events: WantEvent[];
  reports: Array<{ target_type: string; target_id: string; reason: string; created_at: Timestamp }>;
  claims: ClaimRow[];
  skills: SkillRow[];
}

let counter = 0;
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Short random-looking id with a type prefix, e.g. `lst_k3m9q2`. */
export function newId(prefix: string): string {
  counter += 1;
  let out = "";
  for (let i = 0; i < 10; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix}_${out}`;
}

export function randomToken(len = 32): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

export function emptyStore(): Store {
  return {
    users: [],
    sessions: new Map(),
    codes: new Map(),
    lists: [],
    members: [],
    agents: [],
    items: [],
    entries: [],
    prices: [],
    questions: [],
    comments: [],
    events: [],
    reports: [],
    claims: [],
    skills: [],
  };
}

export type { EventType };
