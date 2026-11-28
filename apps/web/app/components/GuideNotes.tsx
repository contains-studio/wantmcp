/**
 * Guides as notes beside a want's comments (SPEC 20.14 item 13; owner, 27 Nov 2026: "how do we have guides show up as
 * notes or comments"). A guide is reading, not a product: never with the want's products, never in the suggestions
 * panel, no picture. It looks like a comment (same type and spacing), marked "Guide" with Exa search's tag.
 *
 * - Held (writers only): "Exa search found a guide: “…” · seriouseats.com", with Keep and Dismiss (promote and reject).
 * - Kept (everyone who can read the list): "Guide: “…” · seriouseats.com · found by Exa search, kept by @sam"; a writer
 *   can remove it like a comment (the entry's delete).
 * The title opens the page in a new tab. Every button is a form, so it works without JavaScript.
 */
import { useFetcher } from "react-router";
import { Menu, MenuRemove } from "./Actions";
import { ExaSearchTag, sourceHost } from "./RoutineSuggestion";
import { Time } from "./Time";
import { useRootData } from "~/lib/hooks";
import type { Entry } from "~/lib/types";

function GuideTitle({ g }: { g: Entry }) {
  const url = g.links?.[0] ?? g.product_url ?? null;
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="link font-medium text-ink">
      “{g.title}”<span className="sr-only"> (new tab)</span>
    </a>
  ) : (
    <span className="font-medium text-ink">“{g.title}”</span>
  );
}

/** The note's head, like a comment's: "Guide", Exa search's tag, when, and (kept) its menu at the end. */
function Head({ g, me, menu }: { g: Entry; me: string | null; menu?: React.ReactNode }) {
  const rt = g.author.kind === "outside" ? g.author.routine : undefined;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="guide-label">Guide</span>
      {rt && <ExaSearchTag mine={rt.key_holder === me} keyHolder={rt.key_holder} />}
      <Time ts={g.promoted_at ?? g.created_at} className="text-[0.78rem] text-ink-3" />
      {menu && <span className="ml-auto">{menu}</span>}
    </div>
  );
}

export function GuideNotes({ held, kept, canWrite }: { held: Entry[]; kept: Entry[]; canWrite: boolean }) {
  const me = useRootData().user?.handle ?? null;
  if (!held.length && !kept.length) return null;
  return (
    <ol className="grid gap-3" aria-label="Guides">
      {canWrite && held.map((g) => <HeldGuide key={g.id} g={g} me={me} />)}
      {kept.map((g) => (
        <li key={g.id} id={g.id} className="guide-note scroll-mt-24">
          <Head
            g={g}
            me={me}
            menu={
              canWrite && (
                <Menu label="More actions for this guide">
                  <MenuRemove intent="delete-entry" fields={{ entry_id: g.id }} label="Remove" confirmText="Remove this guide from the want?" />
                </Menu>
              )
            }
          />
          {/* The head already says "Guide" and "Exa search": the line says which page, where from, who kept it. */}
          <p className="mt-1 break-words text-[0.92rem] text-ink-2">
            <GuideTitle g={g} />
            {sourceHost(g.links?.[0]) && <> · {sourceHost(g.links?.[0])}</>}
            {g.promoted_by?.kind === "user" && <> · kept by {g.promoted_by.handle === me ? "you" : `@${g.promoted_by.handle}`}</>}
          </p>
        </li>
      ))}
    </ol>
  );
}

function HeldGuide({ g, me }: { g: Entry; me: string | null }) {
  const f = useFetcher<{ ok?: boolean; error?: string }>();
  const pending = f.formData?.get("intent");
  if (f.state === "idle" && f.data?.ok) return null;
  return (
    <li id={g.id} className="guide-note is-held scroll-mt-24">
      <Head g={g} me={me} />
      <p className="mt-1 break-words text-[0.92rem] text-ink-2">
        Found a guide: <GuideTitle g={g} />
        {sourceHost(g.links?.[0]) && <> · {sourceHost(g.links?.[0])}</>}
      </p>
      <f.Form method="post" className="mt-2 flex gap-2">
        <input type="hidden" name="entry_id" value={g.id} />
        <button name="intent" value="promote" className="btn btn-ghost btn-sm" disabled={f.state !== "idle"}>
          {pending === "promote" ? "Keeping…" : "Keep"}
          <span className="sr-only"> the guide “{g.title}”</span>
        </button>
        <button name="intent" value="reject" className="btn-quiet" disabled={f.state !== "idle"}>
          {pending === "reject" ? "Dismissing…" : "Dismiss"}
          <span className="sr-only"> the guide “{g.title}”</span>
        </button>
      </f.Form>
      {f.data?.error && (
        <p className="form-error mt-1" role="alert">
          {f.data.error}
        </p>
      )}
    </li>
  );
}
