/**
 * In-memory state for the mock API. Everything resets when the process restarts.
 */
import type { ActorRef, Comment, EventType, PriceObservation, Purchase, Timestamp, WantEvent } from "../app/lib/types.ts";

export interface UserRow {
  id: string;
  email: string;
  handle: string;
  updates_opt_in: boolean;
  created_at: Timestamp;
}

export interface ListRow {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  allow_outside_suggestions: boolean;
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
}

export interface AgentRow {
  id: string;
  name: string;
  kind: "key" | "oauth";
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
}

export interface EntryRow {
  id: string;
  item_id: string;
  list_id: string;
  status: "listed" | "suggested" | "rejected";
  author: ActorRef;
  title: string;
  description: string;
  product_url: string;
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

export interface Store {
  users: UserRow[];
  sessions: Map<string, string>; // token -> user id
  codes: Map<string, { code: string; attempts: number; expires: number }>;
  lists: ListRow[];
  members: MemberRow[];
  agents: AgentRow[];
  items: ItemRow[];
  entries: EntryRow[];
  prices: PriceObservation[];
  comments: Comment[];
  events: WantEvent[];
  reports: Array<{ target_type: string; target_id: string; reason: string; created_at: Timestamp }>;
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
    comments: [],
    events: [],
    reports: [],
  };
}

export type { EventType };
