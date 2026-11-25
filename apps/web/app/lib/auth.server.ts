import { redirect } from "react-router";
import { api, ApiError } from "./api.server";
import { getSessionToken } from "./session.server";
import type { UserSelf } from "./types";

/** The signed-in user, or null. A stale cookie counts as signed out. */
export async function getUser(request: Request): Promise<UserSelf | null> {
  if (!getSessionToken(request)) return null;
  try {
    return await api<UserSelf>(request, "/me");
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null;
    throw err;
  }
}

export async function requireUser(request: Request): Promise<UserSelf> {
  const user = await getUser(request);
  if (!user) {
    const url = new URL(request.url);
    throw redirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return user;
}
