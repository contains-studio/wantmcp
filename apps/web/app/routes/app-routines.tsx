/**
 * /app/routines (SPEC 20.3): every routine the person can change, grouped by list, one card each. Beside Lists,
 * Activity and Skills. Until routines are launched for this person (20.14's `visible`), the page doesn't exist.
 */
import { data, Link } from "react-router";
import type { Route } from "./+types/app-routines";
import { RoutineCard } from "~/components/RoutineCard";
import { api } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { afterChange } from "~/lib/prg.server";
import { PAUSED_FOR_EVERYONE, routinesOn } from "~/lib/routines";
import { myExaKey, routineAction, ROUTINE_INTENTS } from "~/lib/routines.server";
import { assertSameOrigin } from "~/lib/session.server";
import type { Routine } from "~/lib/types";
import { ViewSwitch } from "./app";

export function meta() {
  return [{ title: "Routines · The Want MCP" }, { name: "robots", content: "noindex" }];
}

type Mine = Routine & { list: { id: string; title: string } };

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const sw = routinesOn(user);
  if (!sw) throw new Response("Not found", { status: 404 });
  const [mine, key] = await Promise.all([api<{ data: Mine[] }>(request, "/me/routines"), myExaKey(request, user)]);
  // Grouped by list, lists in the order their first routine appears.
  const groups = new Map<string, { list: Mine["list"]; routines: Mine[] }>();
  for (const r of mine.data) {
    const g = groups.get(r.list.id) ?? { list: r.list, routines: [] };
    g.routines.push(r);
    groups.set(r.list.id, g);
  }
  return data({ sw, groups: [...groups.values()], keyOk: key?.status === "ok" }, { headers: { "Cache-Control": "private, no-store" } });
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
  const { sw, groups, keyOk } = loaderData;
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[47.5rem] gap-6 px-4 pt-8 pb-16 sm:pt-10">
        <header className="grid gap-5">
          <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.4rem]">Routines</h1>
          <ViewSwitch current="routines" />
          <p className="text-[0.95rem] text-ink-2">Things your lists do on a schedule. A routine only suggests; you decide.</p>
          {!sw.running && <p className="font-medium text-warn">{PAUSED_FOR_EVERYONE}.</p>}
        </header>

        {groups.length === 0 ? (
          <section className="card grid gap-2 p-5">
            <h2 className="text-[1.05rem] font-semibold">No routines yet</h2>
            <p className="text-ink-2">Open a list's settings and choose New routine, for example to search the web for its wants every week.</p>
            <Link to="/app" className="link w-fit">
              Your lists
            </Link>
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
                <RoutineCard key={r.id} routine={r} sw={sw} keyOk={keyOk} />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
