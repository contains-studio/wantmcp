import { data } from "react-router";
import type { Route } from "./+types/list-comments";
import { api, ApiError } from "~/lib/api.server";
import type { Comment, Page } from "~/lib/types";

/** More comments for a list, one API page at a time ("Show more comments"). */
export async function loader({ request, params }: Route.LoaderArgs) {
  const cursor = new URL(request.url).searchParams.get("cursor");
  try {
    const page = await api<Page<Comment>>(request, `/lists/${encodeURIComponent(params.id)}/comments`, { query: { cursor } });
    return data(page, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    if (err instanceof ApiError) return data({ data: [], next_cursor: null, error: err.message }, { status: err.status });
    throw err;
  }
}
