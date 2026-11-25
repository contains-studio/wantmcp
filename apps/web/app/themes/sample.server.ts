/**
 * The sample list every theme is shown with in the gallery (/themes) and the settings
 * preview. Static data; images are the self-hosted mock illustrations.
 */
import type { ItemWithEntries } from "~/components/ListView";
import type { ActorRef, Comment, Entry, ListFormat, ListSummary, PriceObservation } from "~/lib/types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function sampleList(now = Date.now(), format: ListFormat = "shopping") {
  if (format === "tasks") return sampleTasks(now);
  if (format === "research") return sampleResearch(now);
  return sampleShopping(now);
}

function sampleShopping(now: number) {
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
    format: "shopping",
    visibility: "public",
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
      source: i === history.length - 1 ? "retailer_page" : "search",
      source_url: null,
      checked_at: at(ago),
      in_stock: true,
      verified: i === history.length - 1,
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
      kind: "product",
      links: [],
      ...extra,
    };
  };

  const itemDefaults = { details: "", due_at: null, status: "open" as const, open_question: null, claimed_by: null, claimed_at: null, completion: null };
  const items: ItemWithEntries[] = [
    {
      id: "itm_sample_chair",
      url: "https://wantmcp.com/themes#itm_sample_chair",
      list_id: "sample",
      text: "A comfortable desk chair with proper lumbar support, under £450",
      created_by: me,
      created_at: at(14 * DAY),
      purchase: null,
      ...itemDefaults,
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
      url: "https://wantmcp.com/themes#itm_sample_monitor",
      list_id: "sample",
      text: "27-inch 4K monitor that charges the laptop over one cable",
      created_by: me,
      created_at: at(12 * DAY),
      purchase: null,
      ...itemDefaults,
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
      url: "https://wantmcp.com/themes#itm_sample_grinder",
      list_id: "sample",
      text: "A burr grinder for pour-over coffee",
      created_by: me,
      created_at: at(9 * DAY),
      purchase: { purchased_at: at(2 * DAY), purchased_by: me, retailer: "Example Coffee", price: "89.00", currency: "GBP", entry_id: "ent_sample_f" },
      ...itemDefaults,
      status: "done",
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

type Sample = ReturnType<typeof sampleShopping>;

function textSample(now: number, format: "tasks" | "research"): Sample {
  const at = (ago: number) => new Date(now - ago).toISOString().replace(/\.\d{3}Z$/, "Z");
  const agent = (id: string, name: string): ActorRef => ({ kind: "agent", agent_id: id, name, owner_handle: "sample-owner" });
  const claude = agent("agt_s1", "Claude");
  const chatgpt = agent("agt_s2", "ChatGPT");
  const codex = agent("agt_s3", "Codex");
  const me: ActorRef = { kind: "user", handle: "sample-owner" };
  const tasks = format === "tasks";
  const list: ListSummary = {
    id: "sample",
    url: "https://wantmcp.com/themes",
    title: tasks ? "Moving flat" : "Before we get a heat pump",
    description: tasks ? "A sample task list: things to sort before moving day." : "A sample research list: questions to answer before getting quotes.",
    owner_handle: "sample-owner",
    item_count: 4,
    allow_outside_suggestions: false,
    created_at: at(6 * DAY),
    updated_at: at(20 * MIN),
    my_role: null,
    theme: null,
    format,
    visibility: "public",
  };
  const kind = tasks ? "update" : "answer";
  const entry = (id: string, item: string, author: ActorRef, title: string, description: string, links: string[], ago: number): Entry => ({
    id, item_id: item, list_id: "sample", url: `https://wantmcp.com/themes#${id}`, status: "listed", author, title, description,
    product_url: null, kind, links, buy_url: null, image_url: null, retailer: "", coupon_code: null, deal_starts_at: null, deal_ends_at: null,
    current_price: null, price_count: 0, comment_count: 0, created_at: at(ago), updated_at: at(ago), promoted_by: null, promoted_at: null,
  });
  const item = (id: string, text: string, details: string, status: "open" | "in_progress" | "done", entries: Entry[], extra: Record<string, unknown> = {}) => ({
    id, url: `https://wantmcp.com/themes#${id}`, list_id: "sample", text, details, created_by: me, created_at: at(5 * DAY), purchase: null,
    status, claimed_by: status === "in_progress" ? claude : null, claimed_at: status === "in_progress" ? at(2 * HOUR) : null, open_question: null,
    completion: null, due_at: null,
    entry_counts: { listed: entries.length, suggested: 0 }, comment_count: 0, entries, ...extra,
  });
  const items = tasks
    ? [
        item("itm_s_t1", "Move the broadband to the new address", "Account is in my name. Ask about install fees.", "in_progress",
          [entry("ent_s_t1", "itm_s_t1", claude, "Booked: free move, install on the 13th", "Held the 13th, the day after we move. Needs confirming by Friday.", ["https://example.com/moving"], 2 * HOUR)],
          { due_at: at(-3 * DAY) }),
        item("itm_s_t2", "Get three quotes from removal firms", "One-bed, second floor, no lift.", "open",
          [entry("ent_s_t2", "itm_s_t2", chatgpt, "Two quotes in, two to come", "£420 and £465 so far, both include packing materials.", [], 5 * HOUR)],
          { due_at: at(-1 * DAY) }),
        item("itm_s_t3", "Book a parking permit for the van", "", "open", []),
        item("itm_s_t4", "Set up mail forwarding", "", "done", [], { completion: { completed_at: at(DAY), completed_by: me, note: "Twelve months, done online.", entry_id: null } }),
      ]
    : [
        item("itm_s_r1", "What does a heat pump cost to run per year?", "3-bed semi, gas use about 12,000 kWh a year.", "done",
          [
            entry("ent_s_r1", "itm_s_r1", claude, "About £1,100 to £1,400 a year", "At a seasonal efficiency of 3 to 3.5, 12,000 kWh of heat needs about 3,400 to 4,000 kWh of electricity.", ["https://example.org/running-costs"], 6 * HOUR),
            entry("ent_s_r2", "itm_s_r1", chatgpt, "Roughly a third of your gas kWh", "Divide gas use by three, multiply by your unit rate.", [], 20 * HOUR),
          ],
          { completion: { completed_at: at(3 * HOUR), completed_by: me, note: null, entry_id: "ent_s_r1" } }),
        item("itm_s_r2", "Which grants can we apply for?", "", "in_progress",
          [entry("ent_s_r3", "itm_s_r2", codex, "One national scheme fits, applied through the installer", "The installer applies on your behalf; you need an energy certificate under ten years old.", ["https://example.com/grants"], 3 * HOUR)]),
        item("itm_s_r3", "How noisy is an outdoor unit at night?", "", "open", []),
      ];
  return { list, items: items as unknown as ItemWithEntries[], prices: {} as Record<string, PriceObservation[]>, comments: [] as Comment[] };
}

const sampleTasks = (now: number) => textSample(now, "tasks");
const sampleResearch = (now: number) => textSample(now, "research");
