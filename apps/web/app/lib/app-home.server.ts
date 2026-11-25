/**
 * What /app shows for each list: counts in the format's words, progress, questions waiting and
 * the latest thing an agent did. All of it comes through this one function.
 *
 * Today the API has no per-list summary, so this reads each list's detail (one call per list, in
 * parallel). A `GET /v1/me/lists?include=summary` returning the same fields would replace it with
 * one call; the page would not change.
 */
import { api } from "./api.server";
import type { ActorRef, ListDetail, ListFormat, ListSummary } from "./types";
import type { WaitingQuestion } from "./waiting.server";

export interface ListCard {
  id: string;
  title: string;
  url: string;
  format: ListFormat;
  isPrivate: boolean;
  role: "owner" | "member" | null;
  ownerHandle: string;
  updatedAt: string;
  createdAt: string;
  items: number;
  done: number;
  waiting: number;
  latest: {
    actor: ActorRef;
    kind: "product" | "update" | "answer";
    title: string;
    price: { price: string; currency: string } | null;
    at: string;
    /** Where it sits on the list (#ent_… or #itm_…). */
    anchor: string;
  } | null;
  /** The newest progress note an agent left on a task it is working on (status_note). */
  note: { actor: ActorRef; text: string; item: string; at: string; anchor: string } | null;
  /** Writers only: how many people and agents can write the list (null when the API doesn't say). */
  access: { people: number; agents: number; pending_invites: number } | null;
}

/** Lists with something waiting on you first, then by latest activity from anyone, then newest made. */
export function orderCards(cards: ListCard[]): ListCard[] {
  const activity = (c: ListCard) => [c.updatedAt, c.latest?.at ?? ""].sort().at(-1)!;
  return [...cards].sort(
    (a, b) => Number(b.waiting > 0) - Number(a.waiting > 0) || activity(b).localeCompare(activity(a)) || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function listCards(request: Request, lists: ListSummary[], waiting: WaitingQuestion[]): Promise<ListCard[]> {
  const sorted = [...lists].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const details = await Promise.all(sorted.map((l) => api<ListDetail>(request, `/lists/${encodeURIComponent(l.id)}`).catch(() => null)));
  return sorted.map((l, i) => {
    const d = details[i];
    const format = l.format ?? "shopping";
    const items = d?.items ?? [];
    const done = items.filter((it) => (format === "shopping" ? !!it.purchase : it.status === "done")).length;
    // The newest listed entry posted by an agent: what the person most likely wants to see.
    const entries = items.flatMap((it) => it.entries.filter((e) => e.status === "listed" && e.author.kind !== "user"));
    const noted = items
      .filter((it) => it.status_note && it.claimed_by && it.status !== "done")
      .sort((a, b) => (b.claimed_at ?? "").localeCompare(a.claimed_at ?? ""))[0];
    const last = entries.sort((a, b) => (b.current_price?.posted_at ?? b.created_at).localeCompare(a.current_price?.posted_at ?? a.created_at))[0];
    return {
      id: l.id,
      title: l.title,
      url: l.url,
      format,
      isPrivate: l.visibility === "private",
      role: l.my_role ?? null,
      ownerHandle: l.owner_handle,
      updatedAt: l.updated_at,
      createdAt: l.created_at,
      items: d ? items.length : l.item_count,
      done,
      waiting: waiting.filter((q) => q.list.id === l.id).length,
      latest: last
        ? {
            actor: last.author,
            kind: (last.kind ?? "product") as "product" | "update" | "answer",
            title: last.title,
            price: last.current_price ? { price: last.current_price.price, currency: last.current_price.currency } : null,
            at: last.current_price?.posted_at ?? last.created_at,
            anchor: last.id,
          }
        : null,
      note:
        noted && noted.claimed_by
          ? { actor: noted.claimed_by, text: noted.status_note!, item: noted.text, at: noted.claimed_at ?? l.updated_at, anchor: noted.id }
          : null,
      access: l.access ?? null,
    };
  });
}
