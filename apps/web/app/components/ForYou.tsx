/**
 * "For you" at the top of /app (SPEC 20.3), beside "Waiting on you", once routines are launched for this person:
 * - each change one of the person's own agents made to a routine in the last 7 days, with "Claude reported you said:
 *   …" (only ever shown to this person) and Undo;
 * - routines on the person's key that are stopped for a reason they can fix (the key), grouped: "Change key";
 * - routines stopped because nobody looked at their last rounds: Resume.
 * A routine's name may be an agent's: always in quotes, as a name.
 */
import { Link, useFetcher } from "react-router";
import { Time } from "./Time";
import { actorName } from "~/lib/routines";
import type { RoutineResult } from "~/lib/routines.server";
import type { BlockReason, Routine, RoutineChange, RoutineChangeRecord } from "~/lib/types";

export type ForYouData = {
  changes: RoutineChangeRecord[];
  blocked: Array<Routine & { list: { id: string; title: string } }>;
  keyOk: boolean;
};

const DID: Record<RoutineChange, string> = {
  created: "made",
  renamed: "renamed",
  rescheduled: "changed the schedule of",
  paused: "paused",
  resumed: "resumed",
  deleted: "deleted",
  restored: "brought back",
  run_now: "ran",
};

const KEY_WORDS: Partial<Record<BlockReason, string>> = {
  key_refused: "Your Exa key stopped working",
  out_of_credit: "Your Exa account ran out of credit",
  key_missing: "Your Exa key was removed",
};

export function hasForYou(d: ForYouData | null): d is ForYouData {
  return !!d && (d.changes.length > 0 || d.blocked.length > 0);
}

export function ForYou({ data: d }: { data: ForYouData }) {
  // Key problems on the person's own key, one line per cause.
  const byKey = new Map<BlockReason, typeof d.blocked>();
  for (const r of d.blocked) if (r.blocked && KEY_WORDS[r.blocked.reason] && r.uses_my_key) byKey.set(r.blocked.reason, [...(byKey.get(r.blocked.reason) ?? []), r]);
  const unattended = d.blocked.filter((r) => r.blocked?.reason === "unattended");
  return (
    <section aria-labelledby="for-you-h" className="grid gap-3">
      <h2 id="for-you-h" className="text-[0.95rem] font-semibold text-ink-2">
        For you
      </h2>
      <ul className="grid gap-2">
        {[...byKey].map(([reason, rs]) => (
          <li key={reason} className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <p className="min-w-0 text-[0.95rem]">
              {KEY_WORDS[reason]} on <Time ts={rs[0].blocked!.at} />; {rs.length === 1 ? "1 routine is" : `${rs.length} routines are`} stopped
            </p>
            <Link to="/app/account#keys" className="btn btn-sm btn-want">
              Change key
            </Link>
          </li>
        ))}
        {unattended.map((r) => (
          <Unattended key={r.id} routine={r} keyOk={d.keyOk} />
        ))}
        {d.changes.map((c) => (
          <AgentChange key={c.id} change={c} />
        ))}
      </ul>
    </section>
  );
}

function Unattended({ routine: r, keyOk }: { routine: ForYouData["blocked"][number]; keyOk: boolean }) {
  const f = useFetcher<RoutineResult>({ key: `foryou-${r.id}` });
  const direct = r.uses_my_key && keyOk;
  return (
    <li className="card grid gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 text-[0.95rem]">
          “{r.name}” on {r.list.title}: nobody looked at its last 2 rounds
        </p>
        {direct ? (
          <f.Form method="post">
            <input type="hidden" name="intent" value="routine-resume" />
            <input type="hidden" name="routine_id" value={r.id} />
            <button className="btn btn-sm" disabled={f.state !== "idle"}>
              Resume<span className="sr-only"> “{r.name}”</span>
            </button>
          </f.Form>
        ) : (
          // Resuming moves it onto this person's key: the card says so before confirming.
          <Link to={`/app/routines#routine-${r.id}`} className="btn btn-sm">
            Resume<span className="sr-only"> “{r.name}”</span>
          </Link>
        )}
      </div>
      {f.data?.error && (
        <p className="form-error" role="alert">
          {f.data.error}
        </p>
      )}
    </li>
  );
}

function AgentChange({ change: c }: { change: RoutineChangeRecord }) {
  const f = useFetcher<RoutineResult>({ key: `undo-${c.id}` });
  const undone = f.state === "idle" && f.data?.ok;
  return (
    <li className="card grid gap-1.5 px-4 py-3">
      <p className="text-[0.95rem]">
        {actorName(c.by)} {DID[c.change]} “{c.routine.name}” on{" "}
        <Link to={`/app/lists/${c.routine.list.id}/settings#routines`} className="link">
          {c.routine.list.title}
        </Link>{" "}
        <span className="text-ink-3">
          · <Time ts={c.at} />
        </span>
      </p>
      {c.reported_words && (
        <p className="text-[0.9rem] text-ink-2">
          {actorName(c.by)} reported you said: “{c.reported_words}”
        </p>
      )}
      {undone ? (
        <p className="text-[0.88rem] text-ink-2" role="status">
          Undone.
        </p>
      ) : (
        c.can_undo && (
          <f.Form method="post" className="flex flex-wrap items-center gap-x-3">
            <input type="hidden" name="intent" value="routine-undo" />
            <input type="hidden" name="routine_id" value={c.routine.id} />
            <input type="hidden" name="change_id" value={c.id} />
            <button className="textlink-btn text-[0.9rem]" disabled={f.state !== "idle"}>
              Undo<span className="sr-only"> this change to “{c.routine.name}”</span>
            </button>
          </f.Form>
        )
      )}
      {f.data?.error && (
        <p className="form-error" role="alert">
          {f.data.error}
        </p>
      )}
    </li>
  );
}
