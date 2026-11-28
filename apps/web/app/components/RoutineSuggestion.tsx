/**
 * A suggestion the person's own search routine posted (SPEC 20.14 item 11; owner, 27 Nov 2026: "why dont suggestions
 * have images displayed instead of links and we should indicate that this item was suggest by Exa Search Routine").
 * Unlike a stranger's suggestion (text only, links not clickable), it is shown as a thing: its picture, its title
 * opening the page in a new tab, where it is from, and one line saying what found it. The titles still come from web
 * pages, so they stay plain text; nothing is checked on the store's page, and the line says so.
 *
 * "From amazon.com" is `sourceLabel`: a later `kind: "guide"` can change that one word without a redesign.
 */
import { useFetcher } from "react-router";
import { MetaLine } from "./MetaLine";
import { ProductImage } from "./ProductImage";
import type { Entry, RoutineSummary } from "~/lib/types";

/** The host of a link, without "www.", for "From …". */
export function sourceHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Where a suggestion is from, in words: "From seriouseats.com" (a guide could say "Guide on …" later). */
export function sourceLabel(e: Pick<Entry, "product_url" | "links" | "kind">): string | null {
  const host = sourceHost(e.product_url ?? e.links?.[0]);
  if (!host) return null;
  return e.kind === "guide" ? `Guide from ${host}` : `From ${host}`;
}

/** "Exa search", where an agent's name and mark go: the word Exa set plainly (see public/brands/NOTICE.md). */
export function ExaSearchTag({ mine, keyHolder }: { mine: boolean; keyHolder: string }) {
  return (
    <span className="agent-tag exa-tag" title={mine ? "Exa search, your routine" : `Exa search, @${keyHolder}'s routine`}>
      <span className="dot" aria-hidden="true">
        E
      </span>
      <span>
        Exa search<span className="sr-only">{mine ? ", your routine" : `, @${keyHolder}'s routine`}</span>
      </span>
    </span>
  );
}

export function RoutineSuggestion({ entry: e, routines, me, shopping }: { entry: Entry; routines: RoutineSummary[] | null; me: string | null; shopping: boolean }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const pendingIntent = fetcher.formData?.get("intent");
  if (fetcher.state === "idle" && fetcher.data?.ok) return null;
  const author = e.author.kind === "outside" ? e.author : null;
  const rt = author?.routine ?? null;
  if (!rt) return null;
  const summary = routines?.find((r) => r.id === rt.id);
  const mine = rt.key_holder === me;
  // The routine's own name, only when a person renamed it (the default name is the server's words).
  const named = summary?.name_by === "person" ? summary.name : null;
  const url = e.product_url ?? e.links?.[0] ?? null;
  const from = sourceLabel(e);
  return (
    // Picture, title, where from, the Exa line, Promote and Reject: three to a phone screen.
    <li className="card rt-sugg grid gap-2 p-3 sm:p-4" aria-label={`Suggestion: ${e.title}`}>
      <div className="rt-sugg-main">
        <div className="rt-sugg-img">
          <ProductImage src={e.image_url} alt="" />
        </div>
        <div className="grid min-w-0 content-start gap-1">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="rt-sugg-title break-words font-semibold">
              {e.title}
              <span className="sr-only"> (new tab)</span>
            </a>
          ) : (
            <p className="rt-sugg-title break-words font-semibold">{e.title}</p>
          )}
          {from && <p className="text-[0.82rem] text-ink-3">{from}</p>}
          <RoutineLine e={e} rt={rt} mine={mine} named={named} shopping={shopping} />
        </div>
      </div>
      {/* Tasks and research: the page's own highlight, a few lines of plain text. */}
      {!shopping && e.description && <p className="rt-sugg-desc whitespace-pre-line break-words text-[0.88rem] text-ink-2">{e.description}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-[calc(4.5rem+0.75rem)]">
        <fetcher.Form method="post" className="flex gap-2">
          <input type="hidden" name="entry_id" value={e.id} />
          <button name="intent" value="promote" className="btn btn-ghost btn-sm" disabled={fetcher.state !== "idle"}>
            {pendingIntent === "promote" ? "Promoting…" : "Promote to list"}
          </button>
          <button name="intent" value="reject" className="btn-quiet" disabled={fetcher.state !== "idle"}>
            {pendingIntent === "reject" ? "Rejecting…" : "Reject"}
          </button>
        </fetcher.Form>
      </div>
      {fetcher.data?.error && (
        <p className="form-error" role="alert">
          {fetcher.data.error}
        </p>
      )}
    </li>
  );
}

/** "Exa search · your routine · not checked on the store's page": whole items, never a line starting with a dot. */
function RoutineLine({ e, rt, mine, named, shopping }: { e: Entry; rt: { key_holder: string }; mine: boolean; named: string | null; shopping: boolean }) {
  return (
    <MetaLine
      as="p"
      className="text-[0.78rem] text-ink-3"
      items={[
        <ExaSearchTag key="tag" mine={mine} keyHolder={rt.key_holder} />,
        named && `“${named}”`,
        mine ? "your routine" : `@${rt.key_holder}'s routine`,
        e.kind !== "guide" && (shopping ? "not checked on the store's page" : "not checked"),
      ]}
    />
  );
}
