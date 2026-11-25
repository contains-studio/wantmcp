import { api } from "./api.server";
import type { OpenQuestionsPage } from "./types";

export type WaitingQuestion = OpenQuestionsPage["questions"][number];

/**
 * SPEC 12.1: open questions across every list the person can write, newest first, from
 * GET /me/questions. The only place the web app reads them: /app and the count in the navigation.
 */
export async function waitingQuestions(request: Request, limit = 50): Promise<{ questions: WaitingQuestion[]; count: number }> {
  const page = await api<OpenQuestionsPage>(request, "/me/questions", { query: { limit } });
  return { questions: page.questions, count: page.count };
}

/** Just the number, for the navigation badge (one small call). */
export async function waitingCount(request: Request): Promise<number> {
  return (await waitingQuestions(request, 1)).count;
}
