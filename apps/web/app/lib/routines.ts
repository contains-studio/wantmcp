/**
 * SPEC 20 (routines, step 1) on the web: small helpers shared by the Routines tab, the list's settings and the list
 * page. Every sentence about a routine's schedule and status is the server's (`schedule_text`, `status_text`); nothing
 * here rebuilds them. A routine's name may be an agent's words (`name_by: "agent"`): it is shown as a name, in quotes
 * where it sits in a sentence, never as the site's own words.
 */
import type { ActorRef, Routine, RoutineRun, RoutineRunState, UserSelf } from "./types";

export type RoutinesSwitch = NonNullable<UserSelf["routines"]>;

/** The launch switch (20.14): null means routines don't exist for this person, and nothing about them shows. */
export function routinesOn(user: Pick<UserSelf, "routines"> | null | undefined): RoutinesSwitch | null {
  return user?.routines?.visible ? user.routines : null;
}

/** "Routines are paused for everyone for now" applies to this routine (all of them, or its kind). */
export function pausedForEveryone(sw: RoutinesSwitch, r: Pick<Routine, "kind">): boolean {
  return !sw.running || !sw.kinds[r.kind];
}

export const PAUSED_FOR_EVERYONE = "Routines are paused for everyone for now";

/** "your Exa key" / "@sam's Exa key" (20.3). */
export function whoseKey(r: Pick<Routine, "uses_my_key" | "key_holder">): string | null {
  if (!r.key_holder) return null;
  return r.uses_my_key ? "your Exa key" : `@${r.key_holder.handle}'s Exa key`;
}

/** An actor's name as people read it: @handle, an agent's name, or "someone". */
export function actorName(a: ActorRef | null | undefined): string {
  if (!a) return "someone";
  if (a.kind === "user") return `@${a.handle}`;
  if (a.kind === "agent") return a.name;
  return a.name ?? "someone";
}

/** The agent that wrote a routine's name, for "named by Claude" (the latest agent among its changes or its maker). */
export function namedBy(r: Pick<Routine, "name_by" | "changed" | "created">): string | null {
  if (!agentWroteName(r)) return null;
  const a = r.changed.by.kind === "agent" ? r.changed.by : r.created.by.kind === "agent" ? r.created.by : null;
  return a ? a.name : "an agent";
}

/** The browser's IANA zone, for the first routine and the account page's preselection (20.14 item 6). */
export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export const WEEKDAYS = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
] as const;

/** 20.6's notice, shown before a search routine is made. */
export const EXA_NOTICE =
  "The text of every open want on this list, including other people's, goes to your Exa account each time it runs. Exa's own terms apply; on its free and Developer plans Exa may use searches to improve its service.";
export const EXA_NOTICE_COUNTRY = "And your country, to find shops near you.";
export const MOVES_TO_YOUR_KEY = "This will run on your Exa key from now on.";

/** Runs in any 28 days, to tell when a new schedule runs more often (20.2: then it moves to the viewer's key). */
export function runsPer28(s: { every: "day" | "week" | "month"; interval?: number; days?: readonly string[] }): number {
  const n = s.interval ?? 1;
  if (s.every === "day") return 28 / n;
  if (s.every === "week") return (Math.max(1, s.days?.length ?? 1) * 4) / n;
  return 1 / n;
}

/** "New York time", from a routine's IANA zone (shown as text; a routine keeps its own zone). */
export function zoneCity(tz: string): string {
  return tz === "UTC" ? "UTC" : `${tz.split("/").pop()!.replace(/_/g, " ")} time`;
}

/** Whether to show a name as an agent's words (in quotes, "named by …"). "server" is the kind's default name. */
export function agentWroteName(r: { name_by: string }): boolean {
  return r.name_by === "agent";
}

/** A run's state in plain words: History and the card's live line say the same. */
export const RUN_STATE: Record<RoutineRunState, string> = {
  queued: "Waiting to run",
  running: "Running",
  ok: "Done",
  partial: "Partly done; it will try the rest again",
  skipped: "Nothing to do",
  blocked: "Stopped",
  failed: "Didn't finish",
};

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** "Done: searched 3 wants, 9 suggestions" (and ", 3 searches used" in History). */
export function runOutcome(r: RoutineRun, withSearches = false): string {
  const head = RUN_STATE[r.state];
  if (r.state !== "ok" && r.state !== "partial") return head;
  return `${head}: searched ${count(r.wants_searched, "want")}, ${count(r.suggestions_posted, "suggestion")}${withSearches ? `, ${count(r.searches_used, "search", "searches")} used` : ""}`;
}

export const runEnded = (r: Pick<RoutineRun, "state">) => r.state !== "queued" && r.state !== "running";

/** The key check's cost, from the server (routines.about), as "$0.007"; null when the server doesn't say. */
export function keyCheckCost(sw: Pick<RoutinesSwitch, "about"> | null): string | null {
  const usd = sw?.about?.exa_search?.key_check_usd;
  return typeof usd === "number" ? `$${usd < 0.01 ? usd.toFixed(3) : usd.toFixed(2)}` : null;
}

/** A shopping want's products, without its guides (SPEC 20.14 item 12): guides never count as products or prices. */
export function productsOf<T extends { kind?: string }>(entries: T[]): T[] {
  return entries.filter((e) => e.kind !== "guide");
}
export function guidesOf<T extends { kind?: string }>(entries: T[]): T[] {
  return entries.filter((e) => e.kind === "guide");
}
