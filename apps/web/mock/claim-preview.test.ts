/** The mock's claim preview follows SPEC 15.1: the first 20 items, and the work under each, in every format. */
import assert from "node:assert/strict";
import test from "node:test";
import { handleMockRequest, resetMockStore } from "./api.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lookup = async (token: string): Promise<any> => {
  const res = await handleMockRequest(
    new Request("http://mock/v1/claims/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }),
  );
  return res.json();
};

test("shopping: products under each want, cheapest first, at most three; a want with none says so by its count", async () => {
  resetMockStore();
  const p = await lookup("clm_e2e_car_unit1");
  assert.equal(p.list.counts.items, 7);
  assert.equal(p.list.counts.items_with_entries, 3);
  const mats = p.items[0];
  assert.deepEqual(Object.keys(mats).sort(), ["entries", "entry_count", "note", "status", "summary", "text"]);
  assert.equal(mats.status, "open");
  assert.equal(mats.summary, null);
  assert.equal(mats.entry_count, 2);
  assert.deepEqual(
    mats.entries.map((e: { price: string }) => e.price),
    ["189.95", "239.99"],
  );
  assert.deepEqual(Object.keys(mats.entries[0]).sort(), ["checked_at", "currency", "image_url", "original_price", "price", "price_source", "product_url", "retailer", "title", "verified"]);
  assert.equal(mats.entries[1].original_price, "259.99");
  const empty = p.items.find((i: { entry_count: number }) => i.entry_count === 0);
  assert.deepEqual(empty.entries, []);
});

test("20 wants at most, and a long title, as given", async () => {
  resetMockStore();
  const p = await lookup("clm_e2e_long_unit2");
  assert.equal(p.items.length, 20);
  assert.ok(p.list.title.length > 100);
  for (const i of p.items) assert.ok(i.text.length <= 140);
});

test("tasks: status and the latest note; research: answered or open, with the answer's start", async () => {
  resetMockStore();
  const t = await lookup("clm_e2e_tasks_unit3");
  assert.equal(t.list.format, "tasks");
  assert.equal(t.items[0].status, "in_progress");
  assert.match(t.items[0].summary, /^Two quotes in/);
  assert.deepEqual(t.items[0].entries, []);
  assert.equal(t.items[1].status, "done");
  assert.equal(t.list.counts.items_with_entries, 0, "present on every format");
  assert.match(t.items[1].summary, /^Cancelled; last charge Dec 1/, "a done task's summary is its completion note");
  const r = await lookup("clm_e2e_research_unit4");
  assert.equal(r.items[0].status, "done");
  assert.match(r.items[0].summary, /^About \$650 a year/);
  assert.equal(r.items[1].status, "open");
  assert.equal(r.items[1].summary, null);
});

test("the preview never carries a key or an author", async () => {
  resetMockStore();
  const text = JSON.stringify(await lookup("clm_e2e_car_unit5"));
  assert.doesNotMatch(text, /wk_|ak_|author|agent_id/);
});
