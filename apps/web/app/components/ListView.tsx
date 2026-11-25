import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { SEASON, seasonActive } from "~/lib/season";
import { MetaLine, type MetaItem } from "~/components/MetaLine";
import { GiveToAgent } from "~/components/GiveToAgent";
import { HeadingBase, headingTag } from "~/components/preview";
import { Form, Link, useFetcher, useLocation } from "react-router";
import { ActorTag } from "~/components/ActorTag";
import { CommentForm, CommentList } from "~/components/Comments";
import { CopyButton } from "~/components/CopyButton";
import { EntryCard } from "~/components/EntryCard";
import { EntrySheet } from "~/components/EntrySheet";
import { ItemIndex } from "~/components/ItemIndex";
import { LiveUpdates } from "~/components/LiveUpdates";
import { PreviewContext, ReportLink, ReportMenuItem } from "~/components/Report";
import { closeMenuOf, Icon, Menu, MenuRemove, MenuSub } from "~/components/Actions";
import { Time } from "~/components/Time";
import { canManage, EditItem, EntryForm, MarkBoughtElsewhere, MarkBoughtForm } from "~/components/WriteTools";
import { formatDate, formatMoney, plural } from "~/lib/format";
import { formatInfo, visibilityOf, type FormatInfo } from "~/lib/formats";
import { AcceptedAnswer, DueChip, ItemDetails, ItemStatusBar, OwnerQuestion, TextEntryCard, TextEntryForm, useActorLabel } from "~/components/ItemWork";
import { BUILD_ID } from "~/lib/build";
import { itemCurrency, listCurrency } from "~/lib/currency";
import { lowestEntryId } from "~/lib/prices";
import { moneyPlaceholder, useCurrency, useNow } from "~/lib/hooks";
import { useRootData } from "~/lib/hooks";
import type { Comment, Entry, Item, ListAccess, ListSummary, Page, PriceObservation, UserSelf } from "~/lib/types";
import type { Layout } from "~/themes/types";
import type { ThemeView } from "~/themes/view";

export type ItemWithEntries = Item & { entries: Entry[] };


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
  const more = useMoreComments(list.id, commentsCursor);
  const comments = useMemo(() => {
    const seen = new Set(firstComments.map((c) => c.id));
    return [...firstComments, ...more.comments.filter((c) => !seen.has(c.id))];
  }, [firstComments, more.comments]);
  useDeepLinks();

  const commentsFor = (type: "item" | "entry", id: string) => comments.filter((c) => c.target_type === type && c.target_id === id);
  const canDeleteComment = (c: Comment) => canManage(c.author, user, role);

  const fi = formatInfo(list);
  const shopping = fi.format === "shopping";
  const isPrivate = visibilityOf(list) === "private";
  const isDone = (i: ItemWithEntries) => (shopping ? !!i.purchase : i.status === "done");
  const wanted = items.filter((i) => !isDone(i)).slice(0, previewItems ?? Infinity);
  const bought = previewItems ? [] : items.filter(isDone);
  const listCurrencyHint = listCurrency(items);
  const productCount = items.reduce((n, i) => n + i.entries.length, 0);
  // Nothing posted on any want yet: one line for the list instead of one per want.
  const nothingYet = items.length > 0 && productCount === 0;
  // Has any agent done anything here (added, claimed, posted, noted)? Then "no agent has worked on this" would be false.
  const agentActive = items.some(
    (it) => it.created_by.kind === "agent" || it.claimed_by?.kind === "agent" || !!it.status_note || it.entries.some((e) => e.author.kind === "agent"),
  );
  const agentsCanWrite = list.access?.agents ?? 0;
  const idleAgent = isWriter && agentsCanWrite > 0 && !agentActive ? (props.accessList?.agents[0]?.name ?? null) : null;
  // The Sheet table compares prices, so it only applies to shopping lists.
  const layout: Layout = theme.layout === "sheet" && !shopping ? "list" : theme.layout;
  // Sections, Heat and (for tasks and research) Board show a compact index; each item opens in a panel.
  const indexKind = layout === "sections" || layout === "heat" || (layout === "board" && !shopping) ? layout : null;
  const className = `${theme.className.replace(/\blayout-\w+\b/, `layout-${layout}`)} format-${fi.format}${indexKind ? " has-index" : ""}${previewItems ? "" : " list-page"}`;

  // Row 2 of the header: counts, and for anyone but the owner, whose list it is and (if over a day) its age.
  const now = useNow();
  // Zero counts say nothing: they're left out.
  const meta: MetaItem[] = props.sample ? [<span className="chip">Sample</span>] : [
    ...(wanted.length ? [<>{wanted.length} open</>] : []),
    ...(bought.length ? [<>{bought.length} {fi.done}</>] : []),
    // On a phone the products count is the one that goes, rather than wrap alone onto a second line.
    ...(productCount ? [{ node: <>{productCount} {productCount === 1 ? fi.entry : fi.entries}</>, className: "max-sm:hidden" }] : []),
  ];
  if (role !== "owner" && !props.sample) meta.push(<>by {list.owner_handle}</>);
  if (!isWriter && !props.sample && now - Date.parse(list.updated_at) > 24 * 3600_000) meta.push(<>updated <Time ts={list.updated_at} /></>);

  return (
    <PreviewContext.Provider value={preview}>
    <div
      className={className}
      style={{ ...theme.style, ["--list-progress" as string]: items.length ? (items.length - items.filter((i) => !isDone(i)).length) / items.length : 0 } as React.CSSProperties}
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
                {isPrivate && isWriter ? (
                  // A private list's link opens for no one else: Share says so and offers the two ways to change that.
                  <Menu
                    label="Share"
                    triggerClass="btn-tool"
                    trigger={
                      <>
                        <Icon name="share" />
                        <span className="btn-tool-label">Share</span>
                      </>
                    }
                    wide
                  >
                    <div className="grid gap-2 p-3 text-[0.9rem]">
                      <p className="text-ink-2">Only you and people you invite can open this list.</p>
                      {role === "owner" && (
                        <Form method="post" action={`/app/lists/${list.id}/settings`} onSubmit={(e) => !confirm("Make this list public? Anyone with the link will be able to read it, and search engines can find it.") && e.preventDefault()}>
                          <input type="hidden" name="intent" value="visibility" />
                          <input type="hidden" name="visibility" value="public" />
                          <input type="hidden" name="return" value={`/l/${list.id}`} />
                          <button className="menu-item w-full">Make it public…</button>
                        </Form>
                      )}
                      <Link to={`/app/lists/${list.id}/settings#sharing-h`} className="menu-item">
                        Invite people
                      </Link>
                      <CopyButton text={listUrl} label="Copy link" doneText="Link copied" className="menu-item" />
                    </div>
                  </Menu>
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
        {props.handoff && !preview && <GiveToAgent listId={list.id} listUrl={listUrl} focus={props.handoff.focus} connectedName={props.handoff.connectedName} />}
        {nothingYet && !preview && !props.handoff && (!isWriter || (!agentActive && agentsCanWrite === 0) || idleAgent) && (
          <p className="list-nothing-yet text-[0.95rem] text-ink-2">
            {idleAgent ? (
              <>{idleAgent} is connected. Tell it what to do next.</>
            ) : isWriter ? (
              <>
                No agent has worked on this list yet.{" "}
                <Link to={`/connect?list=${list.id}`} className="link font-medium text-ink">
                  Connect one
                </Link>
              </>
            ) : (
              <>Nothing found yet.</>
            )}
          </p>
        )}
        {isWriter && <AddItem listId={list.id} empty={items.length === 0} fi={fi} isPrivate={isPrivate} currency={listCurrencyHint} quiet={!!props.handoff && !preview} />}
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
            {bought.map((item) => {
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
              return indexKind ? section : <DoneRow key={item.id} item={item} fi={fi}>{section}</DoneRow>;
            })}
          </section>
        )}
        </div>

        {/* Outside suggestions come after the person's own list, never before it. */}
        {isWriter && suggestions.length > 0 && <Suggestions suggestions={suggestions} />}

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
  const entries = sortByPrice(item.entries);
  const lowest = lowestEntryId(entries, now);
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
  const headingId = `${item.id}-h`;
  // SPEC 16.2: someone outside the list wrote it (a feedback task); held until a person who can write the list accepts it.
  const outsider = item.text_by === "outsider";
  const held = !!item.pending_review;

  return (
    <section id={item.id} aria-labelledby={headingId} data-status={status} className={`item-section grid scroll-mt-24 gap-3 ${done ? "is-bought" : ""}`}>
      {inPanel && (
        <a href="#list-index" className="ix-close btn-quiet justify-self-end">
          Close<span className="sr-only"> {item.text}</span>
        </a>
      )}
      <header className="grid gap-2">
        <div className="flex items-start gap-3">
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
          <H2 id={headingId} className={`item-title min-w-0 flex-1 text-[1.15rem] font-semibold sm:text-[1.35rem] ${done ? "text-ink-2" : ""}`}>
            {item.text}
          </H2>
          {/* The item's actions: at the right end of its title row. */}
          <span className="item-actions">
            {isWriter && held && <AcceptItem itemId={item.id} itemText={item.text} />}
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
              {canEditItem && (
                <MenuSub label={`Edit ${fi.item}`}>
                  <EditItem item={item} onDone={() => closeMenuOf(document.getElementById(headingId)?.closest("section")?.querySelector(":popover-open"))} label={`Edit ${fi.item}`} />
                </MenuSub>
              )}
              <ReportMenuItem type="item" id={item.id} />
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
            <OutsiderLine held={held && isWriter} />
          ) : !(item.created_by.kind === "user" && item.created_by.handle === ownerHandle) && !(item.text_by === "person" && item.created_by.kind === "agent") && (
            <span className="inline-flex items-center gap-1.5">
              Added by <ActorTag actor={item.created_by} compact /> <Time ts={item.created_at} />
            </span>
          )}
          <DueChip due={item.due_at} done={done} />
        </div>
        {p && (
          <div className="item-indent mt-2 flex flex-wrap items-center gap-3 rounded-md border border-deal/40 bg-deal-soft px-4 py-3 text-[0.9rem] sm:ml-11">
            <span className="text-ink">
              Bought{boughtPrice ? <> for <strong>{formatMoney(boughtPrice.price, boughtPrice.currency)}</strong></> : null}
              {boughtRetailer ? ` at ${boughtRetailer}` : ""} by{" "}
              {who(p.purchased_by)},{" "}
              <Time ts={p.purchased_at} />
            </span>
            {isWriter && <UndoPurchase itemId={item.id} />}
          </div>
        )}
        {outsider ? <OutsiderDetails details={item.details} /> : <ItemDetails details={item.details} />}
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
          />
        )}
        {/* SPEC 12.1: questions and answers are for writers only, on public lists too. */}
        {isWriter && <OwnerQuestion question={item.open_question ?? null} history={item.questions ?? []} />}
      </header>

      {accepted && <AcceptedAnswer entry={accepted} />}

      {!shopping ? (
        entries.length > 0 ? (
          <div className="item-entries item-text-entries item-indent grid gap-3 sm:pl-11">
            {item.entries.map((e) => (
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
        <div className="item-indent grid gap-3 sm:pl-11">
          {/* Each product row opens in place: its details, price history and comments under it. */}
          <EntrySheet
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

      {itemComments.length > 0 && (
        <div className="item-comments item-indent grid gap-3 sm:pl-11">
          <H3 className="eyebrow">Comments</H3>
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
function OutsiderLine({ held }: { held: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="chip chip-warn">From outside</span>
      {held && <span>Hidden from visitors until you accept it</span>}
    </span>
  );
}

/** One quiet action in the item's title row, no menu to open: the held item becomes an ordinary one. */
function AcceptItem({ itemId, itemText }: { itemId: string; itemText: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";
  return (
    <fetcher.Form method="post" className="inline-flex items-center gap-2">
      <input type="hidden" name="intent" value="accept-item" />
      <input type="hidden" name="item_id" value={itemId} />
      {fetcher.data?.error && <span className="form-error text-[0.8rem]">{fetcher.data.error}</span>}
      <button className="btn btn-sm" disabled={busy} aria-label={`Accept “${itemText.slice(0, 60)}”`}>
        {busy ? "Accepting…" : "Accept"}
      </button>
    </fetcher.Form>
  );
}

/** Someone else's words: plain text, never links (SPEC 8 and 16.2). Long ones fold to three lines. */
function OutsiderDetails({ details }: { details: string | undefined }) {
  const [open, setOpen] = useState(false);
  if (!details) return null;
  const long = details.length > 240 || details.split("\n").length > 4;
  return (
    <div className="item-indent grid max-w-3xl justify-items-start gap-1 sm:pl-11">
      {long && !open ? (
        // Folded: one paragraph, so blank lines don't spend the three lines.
        <p className="item-details line-clamp-3 break-words text-[0.95rem] text-ink-2">{details.replace(/\s*\n+\s*/g, " · ")}</p>
      ) : (
        <p className="item-details whitespace-pre-line break-words text-[0.95rem] text-ink-2">{details}</p>
      )}
      {long && (
        <button type="button" className="textlink-btn text-[0.85rem] text-ink-3" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Show less" : "Show all"}
        </button>
      )}
    </div>
  );
}

function UndoPurchase({ itemId }: { itemId: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" className="ml-auto">
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
  quiet = false,
}: {
  listId: string;
  empty: boolean;
  fi: FormatInfo;
  isPrivate: boolean;
  currency?: string;
  /** Another step is the primary action right now (giving the list to an agent): the add button is the quiet style. */
  quiet?: boolean;
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
          <button className={quiet ? "btn" : "btn btn-want"} disabled={busy}>
            {busy ? "Adding…" : `Add ${fi.item}`}
          </button>
        </div>
        <details className="group">
          <summary className="textlink-btn text-[0.85rem]">
            Add details or a due date <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
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
function Suggestions({ suggestions }: { suggestions: Array<{ entry: Entry; item: Pick<Item, "id" | "text"> }> }) {
  return (
    <section aria-labelledby="sugg-h" className="untrusted grid gap-4 p-4 sm:p-6">
      <div>
        <h2 id="sugg-h" className="text-[1.15rem] font-semibold">
          {plural(suggestions.length, "suggestion")} from outside agents
        </h2>
        <p className="mt-1 max-w-2xl text-[0.88rem] text-ink-2">Only writers see these. Links stay as text until you promote one.</p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {suggestions.map(({ entry: e, item }) => (
          <SuggestionCard key={e.id} entry={e} itemText={item.text} />
        ))}
      </ul>
    </section>
  );
}

function SuggestionCard({ entry: e, itemText }: { entry: Entry; itemText: string }) {
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
      {e.description && <p className="whitespace-pre-line break-words text-[0.88rem] text-ink-2">{e.description}</p>}
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
      <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-3">
        <ActorTag actor={e.author} /> <Time ts={e.created_at} />
      </div>
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
  const busy = fetcher.state !== "idle";
  // No optimistic tick: the box shows what the server says. A refusal (an open question, a claim)
  // comes back as an error, shown next to the box with a way to the question.
  const checked = bought;
  const error = fetcher.state === "idle" ? fetcher.data?.error : undefined;
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
    <fetcher.Form method="post" className="relative">
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
        aria-label={`${doneWord[0].toUpperCase()}${doneWord.slice(1)}: ${text}`}
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

/** A finished want as one line ("Bought · $649.99 at Harbor Electronics · you, Tuesday"); the whole item opens under it. */
function DoneRow({ item, fi, children }: { item: ItemWithEntries; fi: FormatInfo; children: React.ReactNode }) {
  const who = useActorLabel();
  const now = useNow();
  const p = item.purchase;
  const c = item.completion;
  const at = p?.purchased_at ?? c?.completed_at ?? null;
  const by = p?.purchased_by ?? c?.completed_by ?? null;
  const when = at ? (now - Date.parse(at) < 6 * 86_400_000 ? new Date(at).toLocaleDateString("en-US", { weekday: "long" }) : formatDate(at)) : null;
  const word = fi.done[0].toUpperCase() + fi.done.slice(1);
  const detail = [
    word,
    p?.price ? `${formatMoney(p.price, p.currency ?? "USD", { cents: true })}${p.retailer ? ` at ${p.retailer}` : ""}` : p?.retailer ? `at ${p.retailer}` : null,
    by || when ? [by ? who(by) : null, when].filter(Boolean).join(", ") : null,
  ].filter(Boolean);
  return (
    <details className="done-row group">
      <summary className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-2">
        <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-deal text-[0.8rem] font-bold text-card">
          ✓
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-ink-2 line-through decoration-ink-3/60">{item.text}</span>
          <span className="block text-[0.85rem] text-ink-3">{detail.join(" · ")}</span>
        </span>
        <span aria-hidden="true" className="mt-1 text-ink-3 transition group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
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
