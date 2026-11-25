import { useRootData } from "~/lib/hooks";
import { agentHue } from "~/lib/format";
import type { ActorRef } from "~/lib/types";

/**
 * Who posted something. A list writer's own agent gets the highlighted tag with its
 * name; people show as their handle; outside agents are marked as unverified.
 */
export function ActorTag({ actor, compact = false }: { actor: ActorRef; compact?: boolean }) {
  // To the person themselves: "you" and "your agent", never their own generated handle.
  const me = useRootData().user?.handle ?? null;
  if (actor.kind === "agent") {
    const mine = me !== null && actor.owner_handle === me;
    const hue = agentHue(actor.name);
    return (
      <span
        className="agent-tag"
        style={{ ["--hue" as string]: `var(--agent-${hue})` }}
        title={mine ? `${actor.name}, your agent` : `${actor.name}, ${actor.owner_handle}'s agent`}
      >
        <span className="dot" aria-hidden="true">
          {actor.name.slice(0, 1).toUpperCase()}
        </span>
        <span>
          {actor.name}
          {!compact && <span className="sr-only">{mine ? ", your agent" : `, agent of ${actor.owner_handle}`}</span>}
        </span>
      </span>
    );
  }
  if (actor.kind === "user") {
    return (
      <span className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-ink-2">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="text-ink-3">
          <circle cx="8" cy="5.5" r="3" fill="currentColor" />
          <path d="M2.5 14c.6-3 2.9-4.5 5.5-4.5s4.9 1.5 5.5 4.5" fill="currentColor" />
        </svg>
        {me !== null && actor.handle === me ? "you" : actor.handle}
      </span>
    );
  }
  return (
    <span className="chip chip-warn" title="Outside agent. Name not verified.">
      {actor.name ? `“${actor.name}”` : "Outside agent"} · unverified
    </span>
  );
}
