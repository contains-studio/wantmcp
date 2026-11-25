import { useEffect, useId, useRef } from "react";
import { useFetcher } from "react-router";
import type { ActorRef, Entry, Item, UserSelf } from "~/lib/types";
import { Menu, useCloseOnDone } from "./Actions";
import { useCurrency } from "~/lib/hooks";

/** Result shape of the writer intents in `intents.server.ts`. */
export type IntentResult = { ok?: boolean; intent?: string; error?: string; code?: string; details?: unknown };

/**
 * Whether the signed-in person may edit or remove something on a list (SPEC section 3):
 * the owner can change anything; a member only what they or their own agents posted.
 */
export function canManage(author: ActorRef, user: UserSelf | null, role: "owner" | "member" | null): boolean {
  if (role === "owner") return true;
  if (!user || role !== "member") return false;
  if (author.kind === "user") return author.handle === user.handle;
  if (author.kind === "agent") return author.owner_handle === user.handle;
  return false;
}

function conflictEntryId(r: IntentResult | undefined): string | null {
  if (r?.code !== "conflict") return null;
  const d = r.details as { entry_id?: unknown } | undefined;
  return typeof d?.entry_id === "string" ? d.entry_id : null;
}

/** Opens the "New price" panel on an entry and scrolls to it. */
function openPricePanel(entryId: string) {
  const panel = (document.getElementById(`${entryId}-price`) ?? document.getElementById(`${entryId}-price-detail`)) as HTMLDetailsElement | null;
  for (let el: HTMLElement | null = panel; el; el = el.parentElement) {
    if (el instanceof HTMLDetailsElement) el.open = true;
  }
  // The price form lives in the entry's "⋯" menu: scroll to the entry, then open the menu.
  document.getElementById(entryId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  const pop = panel?.closest("[popover]") as (HTMLElement & { showPopover?: () => void }) | null;
  try {
    pop?.showPopover?.();
  } catch {
    // already open
  }
  setTimeout(() => panel?.querySelector<HTMLInputElement>("input[name=price]")?.focus(), 400);
}

function FormError({ result }: { result: IntentResult | undefined }) {
  if (!result?.error) return null;
  const dup = conflictEntryId(result);
  if (dup) {
    return (
      <div className="form-error sm:col-span-2" role="alert">
        This product is already listed on this item.{" "}
        <a
          href={`#${dup}`}
          className="font-semibold underline"
          onClick={(e) => {
            e.preventDefault();
            openPricePanel(dup);
          }}
        >
          Post a new price on it instead
        </a>
        .
      </div>
    );
  }
  return (
    <p className="form-error sm:col-span-2" role="alert">
      {result.error}
    </p>
  );
}

const dateOnly = (ts: string | null | undefined) => (ts ? ts.slice(0, 10) : "");

/**
 * Add a product to an item, or edit one. Prices are not edited here: a new price is a new
 * observation, posted with <PostPrice>.
 */
export function EntryForm({ itemId, entry, onDone, currency: hint }: { itemId: string; entry?: Entry; onDone?: () => void; currency?: string | null }) {
  const fetcher = useFetcher<IntentResult>();
  const uid = useId();
  const editing = Boolean(entry);
  const busy = fetcher.state !== "idle";
  const done = fetcher.state === "idle" && fetcher.data?.ok;
  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);
  const f = (name: string) => `${uid}-${name}`;
  const cur = entry?.current_price;
  const currency = useCurrency(cur?.currency ?? hint);

  if (done && !editing) {
    return (
      <p className="form-ok mt-3" role="status">
        Added. <button type="button" className="underline" onClick={() => fetcher.reset?.()}>Add another</button>
      </p>
    );
  }

  return (
    <fetcher.Form method="post" className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="intent" value={editing ? "edit-entry" : "add-entry"} />
      <input type="hidden" name="item_id" value={itemId} />
      {entry && <input type="hidden" name="entry_id" value={entry.id} />}
      <label className="field sm:col-span-2" htmlFor={f("title")}>
        <span className="label">Product name</span>
        <input id={f("title")} name="title" required maxLength={140} defaultValue={entry?.title} className="input" />
      </label>
      <label className="field sm:col-span-2" htmlFor={f("url")}>
        <span className="label">Product link</span>
        <input id={f("url")} name="product_url" type="url" required pattern="https://.+" placeholder="https://" defaultValue={entry?.product_url ?? ""} className="input" />
      </label>
      <label className="field" htmlFor={f("buy")}>
        <span className="label">Buy link <span className="font-normal text-ink-3">(optional)</span></span>
        <input id={f("buy")} name="buy_url" type="url" pattern="https://.+" placeholder="https://" defaultValue={entry?.buy_url ?? ""} className="input" />
      </label>
      <label className="field" htmlFor={f("img")}>
        <span className="label">Image link <span className="font-normal text-ink-3">(optional)</span></span>
        <input id={f("img")} name="image_url" type="url" pattern="https://.+" placeholder="https://" defaultValue={entry?.image_url ?? ""} className="input" />
      </label>
      <label className="field" htmlFor={f("retailer")}>
        <span className="label">Retailer</span>
        <input id={f("retailer")} name="retailer" maxLength={80} defaultValue={entry?.retailer} placeholder="Taken from the link if empty" className="input" />
      </label>
      <label className="field" htmlFor={f("coupon")}>
        <span className="label">Coupon code</span>
        <input id={f("coupon")} name="coupon_code" maxLength={40} defaultValue={entry?.coupon_code ?? ""} className="input font-mono" />
      </label>
      {!editing && (
        <fieldset className="grid grid-cols-[1fr_1fr_6rem] items-end gap-2 sm:col-span-2">
          <legend className="label mb-1">Price <span className="font-normal text-ink-3">(optional)</span></legend>
          <label className="field" htmlFor={f("price")}>
            <span className="label">Now</span>
            <input id={f("price")} name="price" inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder="429.00" className="input" />
          </label>
          <label className="field" htmlFor={f("was")}>
            <span className="label">Was</span>
            <input id={f("was")} name="original_price" inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder="549.00" className="input" />
          </label>
          <label className="field" htmlFor={f("cur")}>
            <span className="label">Currency</span>
            <input id={f("cur")} name="currency" defaultValue={currency} maxLength={3} pattern="[A-Za-z]{3}" className="input uppercase" />
          </label>
        </fieldset>
      )}
      <label className="field" htmlFor={f("start")}>
        <span className="label">Deal starts</span>
        <input id={f("start")} name="deal_starts_at" type="date" defaultValue={dateOnly(entry?.deal_starts_at)} className="input" />
      </label>
      <label className="field" htmlFor={f("end")}>
        <span className="label">Deal ends</span>
        <input id={f("end")} name="deal_ends_at" type="date" defaultValue={dateOnly(entry?.deal_ends_at)} className="input" />
      </label>
      <label className="field sm:col-span-2" htmlFor={f("desc")}>
        <span className="label">Notes</span>
        <textarea id={f("desc")} name="description" maxLength={500} defaultValue={entry?.description} className="textarea min-h-16" />
      </label>
      <FormError result={fetcher.data} />
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn btn-ghost btn-sm" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Add product"}
        </button>
      </div>
    </fetcher.Form>
  );
}

/** Append a new price observation to an entry. */
export function PostPrice({ entry }: { entry: Entry }) {
  const fetcher = useFetcher<IntentResult>();
  const ref = useRef<HTMLFormElement>(null);
  const uid = useId();
  const cur = entry.current_price;
  const currency = useCurrency(cur?.currency);
  const done = fetcher.state === "idle" && fetcher.data?.ok;
  useEffect(() => {
    if (done) ref.current?.reset();
  }, [done]);
  return (
    <fetcher.Form method="post" ref={ref} className="mt-2 grid gap-2">
      <input type="hidden" name="intent" value="post-price" />
      <input type="hidden" name="entry_id" value={entry.id} />
      <div className="grid grid-cols-[1fr_1fr_6rem] items-end gap-2">
        <label className="field" htmlFor={`${uid}-p`}>
          <span className="label">Now</span>
          <input id={`${uid}-p`} name="price" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder={cur?.price ?? "0.00"} className="input" />
        </label>
        <label className="field" htmlFor={`${uid}-o`}>
          <span className="label">Was</span>
          <input id={`${uid}-o`} name="original_price" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={cur?.original_price ?? ""} className="input" />
        </label>
        <label className="field" htmlFor={`${uid}-c`}>
          <span className="label">Currency</span>
          <input id={`${uid}-c`} name="currency" required defaultValue={currency} maxLength={3} pattern="[A-Za-z]{3}" className="input px-2 uppercase" />
        </label>
      </div>
      <label className="field" htmlFor={`${uid}-n`}>
        <span className="label">Note (optional)</span>
        <input id={`${uid}-n`} name="note" maxLength={200} placeholder="e.g. Black Friday price" className="input" />
      </label>
      <div className="flex items-center gap-2" aria-live="polite">
        <button className="btn btn-ghost btn-sm" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Posting…" : "Post price"}
        </button>
        {done && <span className="text-[0.82rem] text-deal">Posted.</span>}
      </div>
      {fetcher.data?.error && (
        <p className="form-error" role="alert">
          {fetcher.data.error}
        </p>
      )}
    </fetcher.Form>
  );
}

/** Edit an item's text in place. */
export function EditItem({ item, onDone, label = "What do you want?" }: { item: Pick<Item, "id" | "text" | "details" | "due_at">; onDone: () => void; label?: string }) {
  const fetcher = useFetcher<IntentResult>();
  const uid = useId();
  const done = fetcher.state === "idle" && fetcher.data?.ok;
  useEffect(() => {
    if (done) onDone();
  }, [done, onDone]);
  return (
    <fetcher.Form method="post" className="grid gap-2">
      <input type="hidden" name="intent" value="edit-item" />
      <input type="hidden" name="item_id" value={item.id} />
      <label htmlFor={`${uid}-t`} className="sr-only">
        {label}
      </label>
      <textarea id={`${uid}-t`} name="text" required maxLength={500} defaultValue={item.text} className="textarea min-h-16" />
      <label htmlFor={`${uid}-d`} className="field">
        <span className="label">Details (optional)</span>
        <textarea id={`${uid}-d`} name="details" maxLength={2000} defaultValue={item.details ?? ""} className="textarea min-h-16" />
      </label>
      <label htmlFor={`${uid}-due`} className="field w-fit">
        <span className="label">Due date (optional)</span>
        <input id={`${uid}-due`} name="due_at" type="date" defaultValue={item.due_at ? item.due_at.slice(0, 10) : ""} className="input" />
      </label>
      <button className="btn btn-ghost btn-sm w-fit" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving…" : "Save"}
      </button>
      {fetcher.data?.error && (
        <p className="form-error" role="alert">
          {fetcher.data.error}
        </p>
      )}
    </fetcher.Form>
  );
}

/** The "Mark bought" form: optionally where and for how much. */
export function MarkBoughtForm({ itemId, currency: hint }: { itemId: string; currency?: string | null }) {
  const fetcher = useFetcher<IntentResult>();
  const currency = useCurrency(hint);
  const ref = useCloseOnDone(fetcher);
  const uid = useId();
  return (
    <fetcher.Form method="post" ref={ref} className="grid gap-2">
      <input type="hidden" name="intent" value="purchase" />
      <input type="hidden" name="item_id" value={itemId} />
      <p className="text-[0.85rem] text-ink-2">Bought one of the products? Use its “Bought this”. Otherwise, optionally say where:</p>
      <div className="grid grid-cols-[1fr_6rem_5rem] items-end gap-2">
        <label className="field" htmlFor={`${uid}-r`}>
          <span className="label">Retailer</span>
          <input id={`${uid}-r`} name="retailer" maxLength={80} className="input" />
        </label>
        <label className="field" htmlFor={`${uid}-p`}>
          <span className="label">Price</span>
          <input id={`${uid}-p`} name="price" inputMode="decimal" pattern="\d+(\.\d{1,2})?" className="input" />
        </label>
        <label className="field" htmlFor={`${uid}-c`}>
          <span className="label">Currency</span>
          <input id={`${uid}-c`} name="currency" defaultValue={currency} maxLength={3} pattern="[A-Za-z]{3}" className="input px-2 uppercase" />
        </label>
      </div>
      <button className="btn btn-ghost btn-sm w-fit" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving…" : "Mark bought"}
      </button>
      {fetcher.data?.error && (
        <p className="form-error" role="alert">
          {fetcher.data.error}
        </p>
      )}
    </fetcher.Form>
  );
}

/** "Mark bought" as a quiet action at the right end of an item's title row (wider screens). */
export function MarkBoughtElsewhere({ itemId, itemText, currency }: { itemId: string; itemText: string; currency?: string | null }) {
  return (
    <span className="hidden sm:inline-flex">
      <Menu label={`Mark “${itemText.slice(0, 60)}” bought`} wide triggerClass="btn-quiet" trigger="Mark bought">
        <div className="p-3">
          <MarkBoughtForm itemId={itemId} currency={currency} />
        </div>
      </Menu>
    </span>
  );
}
