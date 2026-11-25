import { api, ApiError } from "./api.server";
import type { ListSummary } from "./types";

/** POST the claim; the list on success, or an error to show (empty when the link can't be used). A 409 means someone else kept it. */
export async function keep(request: Request, token: string): Promise<{ list: ListSummary } | { error: string }> {
  try {
    const list = await api<ListSummary>(request, `/claims/${encodeURIComponent(token)}`, { method: "POST" });
    return { list };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "conflict") return { error: "Someone else has already kept this list." };
      if (err.status === 404) return { error: "" };
      return { error: "That didn't work. Try again in a moment." };
    }
    throw err;
  }
}
