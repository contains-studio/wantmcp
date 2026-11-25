import { api } from "./api.server";
import type { ItemSummary, ListSummary, ListSummaryPage } from "./types";

export type WaitingQuestion = { list: Pick<ListSummary, "id" | "title" | "format">; item: ItemSummary };

/**
 * SPEC 12.1: every open question across the lists the person writes. There is no single endpoint
 * for this, so it reads each list's compact summary (questions are in it for writers only).
 */
export async function waitingQuestions(request: Request, lists?: ListSummary[]): Promise<WaitingQuestion[]> {
  const mine = lists ?? (await api<ListSummary[]>(request, "/me/lists").catch(() => [] as ListSummary[]));
  const pages = await Promise.all(
    mine
      .filter((l) => l.my_role === "owner" || l.my_role === "member")
      .map((l) => api<ListSummaryPage>(request, `/lists/${encodeURIComponent(l.id)}/summary`).catch(() => null)),
  );
  const out: WaitingQuestion[] = [];
  for (const page of pages) {
    if (!page) continue;
    for (const item of page.items) {
      if (item.open_question) out.push({ list: { id: page.list.id, title: page.list.title, format: page.list.format }, item });
    }
  }
  return out.sort((a, b) => b.item.open_question!.asked_at.localeCompare(a.item.open_question!.asked_at));
}
