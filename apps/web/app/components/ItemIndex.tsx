import { useContext, useEffect, useRef, useState } from "react";
import { PreviewContext } from "~/components/preview";
import { DueChip } from "~/components/ItemWork";
import { ChecklistBox, type ItemWithEntries } from "~/components/ListView";
import { agentHue, formatMoney, plural } from "~/lib/format";
import type { FormatInfo } from "~/lib/formats";
import type { ActorRef } from "~/lib/types";

type Kind = "sections" | "heat" | "board" | "gallery";

/**
 * A compact index of a list's items, used by the Sections, Heat and (for tasks and research)
 * Board layouts. Each row, bar or card links to the item's own #itm_ anchor; the full item
 * opens in a panel (`.ix-panel`, shown with :target, so it works without JavaScript).
 * Group names are not headings: the page keeps the same heading order in every theme.
 */
export function ItemIndex({
  kind,
  items,
  fi,
  isWriter,
  isDone,
}: {
  kind: Kind;
  items: ItemWithEntries[];
  fi: FormatInfo;
  isWriter: boolean;
  isDone: (i: ItemWithEntries) => boolean;
}) {
  useEscapeCloses();
  const preview = useContext(PreviewContext);
  const shopping = fi.format === "shopping";
  const statusOf = (i: ItemWithEntries) =>
    isDone(i) ? "done" : i.status === "waiting_on_owner" ? "waiting_on_owner" : shopping ? "open" : (i.status ?? "open");
  const waiting = items.filter((i) => statusOf(i) === "waiting_on_owner");
  const waitingName = isWriter ? "Waiting on you" : "Waiting on owner";
  const working = items.filter((i) => statusOf(i) === "in_progress");
  const open = items.filter((i) => statusOf(i) === "open");
  const done = items.filter((i) => statusOf(i) === "done");
  const names =
    fi.format === "tasks"
      ? { working: "In progress", open: "Open", done: "Done" }
      : fi.format === "research"
        ? { working: "In progress", open: "Open", done: "Answered" }
        : { working: "In progress", open: "Open", done: fi.doneGroup };
  const groups = [
    // SPEC 12.1: shown only when something is waiting.
    ...(waiting.length ? [{ key: "waiting", name: waitingName, items: waiting }] : []),
    ...(shopping ? [] : [{ key: "working", name: names.working, items: working }]),
    { key: "open", name: names.open, items: open },
    { key: "done", name: names.done, items: done },
  ];
  // Board keeps every column (an empty column is information); Sections hides empty groups.
  const byKey = (k: string) => groups.find((g) => g.key === k);
  const shown =
    kind === "board"
      ? ([byKey("waiting"), byKey("open"), byKey("working"), byKey("done")].filter(Boolean) as typeof groups)
      : groups.filter((g) => g.items.length > 0);

  if (kind === "gallery") {
    // Open first (what's waiting on you leads), then the done ones, dimmed, at the end.
    const ordered = [...waiting, ...working, ...open, ...done];
    return (
      <nav id={preview ? undefined : "list-index"} aria-label={`${fi.items[0].toUpperCase()}${fi.items.slice(1)}`} className="ix ix-gallery scroll-mt-24">
        <ol className="gal-grid">
          {ordered.map((item, i) => (
            <GalleryCard key={item.id} item={item} fi={fi} status={statusOf(item)} waitingName={waitingName} working={names.working} doneName={names.done} eager={i < 4} />
          ))}
        </ol>
      </nav>
    );
  }

  if (kind === "heat") {
    const ordered = [...waiting, ...working, ...open];
    return (
      <nav id={preview ? undefined : "list-index"} aria-label={`${fi.items[0].toUpperCase()}${fi.items.slice(1)}`} className="ix ix-heat scroll-mt-24">
        <ol className="ix-bars">
          {ordered.map((item, i) => (
            <li key={item.id} className="ix-bar" style={{ ["--i" as string]: i, ["--n" as string]: Math.max(ordered.length - 1, 1) }}>
              <a href={`#${item.id}`} className="ix-link">
                <span className="ix-title">{item.text}</span>
                <span className="ix-sub">
                  {statusOf(item) === "waiting_on_owner" && <span className="ix-pill">{waitingName}</span>}
                  {statusOf(item) === "in_progress" && <span className="ix-pill">{names.working}</span>}
                  {countLabel(item, fi)}
                </span>
              </a>
            </li>
          ))}
          {done.map((item) => (
            <li key={item.id} className="ix-bar is-done">
              <a href={`#${item.id}`} className="ix-link">
                <span className="ix-title">
                  <span className="sr-only">{fi.done[0].toUpperCase() + fi.done.slice(1)}: </span>
                  {item.text}
                </span>
                <span className="ix-sub">{countLabel(item, fi)}</span>
              </a>
            </li>
          ))}
        </ol>
        {items.length === 0 && <p className="ix-empty">{isWriter ? fi.addItemFirst : `No ${fi.items} yet.`}</p>}
      </nav>
    );
  }

  if (kind === "board") {
    return (
      <nav id={preview ? undefined : "list-index"} aria-label="Board" className="ix ix-board scroll-mt-24">
        <div className="ix-columns">
          {shown.map((g) => (
            <section key={g.key} className={`ix-column is-${g.key}`} aria-label={`${g.name}, ${g.items.length}`}>
              <p className="ix-column-head">
                <span>{g.name}</span> <span className="ix-count">{g.items.length}</span>
              </p>
              <ul className="ix-cards">
                {g.items.map((item) => (
                  <li key={item.id} className={`ix-card ${g.key === "done" ? "is-done" : ""}`}>
                    <a href={`#${item.id}`} className="ix-link">
                      <span className="ix-title">{item.text}</span>
                      <span className="ix-foot">
                        <span className="ix-chips">
                          <DueChip due={item.due_at} done={g.key === "done"} />
                          <span className="ix-meta">{countLabel(item, fi)}</span>
                        </span>
                        <Avatars actors={[item.claimed_by ?? null, item.created_by]} />
                      </span>
                    </a>
                  </li>
                ))}
                {g.items.length === 0 && <li className="ix-none">Nothing here</li>}
              </ul>
              {isWriter && g.key === "open" && (
                <a href="#add-item" className="ix-add">
                  <span aria-hidden="true">+</span> {fi.addItemTitle}
                </a>
              )}
            </section>
          ))}
        </div>
      </nav>
    );
  }

  // Sections
  return (
    <nav id={preview ? undefined : "list-index"} aria-label={`${fi.items[0].toUpperCase()}${fi.items.slice(1)}`} className={`ix ix-sections scroll-mt-24 ${isWriter ? "" : "is-readonly"}`}>
      <div className="ix-table-head" aria-hidden="true">
        <span>Name</span>
        <span>{shopping ? "Found" : "Agent"}</span>
        <span>Due</span>
        <span>Status</span>
      </div>
      {shown.map((g) => (
        <details key={g.key} open={g.key !== "done" || shown.length === 1} className={`ix-group is-${g.key}`}>
          <summary className="ix-group-head">
            <span className="ix-chevron" aria-hidden="true" />
            <span>{g.name}</span> <span className="ix-count">{g.items.length}</span>
          </summary>
          <ul className="ix-rows">
            {g.items.map((item) => {
              const st = statusOf(item);
              const who = item.claimed_by ?? item.completion?.completed_by ?? null;
              return (
                <li key={item.id} className={`ix-row ${st === "done" ? "is-done" : ""}`}>
                  {/* The one-tap tick is the writer's (named "Mark “…” done" by ChecklistBox); visitors read the Status column. */}
                  {isWriter && (
                    <span className="ix-tick">
                      <ChecklistBox
                        itemId={item.id}
                        text={item.text}
                        bought={st === "done"}
                        canWrite
                        shopping={shopping}
                        doneWord={fi.done}
                        waiting={st === "waiting_on_owner"}
                      />
                    </span>
                  )}
                  <a href={`#${item.id}`} className="ix-link">
                    <span className="ix-title">{item.text}</span>
                    <span className="ix-meta">{countLabel(item, fi)}</span>
                  </a>
                  {/* Table cells on wide screens; on phones one line under the title, without the empty cells,
                      the bare count (the line above says it) or the status (the group says it). */}
                  <span className="ix-cells">
                    <span className={`ix-cell ix-who ${shopping ? "is-count" : ""} ${(shopping ? item.entries.length : who) ? "" : "is-empty"}`}>
                      {shopping ? item.entries.length || "–" : who ? <Avatars actors={[who]} named /> : "–"}
                    </span>
                    <span className={`ix-cell ix-due ${item.due_at ? "" : "is-empty"}`}>{item.due_at ? <DueChip due={item.due_at} done={st === "done"} /> : "–"}</span>
                    <span className="ix-cell ix-status">
                      <span className={`ix-pill is-${st}`}>{st === "done" ? names.done : st === "in_progress" ? names.working : st === "waiting_on_owner" ? waitingName : "Open"}</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {isWriter && g.key === "open" && (
            <a href="#add-item" className="ix-add">
              <span aria-hidden="true">+</span> {fi.addItemTitle}
            </a>
          )}
        </details>
      ))}
      {items.length === 0 && <p className="ix-empty">{isWriter ? fi.addItemFirst : `No ${fi.items} yet.`}</p>}
    </nav>
  );
}

function countLabel(item: ItemWithEntries, fi: FormatInfo) {
  const n = item.entries.length;
  if (!n) return `No ${fi.entries} yet`;
  // Collapsed shopping rows: one "from $149.99" rather than a count.
  if (fi.format === "shopping") {
    const priced = item.entries.map((e) => e.current_price).filter((p) => p != null);
    const cheapest = priced.sort((a, b) => Number(a.price) - Number(b.price))[0];
    if (cheapest) return `from ${formatMoney(cheapest.price, cheapest.currency)}`;
  }
  return plural(n, fi.entry);
}

function Avatars({ actors, named = false }: { actors: Array<ActorRef | null>; named?: boolean }) {
  const seen = new Set<string>();
  const list = actors.filter((a): a is ActorRef => {
    if (!a) return false;
    const key = a.kind === "agent" ? a.agent_id : a.kind === "user" ? a.handle : "outside";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <span className="ix-avatars">
      {list.map((a, i) => {
        const name = a.kind === "agent" ? a.name : a.kind === "user" ? a.handle : (a.name ?? "Outside agent");
        const hue = a.kind === "agent" ? `var(--agent-${agentHue(a.name)})` : "var(--ink-3)";
        return (
          <span key={i} className="ix-avatar-wrap">
            <span className="ix-avatar" style={{ ["--hue" as string]: hue }} aria-hidden="true">
              {name.slice(0, 1).toUpperCase()}
            </span>
            {named ? <span className="ix-avatar-name">{name}</span> : <span className="sr-only">{name}</span>}
          </span>
        );
      })}
    </span>
  );
}

/** Escape closes an open item panel. */
function useEscapeCloses() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !location.hash) return;
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target?.closest(".ix-panel")) {
        const id = target.closest(".item-section")?.id;
        location.hash = "list-index";
        if (id) document.querySelector<HTMLAnchorElement>(`.ix a[href="#${id}"]`)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** The photos a want can lead with, in order: its best product's (the cheapest with a price), then the newest first. */
function galleryPick(item: ItemWithEntries) {
  const listed = item.entries;
  const priced = listed.filter((e) => e.current_price).sort((a, b) => Number(a.current_price!.price) - Number(b.current_price!.price));
  const best = priced[0] ?? null;
  const newest = [...listed].filter((e) => e.image_url).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const photos = [...new Set([best?.image_url, ...newest.map((e) => e.image_url)].filter((u): u is string => !!u))];
  return { best, photos };
}

/** One card: the photo at its natural height (or none: a calm text card), the want, the best price and store, the count. */
function GalleryCard({
  item,
  fi,
  status,
  waitingName,
  working,
  doneName,
  eager,
}: {
  item: ItemWithEntries;
  fi: FormatInfo;
  status: string;
  waitingName: string;
  working: string;
  doneName: string;
  eager: boolean;
}) {
  const { best, photos } = galleryPick(item);
  // A photo that fails gives way to the next one; with none left, the card is a text card (never a hole).
  const [tried, setTried] = useState(0);
  const photo = photos[tried] ?? null;
  const failed = !photo;
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // Failed before hydration attached onError. A lazy image not fetched yet is "complete" with no size too: only one
    // that was fetched (currentSrc) counts.
    const el = img.current;
    if (el && el.complete && el.currentSrc && el.naturalWidth === 0) setTried((n) => n + 1);
  }, [photo]);
  const n = item.entries.length;
  // A bought want says what was paid and where, as every other look does; an open one, its best offer.
  const paid = item.purchase ?? null;
  const p = paid?.price ? { price: paid.price, currency: paid.currency ?? "USD" } : paid ? null : best?.current_price;
  const store = paid ? paid.retailer : best?.retailer;
  return (
    <li className={`gal-card ${failed ? "is-text" : ""} ${status === "done" ? "is-done" : ""}`}>
      <a href={`#${item.id}`} className="gal-link">
        {photo && (
          <img
            key={photo}
            ref={img}
            src={photo}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            className="gal-img"
            onError={() => setTried((n) => n + 1)}
          />
        )}
        <span className="gal-body">
          {(status === "waiting_on_owner" || status === "in_progress" || status === "done") && (
            <span className={`gal-pill ${status === "waiting_on_owner" ? "is-warn" : ""}`}>
              {status === "waiting_on_owner" ? waitingName : status === "in_progress" ? working : doneName}
            </span>
          )}
          <span className="gal-title">{item.text}</span>
          {p && (
            <span className="gal-price">
              <strong>{formatMoney(p.price, p.currency)}</strong>
              {store && <span className="gal-store"> at {store}</span>}
            </span>
          )}
          <span className="gal-meta">{n ? plural(n, fi.entry) : `No ${fi.entries} yet`}</span>
        </span>
      </a>
    </li>
  );
}
