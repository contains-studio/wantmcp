/**
 * /app/routines (SPEC 20.3): every routine the person can change, grouped by list, one card each. Beside Lists,
 * Activity and Skills. Until routines are launched for this person (20.14's `visible`), the page doesn't exist.
 *
 * First, "Just for you": the person's own routines on no list (SPEC 26.12, the weekly summary), made here and only here.
 */
import { data, Link } from "react-router";
import type { Route } from "./+types/app-routines";
import { NewWeeklySummary } from "~/components/NewWeeklySummary";
import { RoutineCard } from "~/components/RoutineCard";
import { PrivateBadge } from "~/components/ListView";
import { api } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { afterChange } from "~/lib/prg.server";
import { kindFlag, PAUSED_FOR_EVERYONE, ROUTINES_INTRO, routinesOn } from "~/lib/routines";
import { myEmailPrefs, myExaKey, routineAction, ROUTINE_INTENTS } from "~/lib/routines.server";
import { assertSameOrigin } from "~/lib/session.server";
import type { ListSummary, Routine } from "~/lib/types";
import { ViewSwitch } from "./app";

export function meta() {
  return [{ title: "Routines · The Want MCP" }, { name: "robots", content: "noindex" }];
}

type Mine = Routine & { list: { id: string; title: string } | null };
type OnList = Routine & { list: { id: string; title: string } };

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const sw = routinesOn(user);
  if (!sw) throw new Response("Not found", { status: 404 });
  const [mine, key] = await Promise.all([api<{ data: Mine[] }>(request, "/me/routines"), myExaKey(request, user)]);
  // The person's own (no list), then grouped by list, lists in the order their first routine appears.
  const own = mine.data.filter((r) => !r.list);
  const groups = new Map<string, { list: OnList["list"]; routines: OnList[] }>();
  for (const r of mine.data) {
    if (!r.list) continue;
    const g = groups.get(r.list.id) ?? { list: r.list, routines: [] };
    g.routines.push(r as OnList);
    groups.set(r.list.id, g);
  }
  // A weekly summary can be made here while it's launched for this person and they have none (one each).
  const offerWeekly = kindFlag(sw.kinds_visible, "weekly_summary") && !own.some((r) => r.kind === "weekly_summary");
  // The person's lists: for the weekly summary's choice, and which are private (adding an address says so).
  const [lists, prefs] = await Promise.all([api<ListSummary[]>(request, "/me/lists").catch(() => [] as ListSummary[]), offerWeekly ? myEmailPrefs(request) : null]);
  const privateLists = lists.filter((l) => l.visibility === "private").map((l) => l.id);
  // With no routine on a list yet: the person's lists, newest activity first, each a way straight to New routine.
  const recent = [...lists].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const pick = { lists: recent.slice(0, 5).map((l) => ({ id: l.id, title: l.title, private: l.visibility === "private" })), more: recent.length > 5, none: recent.length === 0 };
  return data(
    {
      sw,
      own,
      groups: [...groups.values()],
      keyOk: key?.status === "ok",
      privateLists,
      pick,
      weekly: offerWeekly ? { lists: lists.map((l) => ({ id: l.id, title: l.title })), emailHour: prefs?.email_hour ?? 8 } : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireUser(request);
  if (!routinesOn(user)) throw new Response("Not found", { status: 404 });
  const form = await request.formData();
  if (!ROUTINE_INTENTS.has(String(form.get("intent")))) return data({ intent: "", error: "Unknown action" }, 400);
  return afterChange(request, await routineAction(request, form));
}

export default function Routines({ loaderData }: Route.ComponentProps) {
  const { sw, own, groups, keyOk, weekly, privateLists, pick } = loaderData;
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[47.5rem] gap-6 px-4 pt-8 pb-16 sm:pt-10">
        <header className="grid gap-5">
          <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.4rem]">Routines</h1>
          <ViewSwitch current="routines" />
          <p className="text-[0.95rem] text-ink-2">{ROUTINES_INTRO}</p>
          {!sw.running && <p className="font-medium text-warn">{PAUSED_FOR_EVERYONE}.</p>}
        </header>

        {(own.length > 0 || weekly) && (
          <section aria-labelledby="rl-own" className="grid gap-3">
            <h2 id="rl-own" className="text-[1.15rem] font-semibold">
              Just for you
            </h2>
            {own.map((r) => (
              <RoutineCard key={r.id} routine={r} sw={sw} keyOk={keyOk} />
            ))}
            {weekly && (
              <div className="card grid gap-3 p-4 sm:p-5">
                <div className="grid gap-1">
                  <h3 className="text-[1.05rem] font-semibold">A weekly summary of my lists</h3>
                  <p className="text-[0.92rem] text-ink-2">Once a week, what changed on your lists: new options, prices, what was bought or done, what's due soon and what's stuck. Only your own wants, never what strangers wrote, and never shared.</p>
                </div>
                <NewWeeklySummary lists={weekly.lists} emailHour={weekly.emailHour} paused={sw.running && !kindFlag(sw.kinds, "weekly_summary")} />
              </div>
            )}
          </section>
        )}

        {groups.length === 0 ? (
          // Uses what the page knows: the person's own lists, each a row straight to its New routine (open without
          // JavaScript too: ?new=1 opens the chooser with nothing chosen).
          <section aria-labelledby="rl-none" className="card grid gap-3 p-5">
            <h2 id="rl-none" className="text-[1.05rem] font-semibold">
              {pick.none ? "No routines yet" : "No routines on your lists yet"}
            </h2>
            {pick.none ? (
              <Link to="/app/new" className="btn btn-want w-full sm:w-fit">
                Start a list
              </Link>
            ) : (
              <>
                <p className="text-ink-2">Pick a list to add one:</p>
                <ul className="grid border-t border-line">
                  {pick.lists.map((l) => (
                    <li key={l.id} className="border-b border-line">
                      <Link
                        to={`/app/lists/${l.id}/settings?new=1#routines`}
                        className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-ink"
                        aria-label={`${l.title}${l.private ? " (private)" : ""}: add a routine`}
                      >
                        <span className="min-w-0 break-words font-medium">{l.title}</span>
                        <span className="flex flex-none items-center gap-3 text-[0.88rem]">
                          {l.private && <PrivateBadge bare />}
                          <span aria-hidden="true" className="text-ink-3">
                            ›
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {pick.more && (
                  <Link to="/app" className="link w-fit">
                    All your lists
                  </Link>
                )}
              </>
            )}
          </section>
        ) : (
          groups.map((g) => (
            <section key={g.list.id} aria-labelledby={`rl-${g.list.id}`} className="grid gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`rl-${g.list.id}`} className="text-[1.15rem] font-semibold">
                  <Link to={`/l/${g.list.id}`} className="hover:underline">
                    {g.list.title}
                  </Link>
                </h2>
                <Link to={`/app/lists/${g.list.id}/settings#routines`} className="link text-[0.88rem] text-ink-3">
                  List settings
                </Link>
              </div>
              {g.routines.map((r) => (
                <RoutineCard key={r.id} routine={r} sw={sw} keyOk={keyOk} listPrivate={privateLists.includes(g.list.id)} />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
