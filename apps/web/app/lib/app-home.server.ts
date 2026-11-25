/**
 * What /app shows for each list: counts in the format's words, progress, questions waiting and
 * the latest thing someone did. One call, GET /me/lists?include=summary; an API without it gets the
 * older way (each list's detail, in parallel).
 */
import { api } from "./api.server";
import type { ActorRef, ListDetail, ListFormat, ListSummary, ListWithSummary, Page } from "./types";
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
    /** "found", "posted", "answered", "commented on"… in plain words. */
    verb: string;
    title: string;
    price: { price: string; currency: string } | null;
    at: string;
    /** Where it sits on the list (#ent_… or #itm_…). */
    anchor: string;
  } | null;
  /** The newest progress note an agent left on a task it is working on (status_note). */
  note: { actor: ActorRef; text: string; item: string; at: string; anchor: string; timed: boolean } | null;
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
            verb: (last.kind ?? "product") === "product" ? "found" : last.kind === "answer" ? "answered" : "posted",
            title: last.title,
            price: last.current_price ? { price: last.current_price.price, currency: last.current_price.currency } : null,
            at: last.current_price?.posted_at ?? last.created_at,
            anchor: last.id,
          }
        : null,
      note:
        noted && noted.claimed_by
          ? {
              actor: noted.claimed_by,
              text: noted.status_note!,
              item: noted.text,
              at: noted.status_note_at ?? noted.claimed_at ?? l.updated_at,
              anchor: noted.id,
              timed: !!noted.status_note_at,
            }
          : null,
      access: l.access ?? null,
    };
  });
}

const VERB: Record<string, (format: ListFormat) => string> = {
  entry: (f) => (f === "shopping" ? "found" : f === "research" ? "answered" : "posted"),
  price: () => "checked the price of",
  comment: () => "commented on",
  status: () => "updated",
  answer: () => "answered",
  question: () => "asked about",
};

/** The person's lists as /app cards, from GET /me/lists?include=summary, or the older way if the API doesn't have it. */
export async function loadCards(request: Request, waiting: Parameters<typeof listCards>[2]): Promise<ListCard[]> {
  const res = await api<Page<ListWithSummary> | ListSummary[]>(request, "/me/lists", { query: { include: "summary", limit: 100 } });
  // An API without summaries ignores the parameter and returns the plain array.
  if (Array.isArray(res)) return listCards(request, res, waiting);
  // A shape this build can't read: the older way, one call per list, rather than a broken page.
  if (!res || !Array.isArray(res.data) || res.data.some((l) => !l?.summary)) {
    const plain = await api<ListSummary[]>(request, "/me/lists");
    return listCards(request, Array.isArray(plain) ? plain : [], waiting);
  }
  // The API pages its results as { data, next_cursor }, like every other list route.
  return res.data.map((l) => {
    const format = l.format ?? "shopping";
    const s = l.summary;
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
      items: s.items,
      done: s.done,
      waiting: s.waiting,
      latest: s.latest
        ? {
            actor: s.latest.actor,
            verb: (VERB[s.latest.kind] ?? (() => "posted"))(format),
            title: s.latest.title,
            price: s.latest.price ? { price: s.latest.price.amount, currency: s.latest.price.currency } : null,
            at: s.latest.at,
            anchor: s.latest.anchor,
          }
        : null,
      note: s.note ? { actor: s.note.actor, text: s.note.text, item: s.note.item.text, at: s.note.at, anchor: s.note.anchor, timed: true } : null,
      access: l.access ?? null,
    };
  });
}
