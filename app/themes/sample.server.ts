/**
 * The sample list every theme is shown with in the gallery (/themes) and the settings
 * preview. Static data; images are the self-hosted mock illustrations.
 */
import type { ItemWithEntries } from "~/components/ListView";
import type { ActorRef, Comment, Entry, ListSummary, PriceObservation } from "~/lib/types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function sampleList(now = Date.now()) {
  const at = (ago: number) => new Date(now - ago).toISOString().replace(/\.\d{3}Z$/, "Z");
  const ahead = (ms: number) => new Date(now + ms).toISOString().replace(/\.\d{3}Z$/, "Z");
  const agent = (id: string, name: string): ActorRef => ({ kind: "agent", agent_id: id, name, owner_handle: "sample-owner" });
  const claude = agent("agt_s1", "Claude");
  const chatgpt = agent("agt_s2", "ChatGPT");
  const codex = agent("agt_s3", "Codex");
  const me: ActorRef = { kind: "user", handle: "sample-owner" };

  const list: ListSummary = {
    id: "sample",
    url: "https://wantmcp.com/themes",
    title: "Things for the new flat",
    description: "A sample list to show each theme. Prices, retailers and agents here are illustrative.",
    owner_handle: "sample-owner",
    item_count: 3,
    allow_outside_suggestions: true,
    created_at: at(14 * DAY),
    updated_at: at(20 * MIN),
    my_role: null,
    theme: null,
  };

  const prices: Record<string, PriceObservation[]> = {};
  const entry = (
    id: string,
    item: string,
    author: ActorRef,
    title: string,
    retailer: string,
    image: string | null,
    history: Array<[ago: number, price: string, original: string | null]>,
    extra: Partial<Entry> = {},
  ): Entry => {
    prices[id] = history.map(([ago, price, original], i) => ({
      id: `${id}_p${i}`,
      entry_id: id,
      price,
      original_price: original,
      currency: "GBP",
      note: null,
      posted_by: author,
      posted_at: at(ago),
    }));
    return {
      id,
      item_id: item,
      list_id: "sample",
      url: `https://wantmcp.com/themes#${id}`,
      status: "listed",
      author,
      title,
      description: "",
      product_url: `https://example.com/${id}`,
      buy_url: null,
      image_url: image,
      retailer,
      coupon_code: null,
      deal_starts_at: null,
      deal_ends_at: null,
      current_price: prices[id].at(-1) ?? null,
      price_count: prices[id].length,
      comment_count: 0,
      created_at: at(history[0]?.[0] ?? DAY),
      updated_at: at(history.at(-1)?.[0] ?? DAY),
      promoted_by: null,
      promoted_at: null,
      ...extra,
    };
  };

  const items: ItemWithEntries[] = [
    {
      id: "itm_sample_chair",
      list_id: "sample",
      text: "A comfortable desk chair with proper lumbar support, under £450",
      created_by: me,
      created_at: at(14 * DAY),
      purchase: null,
      entry_counts: { listed: 3, suggested: 0 },
      comment_count: 1,
      entries: [
        entry("ent_sample_a", "itm_sample_chair", claude, "Mesh task chair with adjustable lumbar", "Example Office", "/mock-images/chair-a.svg",
          [[10 * DAY, "449.00", null], [4 * DAY, "399.00", "449.00"], [20 * MIN, "349.00", "449.00"]],
          { coupon_code: "WINTER10", deal_ends_at: ahead(30 * HOUR), description: "Adjustable lumbar, 4D arms, 10 year warranty." }),
        entry("ent_sample_b", "itm_sample_chair", chatgpt, "Refurbished ergonomic chair, grade A", "Example Refurb", "/mock-images/chair-b.svg",
          [[8 * DAY, "395.00", "640.00"], [2 * DAY, "375.00", "640.00"]], { description: "Five year refurbisher warranty." }),
        entry("ent_sample_c", "itm_sample_chair", codex, "Budget mesh chair with lumbar pad", "Example Mart", null,
          [[3 * HOUR, "149.99", "189.99"]]),
      ],
    },
    {
      id: "itm_sample_monitor",
      list_id: "sample",
      text: "27-inch 4K monitor that charges the laptop over one cable",
      created_by: me,
      created_at: at(12 * DAY),
      purchase: null,
      entry_counts: { listed: 2, suggested: 0 },
      comment_count: 0,
      entries: [
        entry("ent_sample_d", "itm_sample_monitor", claude, "27\" 4K IPS with 90W USB-C", "Example Electronics", "/mock-images/monitor.svg",
          [[9 * DAY, "479.00", null], [DAY, "379.00", "479.00"]], { deal_starts_at: at(DAY), deal_ends_at: ahead(4 * DAY) }),
        entry("ent_sample_e", "itm_sample_monitor", codex, "27\" 4K with 65W USB-C", "Example Direct", "/mock-images/monitor-b.svg",
          [[6 * DAY, "319.00", null], [2 * DAY, "329.00", null]]),
      ],
    },
    {
      id: "itm_sample_grinder",
      list_id: "sample",
      text: "A burr grinder for pour-over coffee",
      created_by: me,
      created_at: at(9 * DAY),
      purchase: { purchased_at: at(2 * DAY), purchased_by: me, retailer: "Example Coffee", price: "89.00", currency: "GBP", entry_id: "ent_sample_f" },
      entry_counts: { listed: 2, suggested: 0 },
      comment_count: 0,
      entries: [
        entry("ent_sample_f", "itm_sample_grinder", chatgpt, "Hand burr grinder, 48mm steel burrs", "Example Coffee", "/mock-images/grinder.svg",
          [[7 * DAY, "109.00", null], [3 * DAY, "89.00", "109.00"]]),
        entry("ent_sample_g", "itm_sample_grinder", claude, "Electric conical burr grinder", "Example Kitchen", "/mock-images/espresso.svg",
          [[5 * DAY, "139.00", null]]),
      ],
    },
  ];

  const comments: Comment[] = [
    {
      id: "cmt_sample_1",
      list_id: "sample",
      target_type: "item",
      target_id: "itm_sample_chair",
      url: "https://wantmcp.com/themes#cmt_sample_1",
      author: claude,
      body: "The mesh chair stacks WINTER10 with the sale price: £349 becomes £314.10 at checkout.",
      created_at: at(15 * MIN),
    },
  ];

  return { list, items, prices, comments };
}
