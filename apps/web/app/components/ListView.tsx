import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { SEASON, seasonActive } from "~/lib/season";
import { MetaLine, type MetaItem } from "~/components/MetaLine";
import { GiveToAgent } from "~/components/GiveToAgent";
import { ShareWithAgent } from "~/components/ShareWithAgent";
import { HeadingBase, headingTag } from "~/components/preview";
import { Form, Link, useFetcher, useLocation } from "react-router";
import { ActorTag } from "~/components/ActorTag";
import { CommentForm, CommentList } from "~/components/Comments";
import { CopyButton } from "~/components/CopyButton";
import { EntryCard } from "~/components/EntryCard";
import { EntrySheet, SheetSortSelect, SORT_FROM, type SheetSort } from "~/components/EntrySheet";
import { ItemIndex } from "~/components/ItemIndex";
import { LiveUpdates } from "~/components/LiveUpdates";
import { PreviewContext, ReportLink, ReportMenuItem } from "~/components/Report";
import { closeMenuOf, Icon, Menu, MenuRemove, MenuSub } from "~/components/Actions";
import { Time } from "~/components/Time";
import { canManage, EditItem, EntryForm, MarkBoughtElsewhere, MarkBoughtForm } from "~/components/WriteTools";
import { discountPercent, formatDate, formatMoney, plural, timeAgo } from "~/lib/format";
import { formatInfo, visibilityOf, type FormatInfo } from "~/lib/formats";
import { AcceptedAnswer, DueChip, ItemDetails, ItemStatusBar, OwnerQuestion, StatusOptions, TextEntryCard, TextEntryForm, useActorLabel } from "~/components/ItemWork";
import { BUILD_ID } from "~/lib/build";
import { itemCurrency, listCurrency } from "~/lib/currency";
import { lowestEntryId, lowestLabel } from "~/lib/prices";
import { moneyPlaceholder, useCurrency, useHydrated, useNow } from "~/lib/hooks";
import { useRootData } from "~/lib/hooks";
import type { Comment, Entry, Item, ListAccess, ListSummary, Page, PriceObservation, RoutineSummary, UserSelf } from "~/lib/types";
import { agentWroteName, guidesOf, productsOf } from "~/lib/routines";
import { RoutineSuggestion } from "~/components/RoutineSuggestion";
import { GuideNotes } from "~/components/GuideNotes";
import type { Layout } from "~/themes/types";
import type { ThemeView } from "~/themes/view";

/** heldGuides: guides a routine found that no writer has kept or dismissed yet (writers only, SPEC 20.14 item 13). */
export type ItemWithEntries = Item & { entries: Entry[]; heldGuides?: Entry[] };


function sortByPrice(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (!a.current_price) return 1;
    if (!b.current_price) return -1;
    return Number(a.current_price.price) - Number(b.current_price.price);
  });
}

export interface ListViewProps {
  list: ListSummary;
  items: ItemWithEntries[];
  suggestions: Array<{ entry: Entry; item: Pick<Item, "id" | "text"> }>;
  comments: Comment[];
  commentsCursor: string | null;
  prices: Record<string, PriceObservation[]>;
  isWriter: boolean;
  role: "owner" | "member" | null;
  origin: string;
  theme: ThemeView;
  /** Gallery and settings previews: no live updates, reporting, sharing or footer call-to-action. */
  preview?: boolean;
  /** Show only the first N wanted items (gallery tiles). */
  previewItems?: number;
  /** A miniature: the header is the title only (no counts, owner, description or sample note). */
  thumbnail?: boolean;
  /** A sample on a /for page: title, description and a quiet "Sample" tag; no counts, no owner. */
  sample?: boolean;
  /** The owner's next step while no agent works on the list (list page only). */
  handoff?: { focus: boolean; connectedName: string | null } | null;
  /** Who can write the list (writers only, list page only). */
  accessList?: ListAccess | null;
  /** An agent that can write the list and hasn't acted yet; `used` false: its key was never used (it hasn't connected). */
  idleAgent?: { name: string; used: boolean | null } | null;
  /** Just kept from a claim link: who made it. */
  kept?: { kind: "unclaimed" | "handover"; by: string } | null;
}

/** A want list, rendered in its theme. Used by the list page, the theme gallery and settings previews. */
export function ListView(props: ListViewProps) {
  const { list, items, suggestions, comments: firstComments, commentsCursor, prices, isWriter, role, origin, theme, preview = false, previewItems, thumbnail = false } = props;
  const { user } = useRootData();
  const base = useContext(HeadingBase);
  const H1 = headingTag(base, 0);
  const H2 = headingTag(base, 1);
  const listUrl = `${origin}/l/${list.id}`;
  // The list's own agents with keys, so "Share with an agent" can say when one already has a key.
  const agentNames = (props.accessList?.agents ?? []).filter((a) => a.kind === "key").map((a) => a.name);
  // Every agent on the list, signed in or with a key: when they are all one kind, the step starts with it picked (G3).
  const onList = (props.accessList?.agents ?? []).map((a) => a.name);
  // /l/<id>?share=agent (from a list card's ⋯ on /app): the same step, open on the page.
  const shareParam = new URLSearchParams(useLocation().search).get("share");
  const shareAgentOpen = isWriter && !preview && shareParam === "agent";
  const more = useMoreComments(list.id, commentsCursor);
  const comments = useMemo(() => {
    const seen = new Set(firstComments.map((c) => c.id));
    return [...firstComments, ...more.comments.filter((c) => !seen.has(c.id))];
  }, [firstComments, more.comments]);
  useDeepLinks();

  const commentsFor = (type: "item" | "entry", id: string) => comments.filter((c) => c.target_type === type && c.target_id === id);
  const canDeleteComment = (c: Comment) => canManage(c.author, user, role);

  const fi = formatInfo(list);
  // SPEC 20.14 item 13: guides waiting for a writer, counted apart from suggestions.
  const heldGuideCount = isWriter ? items.reduce((n, it) => n + (it.heldGuides?.length ?? 0), 0) : 0;
  const shopping = fi.format === "shopping";
  const isPrivate = visibilityOf(list) === "private";
  const isDone = (i: ItemWithEntries) => (shopping ? !!i.purchase : i.status === "done");
  // SPEC 16.2: outsiders' items waiting for a writer to accept them. They keep their place in the list (re-sorting on
  // Accept would slide the next one under the finger), and the connect card waits until after them.
  const heldCount = isWriter ? (list.awaiting_review ?? items.filter((i) => i.pending_review).length) : 0;
  const wanted = items.filter((i) => !isDone(i)).slice(0, previewItems ?? Infinity);
  // Newest first, so what was just checked off sits at the top of the Done group (and isn't folded away).
  const doneAt = (i: ItemWithEntries) => i.purchase?.purchased_at ?? i.completion?.completed_at ?? "";
  const bought = previewItems ? [] : items.filter(isDone).sort((a, b) => doneAt(b).localeCompare(doneAt(a)));
  // The want just checked off, for "Bought “…”. Undo" (owner, 26 Nov 2026: check-offs on the Checklist look).
  const [justChecked, setJustChecked] = useState<JustChecked | null>(null);
  const listCurrencyHint = listCurrency(items);
  // Nobody else on it yet (owner, 26 Nov 2026): a private list with no other person, no pending invite and no agent.
  // Its owner gets "Share list" in words, with a soft ring. The moment someone joins or it's made public, the icon returns.
  const alone =
    role === "owner" && isPrivate && !preview && !!list.access && list.access.people <= 1 && list.access.agents === 0 && (list.access.pending_invites ?? 0) === 0;
  const productCount = items.reduce((n, i) => n + i.entries.length, 0);
  // Nothing posted on any want yet: one line for the list instead of one per want.
  const nothingYet = items.length > 0 && productCount === 0;
  // Has any agent done anything here (added, claimed, posted, noted)? Then "no agent has worked on this" would be false.
  const agentActive = items.some(
    (it) => it.created_by.kind === "agent" || it.claimed_by?.kind === "agent" || !!it.status_note || it.entries.some((e) => e.author.kind === "agent"),
  );
  const agentsCanWrite = list.access?.agents ?? 0;
  const idleAgent =
    isWriter && agentsCanWrite > 0 && !agentActive
      ? (props.idleAgent ?? (props.accessList?.agents[0] ? { name: props.accessList.agents[0].name, used: null } : null))
      : null;
  // The Sheet table compares prices, so it only applies to shopping lists.
  const layout: Layout = theme.layout === "sheet" && !shopping ? "list" : theme.layout;
  // Sections, Heat and (for tasks and research) Board show a compact index; each item opens in a panel.
  const indexKind = layout === "sections" || layout === "heat" || layout === "gallery" || (layout === "board" && !shopping) ? layout : null;
  const className = `${theme.className.replace(/\blayout-\w+\b/, `layout-${layout}`)} format-${fi.format}${indexKind ? " has-index" : ""}${previewItems ? "" : " list-page"}`;

  // Row 2 of the header: counts, and for anyone but the owner, whose list it is and (if over a day) its age.
  const now = useNow();
  // Zero counts say nothing: they're left out.
  const meta: MetaItem[] = props.sample ? [<span className="chip">Sample</span>] : [
    // Held reports (SPEC 16.2) are counted apart, as the API does: "2 open · 1 waiting for you to accept".
    ...(wanted.length - heldCount > 0 ? [<>{wanted.length - heldCount} open</>] : []),
    ...(heldCount > 0 ? [<span className="font-medium text-warn">{heldCount} waiting for you to accept</span>] : []),
    ...(bought.length ? [<>{bought.length} {fi.done}</>] : []),
    // On a phone the products count is the one that goes, rather than wrap alone onto a second line.
    ...(productCount ? [{ node: <>{productCount} {productCount === 1 ? fi.entry : fi.entries}</>, className: "max-sm:hidden" }] : []),
  ];
  if (role !== "owner" && !props.sample) meta.push(<>by {list.owner_handle}</>);
  if (!isWriter && !props.sample && now - Date.parse(list.updated_at) > 24 * 3600_000) meta.push(<>updated <Time ts={list.updated_at} /></>);

  return (
    <PreviewContext.Provider value={preview}>
    <CheckedContext.Provider value={setJustChecked}>
    <div
      className={className}
      style={{ ...theme.style, ["--list-progress" as string]: items.length - heldCount > 0 ? items.filter(isDone).length / (items.length - heldCount) : 0 } as React.CSSProperties}
      data-list-theme={theme.slug}
      data-list-format={fi.format}
    >
      {/* Only what this look needs: its template's and its occasion's stylesheets (React hoists them into <head> and loads each once). */}
      {theme.stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={`${href}?v=${BUILD_ID}`} precedence="theme" />
      ))}
      {/* data-year: the year ahead (from October on), for themes that print it. */}
      <section className="list-hero border-b border-line" data-year={yearAhead(list.created_at)}>
        <div className="wrap py-5 sm:py-7">
          {/* Two rows at most: the title with its icon-only actions, then one quiet line. */}
          <header className="list-titlebar">
            <H1 className="list-title max-w-4xl text-[1.6rem] font-semibold sm:text-[2.1rem]">
              <span className="list-title-mark" aria-hidden="true" />
              <span className="list-title-text">{list.title}</span>
            </H1>
            {!preview && (
              <div role="toolbar" aria-label="List" className="list-actions">
                {/* Public: the link carries ?ref=share so sign-ups from shared lists can be counted. Private: the plain link, and who can open it. */}
                {isWriter ? (
                  // A private list's link opens for no one else: Share says so and offers the two ways to change that.
                  <ShareInvite listId={list.id} on={alone}>
                  <Menu
                    label={alone ? "Share list" : "Share"}
                    triggerClass={alone ? `btn-tool share-invite${SHARE_PULSE_ALWAYS ? " pulse-always" : ""}` : "btn-tool"}
                    trigger={
                      alone ? (
                        <>
                          <Icon name="share" />
                          <span>Share list</span>
                        </>
                      ) : (
                        <>
                          <Icon name="share" />
                          <span className="btn-tool-label">Share</span>
                        </>
                      )
                    }
                    wide
                  >
                    <div className="grid gap-2 p-3 text-[0.9rem]">
                      {isPrivate && <p className="text-ink-2">Only you and people you invite can open this list.</p>}
                      {isPrivate && role === "owner" && (
                        <Form method="post" action={`/app/lists/${list.id}/settings`} onSubmit={(e) => !confirm("Make this list public? Anyone with the link will be able to read it, and search engines can find it.") && e.preventDefault()}>
                          <input type="hidden" name="intent" value="visibility" />
                          <input type="hidden" name="visibility" value="public" />
                          <input type="hidden" name="return" value={`/l/${list.id}`} />
                          <button className="menu-item w-full">Make it public…</button>
                        </Form>
                      )}
                      {/* A write key for one agent, and the prompt that sets it up: only this step's button creates one. */}
                      <MenuSub label="Share with an agent">
                        <ShareWithAgent listId={list.id} listUrl={listUrl} existing={agentNames} onList={onList} />
                      </MenuSub>
                      {/* Inviting is the owner's (the API refuses members). */}
                      {role === "owner" && (
                        <Link to={`/app/lists/${list.id}/settings#sharing-h`} className="menu-item">
                          Share with a person
                        </Link>
                      )}
                      <CopyButton text={isPrivate ? listUrl : `${listUrl}?ref=share`} label="Copy link" doneText="Link copied" className="menu-item" />
                    </div>
                  </Menu>
                  </ShareInvite>
                ) : (
                  <CopyButton
                    text={isPrivate ? listUrl : `${listUrl}?ref=share`}
                    label="Share"
                    labelClass="btn-tool-label"
                    doneText={isPrivate ? "Link copied. Only people with access can open it." : "Link copied"}
                    tooltip={isPrivate ? "Copy link (only people with access can open it)" : "Copy link"}
                    className="btn-tool"
                    icon={<Icon name="share" />}
                    shareTitle={list.title}
                  />
                )}
                {isWriter && (
                  <Link to={`/app/lists/${list.id}/settings`} className="btn-tool" title="List settings">
                    <Icon name="gear" />
                    <span className="btn-tool-label">Settings</span>
                  </Link>
                )}
                {!isWriter && !isPrivate && <ReportLink type="list" id={list.id} label="Report" />}
              </div>
            )}
          </header>
          {!thumbnail && (
            <>
          {/* Each item draws its own leading dot; a dot that would start a wrapped line is clipped (app.css .meta-line). */}
          <MetaLine
            className="list-meta mt-1.5 text-[0.88rem] text-ink-3"
            items={[
              isPrivate && (
                <span className="inline-flex items-center gap-1 text-ink-2">
                  <LockIcon />
                  Private
                </span>
              ),
              isWriter && list.access && !preview && (list.access.people > 1 || list.access.agents > 0 || list.access.pending_invites > 0) && (
                <WhoHasAccess counts={list.access} who={props.accessList ?? null} listId={list.id} />
              ),
              ...meta,
            ]}
          />
          {list.description && <p className="list-desc mt-3 max-w-2xl text-[0.98rem] text-ink-2">{list.description}</p>}
          {isWriter && !preview && <RoutineLine list={list} me={user?.handle ?? null} />}
            </>
          )}
        </div>
      </section>

      {!preview && <LiveUpdates query={`list=${encodeURIComponent(list.id)}`} />}
      <div className="wrap grid grid-cols-1 gap-8 py-6">
        {more.hasMore && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-sunk px-4 py-3 text-[0.9rem]" role="status">
            <button type="button" className="btn btn-ghost btn-xs" onClick={more.loadMore} disabled={more.loading}>
              {more.loading ? "Loading…" : "Show more comments"}
            </button>
          </div>
        )}
        {props.kept && !preview && <KeptNote listId={list.id} kept={props.kept} isPrivate={isPrivate} />}
        {shareAgentOpen && <ShareAgentPanel listId={list.id} listUrl={listUrl} existing={agentNames} onList={onList} />}
        {/* With items waiting for the person to accept, those come first and this card follows the list. */}
        {props.handoff && !preview && heldCount === 0 && <GiveToAgent listId={list.id} listUrl={listUrl} focus={props.handoff.focus} connectedName={props.handoff.connectedName} />}
        {nothingYet && !preview && !props.handoff && (!isWriter || (!agentActive && agentsCanWrite === 0) || idleAgent) && (
          <p className="list-nothing-yet text-[0.95rem] text-ink-2">
            {idleAgent ? (
              // Connected only once it has been used; a key that was never used says so (review A3).
              idleAgent.used ? (
                <>{idleAgent.name} is connected. Tell it what to do next.</>
              ) : idleAgent.used === false ? (
                <>Key made for {idleAgent.name}. It hasn't connected yet: paste the prompt into it.</>
              ) : (
                <>{idleAgent.name} can work on this list. Nothing posted yet.</>
              )
            ) : isWriter ? (
              <>
                No agent has worked on this list yet.{" "}
                {/* This list's own share-with-an-agent step, not the general Connect page (review J1). */}
                <Link to={`/l/${list.id}?share=agent`} replace preventScrollReset className="hit link font-medium text-ink">
                  Connect one
                </Link>
              </>
            ) : (
              <>Nothing found yet.</>
            )}
          </p>
        )}
        {isWriter && <AddItem listId={list.id} empty={items.length === 0} fi={fi} isPrivate={isPrivate} currency={listCurrencyHint} />}
        {!isWriter && !preview && items.length === 0 && <p className="text-ink-3">No {fi.items} yet.</p>}

        {indexKind && (
          <ItemIndex
            kind={indexKind}
            items={previewItems ? items.slice(0, Math.max(previewItems, 4)) : items}
            fi={fi}
            isWriter={isWriter}
            isDone={isDone}
          />
        )}
        <div className={`items-region grid grid-cols-1 gap-8 ${indexKind ? "ix-panel" : ""}`}>
          {indexKind && <a href="#list-index" className="ix-backdrop" tabIndex={-1} aria-hidden="true" />}
        {wanted.map((item, i) => (
          <ItemSection
            fi={fi}
            layout={layout}
            checklist={theme.checklist}
            key={item.id}
            n={i + 1}
            item={item}
            prices={prices}
            commentsFor={commentsFor}
            isWriter={isWriter}
            role={role}
            user={user}
            canDeleteComment={canDeleteComment}
            eager={i === 0}
            inPanel={!!indexKind}
            ownerHandle={list.owner_handle}
            listCurrency={listCurrencyHint}
            quietEmpty={nothingYet}
          />
        ))}

        {bought.length > 0 && (
          <section aria-labelledby={`${list.id}-bought-h`} className="bought-group grid content-start gap-10">
            <div className="bought-divider flex items-center gap-4">
              <H2 id={`${list.id}-bought-h`} className="text-2xl font-semibold">{fi.doneGroup}</H2>
              <div className="divider-dots flex-1" />
            </div>
            {(indexKind ? bought : bought.slice(0, DONE_SHOWN)).map((item) => {
              const section = (
              <ItemSection
                fi={fi}
                layout={layout}
                checklist={theme.checklist}
                    key={item.id}
                item={item}
                prices={prices}
                commentsFor={commentsFor}
                isWriter={isWriter}
                role={role}
                user={user}
                canDeleteComment={canDeleteComment}
                inPanel={!!indexKind}
                ownerHandle={list.owner_handle}
                listCurrency={listCurrencyHint}
              />
              );
              // Index layouts already show a done item as one compact row; elsewhere it collapses to one line, the rest behind it.
              return indexKind ? section : (
                <DoneRow key={item.id} item={item} fi={fi} tick={theme.checklist && isWriter}>
                  {section}
                </DoneRow>
              );
            })}
            {/* After a few, the rest of the Done group folds (owner, 26 Nov 2026). */}
            {!indexKind && bought.length > DONE_SHOWN && (
              <details className="done-more group">
                <summary className="textlink-btn text-[0.9rem]">
                  Show {bought.length - DONE_SHOWN} more {fi.done}
                </summary>
                <div className="mt-4 grid gap-10">
                  {bought.slice(DONE_SHOWN).map((item) => (
                    <DoneRow key={item.id} item={item} fi={fi} tick={theme.checklist && isWriter}>
                      <ItemSection
                        fi={fi}
                        layout={layout}
                        checklist={theme.checklist}
                        item={item}
                        prices={prices}
                        commentsFor={commentsFor}
                        isWriter={isWriter}
                        role={role}
                        user={user}
                        canDeleteComment={canDeleteComment}
                        inPanel={false}
                        ownerHandle={list.owner_handle}
                        listCurrency={listCurrencyHint}
                      />
                    </DoneRow>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}
        {isWriter && justChecked && <UndoCheck key={justChecked.itemId} checked={justChecked} fi={fi} onDone={() => setJustChecked(null)} />}
        </div>

        {props.handoff && !preview && heldCount > 0 && <GiveToAgent listId={list.id} listUrl={listUrl} focus={props.handoff.focus} connectedName={props.handoff.connectedName} />}

        {/* Outside suggestions come after the person's own list, never before it. */}
        {isWriter && heldGuideCount > 0 && suggestions.length === 0 && (
          <p className="text-[0.92rem] text-ink-2">{plural(heldGuideCount, "guide")} to look at, under their wants.</p>
        )}
        {isWriter && suggestions.length > 0 && <Suggestions suggestions={suggestions} routines={list.routines ?? null} me={user?.handle ?? null} shopping={shopping} guides={heldGuideCount} />}

        {!isWriter && !preview && (
          <aside aria-labelledby="own-h" className="card grid gap-3 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 id="own-h" className="text-[1.05rem] font-semibold">
                Make your own list. Your AI agents work on it.
              </h2>
              {seasonActive(SEASON, now) && <p className="mt-1 text-[0.92rem] text-ink-2">{SEASON.heading}</p>}
            </div>
            <Link to="/?ref=share" className="btn btn-want">
              Start a list
            </Link>
          </aside>
        )}
      </div>
    </div>
    </CheckedContext.Provider>
    </PreviewContext.Provider>
  );
}

function ItemSection({
  item,
  n,
  prices,
  commentsFor,
  isWriter,
  role,
  user,
  canDeleteComment,
  eager,
  layout,
  checklist,
  fi,
  inPanel = false,
  ownerHandle,
  listCurrency,
  quietEmpty = false,
}: {
  /** Nothing on the whole list yet: the list says so once, so each empty want stays silent. */
  quietEmpty?: boolean;
  ownerHandle: string;
  listCurrency?: string;
  inPanel?: boolean;
  fi: FormatInfo;
  layout: Layout;
  checklist: boolean;
  item: ItemWithEntries;
  n?: number;
  prices: Record<string, PriceObservation[]>;
  commentsFor: (t: "item" | "entry", id: string) => Comment[];
  isWriter: boolean;
  role: "owner" | "member" | null;
  user: UserSelf | null;
  canDeleteComment: (c: Comment) => boolean;
  eager?: boolean;
}) {
  const canEditItem = canManage(item.created_by, user, role);
  const who = useActorLabel();
  const base = useContext(HeadingBase);
  const H2 = headingTag(base, 1);
  const H3 = headingTag(base, 2);
  const now = useNow();
  // Guides are not products: never in the prices or the product rows, shown under them as guides (SPEC 20.14 item 12).
  const entries = sortByPrice(productsOf(item.entries));
  const guides = guidesOf(item.entries);
  const textEntries = productsOf(item.entries);
  const lowest = lowestEntryId(entries, now);
  const lowestText = lowestLabel(entries, lowest, now);
  const itemComments = commentsFor("item", item.id);
  const shopping = fi.format === "shopping";
  const p = shopping ? item.purchase : null;
  const status = item.status ?? (item.purchase ? "done" : "open");
  const done = shopping ? !!item.purchase : status === "done";
  const acceptedId = !shopping && status === "done" ? item.completion?.entry_id ?? null : null;
  const accepted = acceptedId ? item.entries.find((e) => e.id === acceptedId) : undefined;
  const cheapest = entries.find((e) => e.current_price)?.current_price;
  const currencyHint = itemCurrency(item, listCurrency);
  // Older purchases may only record the entry; fall back to its price and retailer.
  const boughtEntry = p?.entry_id ? entries.find((e) => e.id === p.entry_id) : undefined;
  const boughtPrice = p?.price ? { price: p.price, currency: p.currency } : boughtEntry?.current_price ?? null;
  const boughtRetailer = p?.retailer ?? boughtEntry?.retailer ?? null;
  const inDoneRow = useContext(InDoneRow);
  const headingId = `${item.id}-h`;
  // SPEC 16.2: someone outside the list wrote it (a feedback task); held until a person who can write the list accepts it.
  const outsider = item.text_by === "outsider";
  const [sheetSort, setSheetSort] = useState<SheetSort>({ key: "price", dir: "asc" });
  const sortable = layout === "sheet" && shopping && entries.length >= SORT_FROM;
  const sortControl = (cls: string) =>
    sortable ? (
      <SheetSortSelect
        value={sheetSort}
        onChange={setSheetSort}
        saving={entries.some((e) => discountPercent(e.current_price) !== null)}
        label={`Sort products for ${item.text.slice(0, 60)}`}
        className={cls}
      />
    ) : null;
  const held = !!item.pending_review;

  return (
    <section id={item.id} aria-labelledby={headingId} data-status={status} className={`item-section grid scroll-mt-24 gap-3 ${done ? "is-bought" : ""}`}>
      {inPanel && (
        <a href="#list-index" className="ix-close btn-quiet justify-self-end">
          Close<span className="sr-only"> {item.text}</span>
        </a>
      )}
      <header className="grid gap-2">
        <div className="item-head flex items-start gap-3">
          {checklist ? (
            <ChecklistBox
              itemId={item.id}
              text={item.text}
              bought={done}
              canWrite={isWriter}
              shopping={shopping}
              doneWord={fi.done}
              waiting={status === "waiting_on_owner"}
            />
          ) : (
            n !== undefined && (
              <span aria-hidden="true" className="item-number mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-semibold text-paper">
                {n}
              </span>
            )
          )}
          <H2 id={headingId} tabIndex={-1} className={`item-title min-w-0 flex-1 text-[1.15rem] font-semibold sm:text-[1.35rem] ${done ? "text-ink-2" : ""} ${outsider ? "line-clamp-2" : ""}`}>
            {item.text}
          </H2>
          {/* The item's actions: at the right end of its title row. */}
          <span className="item-actions">
            {isWriter && shopping && !p && !checklist && <MarkBoughtElsewhere itemId={item.id} itemText={item.text} currency={currencyHint} />}
            {/* Visitors: nothing here but Report, which the list's own flag in the header covers. */}
            {isWriter && (
            <Menu label={`More actions for “${item.text.slice(0, 60)}”`}>
              {isWriter && shopping && !p && !checklist && (
                // On phones "Mark bought" lives here, so the title keeps the row.
                <div className="sm:hidden">
                  <MenuSub label="Mark bought">
                    <MarkBoughtForm itemId={item.id} currency={currencyHint} />
                  </MenuSub>
                </div>
              )}
              {isWriter && entries.length === 0 && (
                <MenuSub label={fi.addEntryLabel}>
                  {fi.format === "shopping" ? <EntryForm itemId={item.id} currency={currencyHint} /> : <TextEntryForm itemId={item.id} fi={fi} />}
                </MenuSub>
              )}
              {isWriter && itemComments.length === 0 && (
                <MenuSub label="Comment">
                  <CommentForm targetType="item" targetId={item.id} label={`Comment on this ${fi.item}`} />
                </MenuSub>
              )}
              {isWriter && !shopping && status === "open" && !item.status_note && (
                // The status pill shows only once there is something to say (in progress, waiting, a note); until then
                // the status is changed here (review H3).
                <MenuSub label="Status">
                  <StatusOptions itemId={item.id} status="open" doneWord={fi.format === "research" ? "Answered" : "Done"} claimed={false} canTakeOver={false} outsider={outsider} />
                </MenuSub>
              )}
              {canEditItem && (
                <MenuSub label={`Edit ${fi.item}`}>
                  <EditItem item={item} onDone={() => closeMenuOf(document.getElementById(headingId)?.closest("section")?.querySelector(":popover-open"))} label={`Edit ${fi.item}`} />
                </MenuSub>
              )}
              <ReportMenuItem type="item" id={item.id} author={item.created_by} />
              {canEditItem && (
                <MenuRemove intent="delete-item" fields={{ item_id: item.id }} label="Remove" confirmText={`Remove “${item.text.slice(0, 80)}” and everything on it?`} />
              )}
            </Menu>
            )}
          </span>
        </div>
        <div className="item-meta item-indent flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.85rem] text-ink-3 sm:pl-11">
          {/* Who added it, only when that tells the owner something: an agent or another person. Once a person rewrites an
              agent's want (text_by "person"), the words are theirs and the line goes. An outsider's item (SPEC 16.2, a
              feedback task) always says so, and while it is held, that readers can't see it yet and how to let them. */}
          {outsider ? (
            <OutsiderLine held={held && isWriter} itemId={item.id} itemText={item.text} headingId={headingId} />
          ) : !(item.created_by.kind === "user" && item.created_by.handle === ownerHandle) && !(item.text_by === "person" && item.created_by.kind === "agent") && (
            <span className="inline-flex items-center gap-1.5">
              Added by <ActorTag actor={item.created_by} compact /> <Time ts={item.created_at} />
            </span>
          )}
          <DueChip due={item.due_at} done={done} />
          {sortControl("is-inline")}
        </div>
        {p && (
          // In an opened done row, one plain line with Undo beside it, not a box (review F9).
          <div className={`item-indent mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem] sm:ml-11 ${inDoneRow ? "" : "rounded-md border border-deal/40 bg-deal-soft px-4 py-3"}`}>
            <span className="text-ink">
              Bought{boughtPrice ? <> for <strong>{formatMoney(boughtPrice.price, boughtPrice.currency)}</strong></> : null}
              {boughtRetailer ? ` at ${boughtRetailer}` : ""} by{" "}
              {who(p.purchased_by)},{" "}
              <Time ts={p.purchased_at} />
            </span>
            {isWriter && <UndoPurchase itemId={item.id} />}
          </div>
        )}
        {outsider ? <OutsiderDetails details={item.details} title={item.text} /> : <ItemDetails details={item.details} fold={layout === "sheet"} />}
        {!held && (!shopping || status === "waiting_on_owner" || !!item.status_note) && (
          <ItemStatusBar
            itemId={item.id}
            status={status}
            claimedBy={item.claimed_by}
            claimedAt={item.claimed_at}
            completion={item.completion}
            statusNote={item.status_note}
            statusNoteAt={item.status_note_at}
            fi={fi}
            canWrite={isWriter}
            outsider={outsider}
          />
        )}
        {/* SPEC 12.1: questions and answers are for writers only, on public lists too. */}
        {isWriter && <OwnerQuestion question={item.open_question ?? null} history={item.questions ?? []} />}
        {isWriter && item.routine_stops?.map((st) => <RoutineStopped key={st.routine_id} itemId={item.id} stop={st} />)}
      </header>

      {accepted && <AcceptedAnswer entry={accepted} />}

      {!shopping ? (
        entries.length > 0 ? (
          <div className="item-entries item-text-entries item-indent grid gap-3 sm:pl-11">
            {textEntries.map((e) => (
              <TextEntryCard
                key={e.id}
                entry={e}
                fi={fi}
                comments={commentsFor("entry", e.id)}
                canWrite={isWriter}
                canEdit={canManage(e.author, user, role)}
                canDeleteComment={canDeleteComment}
                accepted={e.id === acceptedId}
                itemDone={done}
              />
            ))}
          </div>
        ) : (
          !held && <EmptyEntries status={status} fi={fi} quiet={quietEmpty} />
        )
      ) : entries.length > 0 && layout === "sheet" ? (
        <div className="item-indent">
          {sortControl("is-above")}
          {/* Each product row opens in place: its details, price history and comments under it. */}
          <EntrySheet
            sort={sheetSort}
            entries={entries}
            lowestId={lowest}
            boughtId={p?.entry_id ?? null}
            itemText={item.text}
            renderDetail={(e) => (
              <div className="max-w-xl">
                <EntryCard
                  anchor={false}
                  entry={e}
                  prices={prices[e.id] ?? null}
                  comments={commentsFor("entry", e.id)}
                  isLowest={e.id === lowest}
                  lowestText={lowestText}
                  boughtThis={p?.entry_id === e.id}
                  itemPurchased={!!p}
                  canWrite={isWriter}
                  canEdit={canManage(e.author, user, role)}
                  canDeleteComment={canDeleteComment}
                />
              </div>
            )}
          />
        </div>
      ) : entries.length > 0 ? (
        <div className={`item-entries item-indent grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 sm:pl-11`}>
          {entries.map((e, i) => (
            <EntryCard
              key={e.id}
              entry={e}
              prices={prices[e.id] ?? null}
              comments={commentsFor("entry", e.id)}
              isLowest={e.id === lowest}
                  lowestText={lowestText}
              boughtThis={p?.entry_id === e.id}
              itemPurchased={!!p}
              canWrite={isWriter}
              canEdit={canManage(e.author, user, role)}
              canDeleteComment={canDeleteComment}
              eagerImage={eager && i < 3}
            />
          ))}
        </div>
      ) : (
        !held && <EmptyEntries status={status} fi={fi} quiet={quietEmpty} />
      )}

      {/* An empty want stays one row: adding the first product is in its ⋯ menu. Once it has some, the add link shows. */}
      {isWriter && entries.length > 0 && (
        <div className="item-indent sm:pl-11">
          <AddEntry itemId={item.id} fi={fi} currency={currencyHint} />
        </div>
      )}

      {(itemComments.length > 0 || guides.length > 0 || (isWriter && (item.heldGuides?.length ?? 0) > 0)) && (
        <div className="item-comments item-indent grid gap-3 sm:pl-11">
          <H3 className="eyebrow">{itemComments.length ? "Comments" : "Notes"}</H3>
          {/* Guides read as part of the conversation under the want: notes beside the comments, never products. */}
          <GuideNotes held={item.heldGuides ?? []} kept={guides} canWrite={isWriter} />
          <CommentList comments={itemComments} canDelete={canDeleteComment} />
          {isWriter && <CommentForm targetType="item" targetId={item.id} label={`Comment on this ${fi.item}`} />}
        </div>
      )}
    </section>
  );
}

/** A want with nothing on it yet: a short note for open wants only; the status chip speaks for the rest. */
function EmptyEntries({ status, fi, quiet }: { status: string; fi: FormatInfo; quiet: boolean }) {
  if (quiet || status !== "open") return null;
  return <p className="entries-empty item-indent text-[0.88rem] text-ink-3 sm:pl-11">{fi.waiting}</p>;
}

/**
 * SPEC 16.2: an outsider's item (a feedback task). Held: one quiet Accept, in the row, no menu to open. Accepted: the
 * words are still marked as someone else's.
 */
function OutsiderLine({ held, itemId, itemText, headingId }: { held: boolean; itemId: string; itemText: string; headingId: string }) {
  // Accepted while the page is open: "Accepted" takes the button's place, so the rows below don't move.
  const [wasHeld] = useState(held);
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${wasHeld ? "min-h-11" : ""}`}>
      <span className="chip chip-warn">From outside</span>
      {held ? (
        <>
          <span>· not public yet</span>
          <AcceptItem itemId={itemId} itemText={itemText} headingId={headingId} />
        </>
      ) : (
        wasHeld && <span role="status">· Accepted</span>
      )}
    </span>
  );
}

/** One quiet action, in the row (no menu to open): the held item becomes an ordinary one. */
function AcceptItem({ itemId, itemText, headingId }: { itemId: string; itemText: string; headingId: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";
  // The button goes away once accepted: keep keyboard focus on this item rather than dropping it to the page.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) document.getElementById(headingId)?.focus();
  }, [fetcher.state, fetcher.data, headingId]);
  return (
    <fetcher.Form method="post" className="inline-flex items-center gap-2">
      <input type="hidden" name="intent" value="accept-item" />
      <input type="hidden" name="item_id" value={itemId} />
      <button className="btn btn-sm" disabled={busy} aria-label={`Accept “${itemText.slice(0, 60)}”`}>
        {busy ? "Accepting…" : "Accept"}
      </button>
      {fetcher.data?.error && <span className="form-error text-[0.8rem]">{fetcher.data.error}</span>}
    </fetcher.Form>
  );
}

/**
 * Someone else's words: plain text, never links (SPEC 8 and 16.2). A feedback task's details begin with the full report
 * its title was cut from, so the folded row shows only what the title doesn't: the expectation and where it came from.
 * "Show all" opens the whole text.
 */
function OutsiderDetails({ details, title }: { details: string | undefined; title: string }) {
  const [open, setOpen] = useState(false);
  if (!details) return null;
  const flat = (t: string) => t.replace(/\s+/g, " ").trim();
  const paras = details.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const said = flat(title.replace(/^(Bug|Expected|Request):\s*/, "")).replace(/…$/, "");
  const repeats = paras.length > 0 && said.length > 0 && flat(paras[0]!).startsWith(said);
  const rest = repeats ? paras.slice(1) : paras;
  const folded = rest.join(" · ");
  if (open) {
    return (
      <div className="item-indent grid max-w-3xl justify-items-start gap-1 sm:pl-11">
        <p className="item-details whitespace-pre-line break-words text-[0.95rem] text-ink-2">{details}</p>
        <button type="button" className="textlink-btn min-h-11 text-[0.85rem] text-ink-3 sm:min-h-0" aria-expanded onClick={() => setOpen(false)}>
          Show less
        </button>
      </div>
    );
  }
  // Folded: what the title doesn't say, and "Show all" on the same line (the title is clamped, so it is always offered).
  return (
    <div className="item-indent flex max-w-3xl items-end gap-3 sm:pl-11">
      <p className="item-details line-clamp-2 min-w-0 flex-1 break-words text-[0.9rem] text-ink-3">{folded}</p>
      <button type="button" className="textlink-btn min-h-11 flex-none text-[0.85rem] text-ink-3 sm:min-h-0" aria-expanded={false} onClick={() => setOpen(true)}>
        Show all
      </button>
    </div>
  );
}

/** Share with an agent, opened on the page (from a list card's menu on /app): the same step as in the Share menu. */
function ShareAgentPanel({ listId, listUrl, existing, onList }: { listId: string; listUrl: string; existing: string[]; onList?: string[] }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <section aria-labelledby="share-agent-h" className="card grid max-w-xl gap-2 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="share-agent-h" ref={heading} tabIndex={-1} className="text-[1.15rem] font-semibold outline-none">
          Share with an agent
        </h2>
        <Link to={`/l/${listId}`} replace preventScrollReset className="btn btn-ghost btn-xs">
          Done
        </Link>
      </div>
      <ShareWithAgent listId={listId} listUrl={listUrl} existing={existing} onList={onList} />
      <noscript>
        <p className="text-[0.9rem] text-ink-2">
          This step needs JavaScript. You can make a key for an agent in <a href={`/app/lists/${listId}/settings#keys-h`} className="link">Settings › Agents</a>.
        </p>
      </noscript>
    </section>
  );
}

function UndoPurchase({ itemId }: { itemId: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" className="undo-purchase ml-auto">
      <input type="hidden" name="intent" value="unpurchase" />
      <input type="hidden" name="item_id" value={itemId} />
      <button className="btn-quiet" disabled={fetcher.state !== "idle"}>
        Undo
      </button>
    </fetcher.Form>
  );
}

function AddItem({
  listId,
  empty,
  fi,
  isPrivate,
  currency: hint,
}: {
  listId: string;
  empty: boolean;
  fi: FormatInfo;
  isPrivate: boolean;
  currency?: string;
}) {
  const currency = useCurrency(hint);
  const fetcher = useFetcher<{ ok?: boolean; error?: string; itemId?: string }>();
  const busy = fetcher.state !== "idle";
  const added = fetcher.state === "idle" && fetcher.data?.ok && fetcher.data.itemId ? fetcher.data.itemId : null;
  const [promptFor, setPromptFor] = useState<string | null>(null);
  // Details already written on the add form: no need to ask again.
  const hadDetails = useRef(false);
  useEffect(() => {
    if (added && !hadDetails.current) setPromptFor(added);
  }, [added]);
  return (
    <section id="add-item" aria-labelledby="add-item-h" className={`add-item scroll-mt-24 ${empty ? "card p-5" : ""}`}>
      <h2 id="add-item-h" className={empty ? "text-xl font-semibold" : "sr-only"}>
        {empty ? fi.addItemFirst : fi.addItemTitle}
      </h2>
      {empty && (
        <p className="mt-1 text-[0.9rem] text-ink-3">
          {fi.addItemHint}
          {!isPrivate ? " The list becomes public once it has an item." : ""}
        </p>
      )}
      {promptFor && <DetailsPrompt itemId={promptFor} fi={fi} onDone={() => setPromptFor(null)} />}
      <fetcher.Form
        method="post"
        className={`${empty ? "mt-4" : ""} grid gap-2`}
        onSubmit={(e) => {
          const form = e.currentTarget;
          const d = form.elements.namedItem("details") as HTMLTextAreaElement | null;
          hadDetails.current = !!d?.value.trim();
          requestAnimationFrame(() => form.reset());
        }}
      >
        <input type="hidden" name="intent" value="add-item" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="new-item" className="sr-only">
            {fi.addItemTitle}
          </label>
          <input id="new-item" name="text" required maxLength={500} placeholder={moneyPlaceholder(fi.itemPlaceholder, currency)} className="input flex-1" />
          {/* Blue even beside the agent card: the quiet style was near-black on black in dark mode (review H5). */}
          <button className="btn btn-want" disabled={busy}>
            {busy ? "Adding…" : `Add ${fi.item}`}
          </button>
        </div>
        <details className="group">
          <summary className="textlink-btn text-[0.85rem]">
            Add details or a due date<span aria-hidden="true" className="ml-1.5 inline-block w-3 text-center transition group-open:rotate-90">›</span>
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_12rem]">
            <label className="field" htmlFor="new-item-details">
              <span className="label">Details</span>
              <textarea id="new-item-details" name="details" maxLength={2000} placeholder={fi.detailsPlaceholder} className="textarea min-h-20" />
            </label>
            <label className="field content-start" htmlFor="new-item-due">
              <span className="label">Due date</span>
              <input id="new-item-due" name="due_at" type="date" className="input" />
            </label>
          </div>
        </details>
      </fetcher.Form>
      {fetcher.data?.error && <p className="form-error mt-2" role="alert">{fetcher.data.error}</p>}
    </section>
  );
}

function AddEntry({ itemId, fi, currency }: { itemId: string; fi: FormatInfo; currency?: string }) {
  return (
    <details className="add-entry w-full">
      <summary className="add-link">
        <Icon name="plus" />
        {fi.addEntryLabel}
      </summary>
      <div className="card mt-2 p-4">{fi.format === "shopping" ? <EntryForm itemId={itemId} currency={currency} /> : <TextEntryForm itemId={itemId} fi={fi} />}</div>
    </details>
  );
}

/**
 * Outside suggestions. Untrusted third-party text: rendered as plain text only. No links,
 * no images loaded from their URLs. This section only renders for writers.
 */
function Suggestions({ suggestions, routines, me, shopping, guides = 0 }: { suggestions: Array<{ entry: Entry; item: Pick<Item, "id" | "text"> }>; routines: RoutineSummary[] | null; me: string | null; shopping: boolean; guides?: number }) {
  // SPEC 20.3: a routine's suggestions are not from outside agents; with any of them, the heading says only how many.
  const anyRoutine = suggestions.some((s) => routineOf(s.entry));
  const anyStranger = suggestions.some((s) => !routineOf(s.entry));
  return (
    <section aria-labelledby="sugg-h" className="untrusted grid gap-4 p-4 sm:p-6">
      <div>
        <h2 id="sugg-h" className="text-[1.15rem] font-semibold">
          {plural(suggestions.length, "suggestion")}
          {guides > 0 ? ` and ${plural(guides, "guide")} to look at` : anyRoutine ? "" : " from outside agents"}
        </h2>
        <p className="mt-1 max-w-2xl text-[0.88rem] text-ink-2">
          {anyStranger ? "Only writers see these. Links from outside agents stay as text until you promote one." : "Only writers see these."}
        </p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {suggestions.map(({ entry: e, item }) =>
          // The person's own search routine: shown as a thing (picture, title that opens, where from). A stranger's
          // suggestion stays text only, its link not clickable.
          routineOf(e) ? (
            <RoutineSuggestion key={e.id} entry={e} itemText={item.text} routines={routines} me={me} shopping={shopping} />
          ) : (
            <SuggestionCard key={e.id} entry={e} itemText={item.text} routines={routines} me={me} />
          ),
        )}
      </ul>
    </section>
  );
}

function SuggestionCard({ entry: e, itemText, routines, me }: { entry: Entry; itemText: string; routines: RoutineSummary[] | null; me: string | null }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const pendingIntent = fetcher.formData?.get("intent");
  const doneIntent = fetcher.state === "idle" && fetcher.data?.ok ? "done" : null;
  if (doneIntent) return null;
  const p = e.current_price;
  return (
    <li className="card grid gap-2 p-4" aria-label={`Suggestion: ${e.title}`}>
      <p className="text-[0.78rem] text-ink-3">
        For <span className="font-semibold text-ink-2">“{itemText}”</span>
      </p>
      <p className="whitespace-pre-line break-words font-semibold">{e.title}</p>
      {p && (
        <p className="price text-[1.4rem]">
          {formatMoney(p.price, p.currency)}
          {p.original_price && <span className="price-was ml-2 font-sans text-[0.9rem] font-normal">{formatMoney(p.original_price, p.currency)}</span>}
        </p>
      )}
      {/* A routine's own "not checked" line is in its byline below: not said twice. */}
      {e.description && !(routineOf(e) && e.description === ROUTINE_NOTE) && <p className="whitespace-pre-line break-words text-[0.88rem] text-ink-2">{e.description}</p>}
      <dl className="grid gap-1 text-[0.8rem]">
        {e.retailer && (
          <div className="flex gap-2">
            <dt className="text-ink-3">Retailer</dt>
            <dd className="break-words">{e.retailer}</dd>
          </div>
        )}
        <div className="grid gap-0.5">
          <dt className="text-ink-3">Link (not opened)</dt>
          <dd className="plain-url">{e.product_url}</dd>
        </div>
        {e.image_url && (
          <div className="grid gap-0.5">
            <dt className="text-ink-3">Image link (not loaded)</dt>
            <dd className="plain-url">{e.image_url}</dd>
          </div>
        )}
        {e.coupon_code && (
          <div className="flex gap-2">
            <dt className="text-ink-3">Coupon</dt>
            <dd className="font-mono">{e.coupon_code}</dd>
          </div>
        )}
      </dl>
      {routineOf(e) ? (
        <RoutineByline entry={e} routines={routines} me={me} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-3">
          <ActorTag actor={e.author} /> <Time ts={e.created_at} />
        </div>
      )}
      <fetcher.Form method="post" className="mt-1 flex gap-2">
        <input type="hidden" name="entry_id" value={e.id} />
        <button name="intent" value="promote" className="btn btn-ghost btn-sm" disabled={fetcher.state !== "idle"}>
          {pendingIntent === "promote" ? "Promoting…" : "Promote to list"}
        </button>
        <button name="intent" value="reject" className="btn-quiet" disabled={fetcher.state !== "idle"}>
          {pendingIntent === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </fetcher.Form>
      {fetcher.data?.error && <p className="form-error" role="alert">{fetcher.data.error}</p>}
    </li>
  );
}

/** "Show more comments": loads further pages of the list's comments on demand. */
function useMoreComments(listId: string, initialCursor: string | null) {
  const fetcher = useFetcher<Page<Comment>>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);

  // A fresh loader result (navigation or live revalidation) restarts from its cursor.
  useEffect(() => {
    setComments([]);
    setCursor(initialCursor);
  }, [listId, initialCursor]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const page = fetcher.data;
      setComments((prev) => [...prev, ...page.data]);
      setCursor(page.next_cursor);
    }
  }, [fetcher.state, fetcher.data]);

  const loadMore = useCallback(() => {
    if (cursor) fetcher.load(`/l/${encodeURIComponent(listId)}/comments?cursor=${encodeURIComponent(cursor)}`);
  }, [cursor, listId, fetcher]);

  return { comments, hasMore: Boolean(cursor), loading: fetcher.state !== "idle", loadMore };
}

/**
 * Deep links from agents and msgblast (#itm_…, #ent_…, #cmt_…): open any collapsed section
 * holding the target, scroll it below the sticky header and flash it briefly.
 */
function useDeepLinks() {
  const location = useLocation();
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!/^(itm|ent|cmt)_[A-Za-z0-9_-]+$/.test(id)) return;
    const el = document.getElementById(id);
    if (!el) return;
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p instanceof HTMLDetailsElement && !p.open) p.open = true;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      el.classList.remove("deep-target");
      void el.offsetWidth; // restart the animation on repeat visits
      el.classList.add("deep-target");
    });
    const t = setTimeout(() => el.classList.remove("deep-target"), 2400);
    return () => clearTimeout(t);
  }, [location.hash, location.key]);
}

/**
 * Checklist style: a big box per item. Writers tick it to mark the item bought (shopping) or
 * done (tasks, research), and untick to undo.
 */
function yearAhead(iso: string) {
  const d = new Date(iso);
  return String(d.getUTCFullYear() + (d.getUTCMonth() >= 9 ? 1 : 0));
}

/**
 * After adding an item: one light, skippable prompt for what an agent would need (budget or size,
 * where and by when, context), stored in the item's details.
 */
export function DetailsPrompt({ itemId, fi, onDone }: { itemId: string; fi: FormatInfo; onDone: () => void }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const uid = useId();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) onDone();
  }, [fetcher.state, fetcher.data, onDone]);
  return (
    <fetcher.Form method="post" className="mb-3 grid gap-2 rounded-md border border-line bg-sunk p-3">
      <input type="hidden" name="intent" value="add-details" />
      <input type="hidden" name="item_id" value={itemId} />
      <label htmlFor={`${uid}-d`} className="label">
        Added. Anything an agent needs?
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea id={`${uid}-d`} name="details" maxLength={2000} rows={1} placeholder={fi.detailsPrompt} className="textarea textarea-line flex-1" autoFocus />
        <button className="btn btn-ghost" disabled={fetcher.state !== "idle"}>
          Save
        </button>
        <button type="button" className="btn-quiet" onClick={onDone}>
          Skip
        </button>
      </div>
      {fetcher.data?.error && <p className="form-error">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}

/**
 * The pulse of the lonely "Share list" button follows Reduce Motion: with it on, the ring is held still. Set this to true
 * to let the pulse run regardless (the one line to change; app.css .share-invite.pulse-always).
 */
const SHARE_PULSE_ALWAYS = false;

/**
 * Wraps the Share menu while the list has nobody else on it. Opening the menu once stops the pulse for this list, and
 * that is remembered on this browser (localStorage, when it's there).
 */
function ShareInvite({ listId, on, children }: { listId: string; on: boolean; children: React.ReactNode }) {
  const box = useRef<HTMLSpanElement>(null);
  const key = `share-seen:${listId}`;
  useEffect(() => {
    const el = box.current;
    if (!on || !el) return;
    const mark = () => el.querySelector(".share-invite")?.classList.add("is-seen");
    try {
      if (localStorage.getItem(key)) mark();
    } catch {
      // storage blocked: the pulse runs its few cycles and stops on its own
    }
    const pop = el.querySelector("[popover]");
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState !== "open") return;
      mark();
      try {
        localStorage.setItem(key, "1");
      } catch {
        // ignore
      }
    };
    pop?.addEventListener("toggle", onToggle);
    return () => pop?.removeEventListener("toggle", onToggle);
  }, [on, key]);
  return (
    <span ref={box} className="contents">
      {children}
    </span>
  );
}

type JustChecked = { itemId: string; text: string; shopping: boolean };
/** Set by a box the moment it's checked, so the list can offer Undo even as the row moves to the Done group. */
const CheckedContext = createContext<((c: JustChecked | null) => void) | null>(null);
const DONE_SHOWN = 3;

/** "Bought “Wool socks”. Undo": right after a check-off, at the bottom of the screen, until undone or after a while. */
function UndoCheck({ checked, fi, onDone }: { checked: JustChecked; fi: FormatInfo; onDone: () => void }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  useEffect(() => {
    const t = setTimeout(onDone, 12_000);
    return () => clearTimeout(t);
  }, [onDone]);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) onDone();
  }, [fetcher.state, fetcher.data, onDone]);
  const word = fi.done[0].toUpperCase() + fi.done.slice(1);
  return (
    <div role="status" className="undo-check">
      <span className="min-w-0 flex-1 truncate">
        {word} “{checked.text}”.
      </span>
      <fetcher.Form method="post">
        {checked.shopping ? (
          <input type="hidden" name="intent" value="unpurchase" />
        ) : (
          <>
            <input type="hidden" name="intent" value="set-status" />
            <input type="hidden" name="status" value="open" />
          </>
        )}
        <input type="hidden" name="item_id" value={checked.itemId} />
        <button className="btn btn-sm" disabled={fetcher.state !== "idle"}>
          Undo<span className="sr-only"> {word.toLowerCase()} for {checked.text}</span>
        </button>
      </fetcher.Form>
      {fetcher.data?.error && <span className="form-error w-full">{fetcher.data.error}</span>}
    </div>
  );
}

export function ChecklistBox({
  itemId,
  text,
  bought,
  canWrite,
  shopping,
  doneWord,
  waiting = false,
}: {
  itemId: string;
  text: string;
  bought: boolean;
  canWrite: boolean;
  shopping: boolean;
  doneWord: string;
  /** The item has an open question: the server will refuse to finish it until it's answered. */
  waiting?: boolean;
}) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const setJustChecked = useContext(CheckedContext);
  const busy = fetcher.state !== "idle";
  // No optimistic tick: the box shows what the server says. A refusal (an open question, a claim)
  // comes back as an error, shown next to the box with a way to the question.
  const checked = bought;
  const error = fetcher.state === "idle" ? fetcher.data?.error : undefined;
  // Refused (an open question, a claim): no Undo to offer.
  useEffect(() => {
    if (error) setJustChecked?.(null);
  }, [error, setJustChecked]);
  if (!canWrite) {
    // Visitors get a status mark, not something that looks tickable: a tick when done, a small dot while open.
    return checked ? (
      <span className="check-toggle is-checked" aria-hidden="true">
        ✓
      </span>
    ) : (
      <span className="check-toggle status-open" aria-hidden="true" />
    );
  }
  return (
    <fetcher.Form method="post" className="relative" onSubmit={() => setJustChecked?.(checked ? null : { itemId, text, shopping })}>
      {shopping ? (
        <input type="hidden" name="intent" value={checked ? "unpurchase" : "purchase"} />
      ) : (
        <>
          <input type="hidden" name="intent" value="set-status" />
          <input type="hidden" name="status" value={checked ? "open" : "done"} />
        </>
      )}
      <input type="hidden" name="item_id" value={itemId} />
      <button
        type="submit"
        role="checkbox"
        aria-checked={checked}
        aria-busy={busy || undefined}
        aria-label={checked ? `Mark “${text}” not ${doneWord}` : `Mark “${text}” ${doneWord}`}
        className={`check-toggle ${busy ? "opacity-60" : ""}`}
        disabled={busy}
      >
        {checked ? "✓" : ""}
      </button>
      {error && (
        <p role="alert" className="check-refusal">
          {error}{" "}
          {waiting && (
            <a href={`#${itemId}`} className="link font-medium">
              Answer the question
            </a>
          )}
        </p>
      )}
    </fetcher.Form>
  );
}

/** After keeping a list from a claim link: who made it, and where to share it. Shown once; "Got it" hides it now. */
function KeptNote({ listId, kept, isPrivate }: { listId: string; kept: { kind: "unclaimed" | "handover"; by: string }; isPrivate: boolean }) {
  const [shown, setShown] = useState(true);
  if (!shown) return null;
  return (
    <div role="status" className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-[0.95rem]">
      <p className="min-w-0 flex-1">
        {kept.kind === "unclaimed" ? `This list was started by ${kept.by}.` : `${kept.by} made this list for you. It's yours now.`}
        {isPrivate ? " It is private." : ""} Share it or connect more agents in{" "}
        <Link to={`/app/lists/${listId}/settings`} className="link">
          Settings
        </Link>
        .
      </p>
      <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShown(false)}>
        Got it
      </button>
    </div>
  );
}

/** Inside an opened done row: the row's summary already says the title, so the item says its status once (review F9, H6). */
const InDoneRow = createContext(false);

/** A finished want as one line ("Bought · $649.99 at Harbor Electronics · you, Tuesday"); the whole item opens under it. */
function DoneRow({ item, fi, children, tick = false }: { item: ItemWithEntries; fi: FormatInfo; children: React.ReactNode; tick?: boolean }) {
  const who = useActorLabel();
  const now = useNow();
  const p = item.purchase;
  const c = item.completion;
  const at = p?.purchased_at ?? c?.completed_at ?? null;
  const by = p?.purchased_by ?? c?.completed_by ?? null;
  // The weekday in the visitor's time zone once hydrated; in UTC before, so the server's render matches (a mismatch
  // regenerates the whole page and loses an early tap on a menu).
  const hydrated = useHydrated();
  const when = at
    ? now - Date.parse(at) < 86_400_000
      ? timeAgo(at, now)
      : now - Date.parse(at) < 6 * 86_400_000
      ? new Date(at).toLocaleDateString("en-US", { weekday: "long", ...(hydrated ? {} : { timeZone: "UTC" }) })
      : formatDate(at)
    : null;
  const word = fi.done[0].toUpperCase() + fi.done.slice(1);
  const detail = [
    word,
    p?.price ? `${formatMoney(p.price, p.currency ?? "USD", { cents: true })}${p.retailer ? ` at ${p.retailer}` : ""}` : p?.retailer ? `at ${p.retailer}` : null,
    by || when ? [by ? who(by) : null, when].filter(Boolean).join(", ") : null,
  ].filter(Boolean);
  const row = (
    <details className={`done-row group ${tick ? "min-w-0 flex-1" : ""}`}>
      <summary className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-2">
        {!tick && (
          <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-deal text-[0.8rem] font-bold text-card">
            ✓
          </span>
        )}
        <span className="min-w-0 flex-1">
          {/* The whole title, wrapping (H6: "still cut"). */}
          <span className="block break-words text-ink-2 line-through decoration-ink-3/60">{item.text}</span>
          <span className="done-detail block text-[0.85rem] text-ink-3">{detail.join(" · ")}</span>
        </span>
        <span aria-hidden="true" className="mt-1 text-ink-3 transition group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-2">
        <InDoneRow.Provider value={true}>{children}</InDoneRow.Provider>
      </div>
    </details>
  );
  if (!tick) return row;
  // A checklist's tick unticks (owner via review, 26 Nov 2026). It sits beside the summary, as on the open rows, never
  // inside it (a control inside a control).
  return (
    <div className="done-row-wrap flex items-start gap-3">
      <span className="done-row-tick mt-2 ml-3">
        <ChecklistBox itemId={item.id} text={item.text} bought canWrite shopping={fi.format === "shopping"} doneWord={fi.done} />
      </span>
      {row}
    </div>
  );
}

/** "3 people · 2 agents": opens who they are. Counts for writers only (ListSummary.access). */
function WhoHasAccess({ counts, who, listId }: { counts: NonNullable<ListSummary["access"]>; who: ListAccess | null; listId: string }) {
  const { user } = useRootData();
  // "1 person" alone is just the viewer: left out, as are zero counts.
  const label = [
    ...(counts.people > 1 ? [plural(counts.people, "person", "people")] : []),
    ...(counts.agents ? [plural(counts.agents, "agent")] : []),
    ...(counts.pending_invites ? [`${counts.pending_invites} invited`] : []),
  ].join(" · ");
  const me = (handle: string) => (user?.handle === handle ? "you" : handle);
  return (
    <Menu label={`Who can write this list: ${label}`} triggerClass="textlink-btn text-ink-2" trigger={<>{label}</>} wide>
      <div className="grid gap-3 p-3 text-[0.88rem]">
        {who ? (
          <>
            <AccessGroup title="People" rows={who.people.map((p) => `${me(p.handle)}${p.role === "owner" ? " (owner)" : ""}`)} />
            <AccessGroup title="Agents" rows={who.agents.map((a) => `${a.name} · ${user?.handle === a.owner_handle ? "your agent" : `${a.owner_handle}'s agent`}`)} />
            <AccessGroup title="Invited" rows={who.pending_invites.map((i) => i.email)} />
          </>
        ) : null}
        <Link to={`/app/lists/${listId}/settings#members-h`} className="link w-fit">
          Sharing settings
        </Link>
      </div>
    </Menu>
  );
}

function AccessGroup({ title, rows }: { title: string; rows: string[] }) {
  if (!rows.length) return null;
  return (
    <div className="grid gap-1">
      <p className="label">{title}</p>
      <ul className="grid gap-0.5 text-ink-2">
        {rows.map((r, i) => (
          <li key={i} className="break-words">
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Lock marker for private lists: a soft pill, or `bare` (icon and word) inside a meta line. */
export function PrivateBadge({ bare = false }: { bare?: boolean }) {
  if (bare)
    return (
      <span className="inline-flex items-center gap-1 text-ink-2">
        <LockIcon />
        Private
      </span>
    );
  return (
    <span className="chip font-sans text-[0.72rem] font-medium normal-case tracking-normal">
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      Private
    </span>
  );
}

/* ---------------------------------------------------------------- Routines (SPEC 20.3) */

/** What a search routine says on every shopping suggestion (20.6). */
const ROUTINE_NOTE = "From a search result, not checked on the store's page.";

/** The routine that posted a suggestion, when one did. */
function routineOf(e: Entry) {
  return e.author.kind === "outside" ? (e.author.routine ?? null) : null;
}

/**
 * One quiet line under the header while any routine on the list is active, for writers: its name, its schedule and
 * whose key, linking to the list's routines. Its name may be an agent's: shown in quotes, as a name.
 */
function RoutineLine({ list, me }: { list: ListSummary; me: string | null }) {
  const active = (list.routines ?? []).filter((r) => !r.paused && !r.blocked_reason);
  if (!active.length) return null;
  return (
    <ul className="mt-2 grid gap-0.5 text-[0.88rem] text-ink-3">
      {active.map((r) => (
        <li key={r.id}>
          <Link to={`/app/lists/${list.id}/settings#routines`} className="hover:text-ink hover:underline">
            {agentWroteName(r) ? `“${r.name}”` : r.name} · {r.schedule_text}
            {r.key_holder && <> · {r.key_holder.handle === me ? "your" : `@${r.key_holder.handle}'s`} Exa key</>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "Suggested by “Search the web for these wants” (@sam's routine) · from a search result, not checked on the store's page · Pause this routine". */
function RoutineByline({ entry: e, routines, me }: { entry: Entry; routines: RoutineSummary[] | null; me: string | null }) {
  const rt = routineOf(e)!;
  const name = e.author.kind === "outside" ? (e.author.name ?? "a routine") : "a routine";
  const summary = routines?.find((r) => r.id === rt.id);
  const f = useFetcher<{ ok?: boolean; error?: string }>();
  const whose = rt.key_holder === me ? "your routine" : `@${rt.key_holder}'s routine`;
  return (
    <div className="grid gap-1 text-[0.8rem] text-ink-3">
      <p>
        Suggested by “{name}” ({whose}) · from a search result, not checked on the store's page
      </p>
      {summary && !summary.paused && !summary.blocked_reason && (
        <f.Form method="post">
          <input type="hidden" name="intent" value="routine-pause" />
          <input type="hidden" name="routine_id" value={rt.id} />
          <button className="textlink-btn text-[0.8rem]" disabled={f.state !== "idle"}>
            {f.state !== "idle" ? "Pausing…" : "Pause this routine"}
          </button>
        </f.Form>
      )}
      {f.data?.error && <p className="form-error" role="alert">{f.data.error}</p>}
    </div>
  );
}

/** SPEC 20.6: a routine stopped looking for this want after two rejected rounds; any writer can ask it to look again. */
function RoutineStopped({ itemId, stop }: { itemId: string; stop: NonNullable<Item["routine_stops"]>[number] }) {
  const f = useFetcher<{ ok?: boolean; error?: string; message?: string }>();
  if (f.state === "idle" && f.data?.ok) return <p className="text-[0.85rem] text-ink-3" role="status">{f.data.message}</p>;
  return (
    <f.Form method="post" className="flex flex-wrap items-center gap-x-2 text-[0.85rem] text-ink-3">
      <input type="hidden" name="intent" value="routine-item-resume" />
      <input type="hidden" name="routine_id" value={stop.routine_id} />
      <input type="hidden" name="item_id" value={itemId} />
      <span className="w-full">This routine stopped looking for this: you rejected its last two rounds.</span>
      <button className="textlink-btn text-[0.85rem]" disabled={f.state !== "idle"} title={stop.routine_name}>
        Search again<span className="sr-only"> ({stop.routine_name})</span>
      </button>
      {f.data?.error && <span className="form-error w-full" role="alert">{f.data.error}</span>}
    </f.Form>
  );
}

