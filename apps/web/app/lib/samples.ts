/**
 * Sample lists as compact, typed data, and the builder that turns one into what <ListView>
 * renders. Used by the home page, the theme gallery and the /for pages. Static: no API calls.
 *
 * Rules for every sample (checked by app/lib/samples.test.ts and the persona test):
 * - US terms: prices in USD, US spelling, items a US household would recognise.
 * - Store and product names are invented; links point at example.com or example.org.
 * - Every sample says it is a sample.
 */
import type { ItemWithEntries } from "~/components/ListView";
import type { ActorRef, Comment, Entry, ListFormat, ListSummary, PriceObservation } from "./types";

export type SampleAgent = "Claude" | "ChatGPT" | "Codex" | "Cursor" | "Grok" | "Muse" | "OpenClaw" | "Gemini";

/** The illustrations in public/mock-images, for products that have a picture. */
export type SampleImage = "chair-a" | "chair-b" | "espresso" | "grinder" | "keyboard" | "monitor" | "monitor-b" | "shoe" | "vest";

export interface SampleProduct {
  title: string;
  /** An invented store name. */
  store: string;
  /** Current price in US dollars, e.g. "649.99". */
  price: string;
  /** The price before a sale, if there is one. */
  was?: string;
  /** Earlier prices the agent posted, oldest first (shown as price history). */
  earlier?: string[];
  coupon?: string;
  note?: string;
  by: SampleAgent;
  image?: SampleImage;
  /** Hours since the price was checked (default 3). */
  checkedHoursAgo?: number;
}

export interface SampleUpdate {
  /** An update (tasks) or an answer in a sentence (research). */
  title: string;
  body: string;
  /** example.com or example.org links only. */
  links?: string[];
  by: SampleAgent;
}

export interface SampleItem {
  want: string;
  details?: string;
  status?: "open" | "in_progress" | "done";
  /** Who holds the task (with status in_progress); defaults to the first update's author. */
  claimedBy?: SampleAgent;
  /** Days until due (negative: overdue). */
  dueInDays?: number;
  /** Shopping: the product that was bought (its index), marking the item bought. */
  bought?: number;
  /** Research: the accepted answer (its index), marking the question answered. */
  accepted?: number;
  /** Tasks: a note left when it was done. */
  doneNote?: string;
  products?: SampleProduct[];
  updates?: SampleUpdate[];
}

export interface SampleListSpec {
  format: ListFormat;
  title: string;
  /** One line; the builder adds that it is a sample. */
  description?: string;
  /** A look slug (`sheet`, `christmas`, `today--chanukah`); defaults to the format's default layout. */
  look?: string;
  items: SampleItem[];
}

export type BuiltSample = { list: ListSummary; items: ItemWithEntries[]; prices: Record<string, PriceObservation[]>; comments: Comment[] };

export const SAMPLE_NOTE = "Sample list: stores, prices and agents are illustrative.";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const AGENT_IDS: Record<SampleAgent, string> = {
  Claude: "agt_s1",
  ChatGPT: "agt_s2",
  Codex: "agt_s3",
  Cursor: "agt_s4",
  Grok: "agt_s5",
  Muse: "agt_s6",
  OpenClaw: "agt_s7",
  Gemini: "agt_s8",
};

/** Builds a renderable list from a spec. `id` keeps anchors unique when several samples share a page. */
export function buildSample(spec: SampleListSpec, opts: { id?: string; now?: number; url?: string } = {}): BuiltSample {
  const now = opts.now ?? Date.now();
  const lid = opts.id ?? "sample";
  const pageUrl = opts.url ?? "https://wantmcp.com/themes";
  const at = (ago: number) => new Date(now - ago).toISOString().replace(/\.\d{3}Z$/, "Z");
  const agent = (name: SampleAgent): ActorRef => ({ kind: "agent", agent_id: AGENT_IDS[name], name, owner_handle: "sample-owner" });
  const me: ActorRef = { kind: "user", handle: "sample-owner" };
  const prices: Record<string, PriceObservation[]> = {};
  const n = spec.items.length;

  const items = spec.items.map((it, i): ItemWithEntries => {
    const iid = `itm_${lid}_${i + 1}`;
    const created = (n - i + 4) * DAY;
    const entries: Entry[] = [];
    const base = {
      item_id: iid,
      list_id: lid,
      status: "listed" as const,
      buy_url: null,
      coupon_code: null,
      deal_starts_at: null,
      deal_ends_at: null,
      comment_count: 0,
      promoted_by: null,
      promoted_at: null,
    };
    (it.products ?? []).forEach((p, j) => {
      const eid = `ent_${lid}_${i + 1}_${j + 1}`;
      const checked = (p.checkedHoursAgo ?? 3 + j * 5) * HOUR;
      const history = [...(p.earlier ?? []), p.price];
      prices[eid] = history.map((price, k) => {
        const ago = checked + (history.length - 1 - k) * 3 * DAY;
        const last = k === history.length - 1;
        return {
          id: `${eid}_p${k}`,
          entry_id: eid,
          price,
          original_price: last ? p.was ?? null : null,
          currency: "USD",
          note: null,
          posted_by: agent(p.by),
          posted_at: at(ago),
          source: last ? "retailer_page" : "search",
          source_url: null,
          checked_at: at(ago),
          in_stock: true,
          verified: last,
        } as PriceObservation;
      });
      entries.push({
        ...base,
        id: eid,
        url: `${pageUrl}#${eid}`,
        author: agent(p.by),
        title: p.title,
        description: p.note ?? "",
        product_url: `https://example.com/${lid}/${i + 1}/${j + 1}`,
        image_url: p.image ? `/mock-images/${p.image}.svg` : null,
        retailer: p.store,
        coupon_code: p.coupon ?? null,
        current_price: prices[eid].at(-1) ?? null,
        price_count: prices[eid].length,
        created_at: at(checked + (history.length - 1) * 3 * DAY),
        updated_at: at(checked),
        kind: "product",
        links: [],
      } as Entry);
    });
    (it.updates ?? []).forEach((u, j) => {
      const eid = `ent_${lid}_${i + 1}_${j + 1}`;
      const ago = (2 + j * 7 + i) * HOUR;
      entries.push({
        ...base,
        id: eid,
        url: `${pageUrl}#${eid}`,
        author: agent(u.by),
        title: u.title,
        description: u.body,
        product_url: null,
        image_url: null,
        retailer: "",
        current_price: null,
        price_count: 0,
        created_at: at(ago),
        updated_at: at(ago),
        kind: spec.format === "research" ? "answer" : "update",
        links: u.links ?? [],
      } as Entry);
    });

    const boughtEntry = it.bought !== undefined ? entries[it.bought] : undefined;
    const accepted = it.accepted !== undefined ? entries[it.accepted] : undefined;
    const status = boughtEntry || accepted ? "done" : it.status ?? "open";
    const claimer = it.claimedBy ?? it.updates?.[0]?.by ?? "Claude";
    return {
      id: iid,
      url: `${pageUrl}#${iid}`,
      list_id: lid,
      text: it.want,
      details: it.details ?? "",
      created_by: me,
      created_at: at(created),
      due_at: it.dueInDays === undefined ? null : at(-it.dueInDays * DAY),
      status,
      open_question: null,
      claimed_by: status === "in_progress" ? agent(claimer) : null,
      claimed_at: status === "in_progress" ? at(2 * HOUR) : null,
      completion:
        status === "done" && spec.format !== "shopping"
          ? { completed_at: at(3 * HOUR), completed_by: me, note: it.doneNote ?? null, entry_id: accepted?.id ?? null }
          : null,
      purchase: boughtEntry
        ? {
            purchased_at: at(DAY),
            purchased_by: me,
            retailer: boughtEntry.retailer,
            price: boughtEntry.current_price?.price ?? null,
            currency: "USD",
            entry_id: boughtEntry.id,
          }
        : null,
      entry_counts: { listed: entries.length, suggested: 0 },
      comment_count: 0,
      entries,
    } as unknown as ItemWithEntries;
  });

  const list: ListSummary = {
    id: lid,
    url: pageUrl,
    title: spec.title,
    description: spec.description ? `${spec.description} ${SAMPLE_NOTE}` : SAMPLE_NOTE,
    owner_handle: "sample-owner",
    item_count: items.length,
    allow_outside_suggestions: false,
    created_at: at((n + 6) * DAY),
    updated_at: at(20 * MIN),
    my_role: null,
    theme: spec.look ?? null,
    format: spec.format,
    visibility: "public",
  };
  return { list, items, prices, comments: [] };
}

/** The layout each format uses when a list has no look of its own. */
export const DEFAULT_LOOK: Record<ListFormat, string> = { shopping: "sheet", tasks: "today", research: "doc" };
