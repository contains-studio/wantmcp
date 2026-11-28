/**
 * The /for pages: 67 personas, each with three sample lists in US terms. Static data in
 * content/personas; this checks what can be checked mechanically.
 */
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { UK_SPELLINGS } from "./spelling.ts";
import type { Persona } from "./personas.ts";
import type { SampleListSpec } from "./samples.ts";

const DIR = new URL("../../content/personas/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".ts"));
const personas: Persona[] = await Promise.all(files.map(async (f) => (await import(new URL(f, DIR).href)).default as Persona));

/** Real retailers, brands and marketplaces: never paired with an invented price (matched as whole words). */
const DENY = [
  "amazon", "walmart", "target.com", "best buy", "bestbuy", "costco", "home depot", "lowe's", "ikea", "wayfair", "etsy", "ebay",
  "apple store", "apple watch", "airpods", "iphone", "ipad", "macbook", "samsung", "sony", "playstation", "xbox", "nintendo", "dyson",
  "kitchenaid", "lg", "bose", "kohl's", "macy's", "newegg", "chewy", "instacart", "sam's club", "trader joe's", "whole foods",
  "staples", "office depot", "rei", "nordstrom", "zara", "h&m", "uniqlo", "nike", "adidas", "lego", "vitamix", "instant pot",
  "roomba", "peloton",
].map((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i"));
/** UK-only words ("flat" only in its apartment sense), and the site's list of British spellings (spelling.ts). */
const UK = [
  /£/, /\bGBP\b/, /\bflatmates?\b/i, /\b(new|small|rented|shared|moving|one-bed|two-bed|student) flat\b/i, /\b3-bed\b/i, /\bsemi-detached\b/i,
  /removal (firm|compan)/i, /\bpostcode/i, /\borganis/i, /\bnappies\b/i, /\btrainers\b/i,
  /\bmum\b/i, /\bholiday let/i, /\bcouncil tax/i, /\bjumper\b/i, /\bfortnight/i, /\bhoover\b/i,
  ...UK_SPELLINGS.map(([re]) => re),
];

const texts = (l: SampleListSpec): string[] => [
  l.title,
  l.description ?? "",
  ...l.items.flatMap((i) => [i.want, i.details ?? "", i.doneNote ?? "", ...(i.products ?? []).flatMap((p) => [p.title, p.store, p.note ?? "", p.coupon ?? ""]), ...(i.updates ?? []).flatMap((u) => [u.title, u.body, ...(u.links ?? [])])]),
];
const pageTexts = (p: Persona) => [p.title, p.description, p.h1, p.intro, p.label, ...texts(p.lists.shopping), ...texts(p.lists.tasks), ...texts(p.lists.research)];

test("67 personas, each file named after its slug", () => {
  assert.equal(personas.length, 67);
  for (const [i, p] of personas.entries()) assert.equal(`${p.slug}.ts`, files[i]);
  assert.deepEqual([...personas.map((p) => p.order)].sort((a, b) => a - b), Array.from({ length: 67 }, (_, i) => i + 1));
});

test("slugs, titles, headings and descriptions are unique", () => {
  for (const key of ["slug", "title", "h1", "description"] as const) {
    const seen = new Set(personas.map((p) => p[key].toLowerCase()));
    assert.equal(seen.size, personas.length, `duplicate ${key}`);
  }
  for (const p of personas) assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("titles and meta descriptions are within length", () => {
  for (const p of personas) {
    assert.ok(p.title.length >= 25 && p.title.length <= 60, `${p.slug}: title is ${p.title.length} characters`);
    assert.ok(p.description.length >= 110 && p.description.length <= 160, `${p.slug}: description is ${p.description.length} characters`);
    assert.ok(p.intro.length <= 220, `${p.slug}: intro is ${p.intro.length} characters`);
  }
});

test("three lists, one per format, each with at least three wants", () => {
  for (const p of personas) {
    for (const f of ["shopping", "tasks", "research"] as const) {
      const l = p.lists[f];
      assert.equal(l.format, f, `${p.slug}: ${f} list has format ${l.format}`);
      assert.ok(l.items.length >= 3, `${p.slug}: ${f} list has ${l.items.length} wants`);
    }
    assert.ok(p.lists.shopping.items.some((i) => (i.products ?? []).length > 0), `${p.slug}: no products`);
  }
});

test("every price is a plain US dollar amount", () => {
  for (const p of personas)
    for (const item of p.lists.shopping.items)
      for (const pr of item.products ?? []) for (const v of [pr.price, pr.was, ...(pr.earlier ?? [])].filter(Boolean)) assert.match(v!, /^\d+(\.\d{2})?$/, `${p.slug}: price ${v}`);
});

test("no UK terms, no real retailers or brands, links only to example domains", () => {
  for (const p of personas) {
    for (const t of pageTexts(p)) {
      for (const re of UK) assert.doesNotMatch(t, re, `${p.slug}: "${t}"`);
      for (const d of DENY) assert.doesNotMatch(t, d, `${p.slug}: names a real brand in "${t}"`);
    }
    for (const l of [p.lists.shopping, p.lists.tasks, p.lists.research])
      for (const i of l.items) for (const u of i.updates ?? []) for (const href of u.links ?? []) assert.match(href, /^https:\/\/example\.(com|org)(\/|$)/, `${p.slug}: link ${href}`);
  }
});

test("no promises the product can't keep", () => {
  const BAD = [/we('ll| will)? (watch|alert|notify|track)/i, /\bautomatically (track|check|watch|update|re-?check)/i, /notif(y|ies) you/i, /\balerts? you\b/i, /guests? can (claim|mark|reserve)/i, /\bwe buy\b/i];
  for (const p of personas) for (const t of [p.title, p.description, p.h1, p.intro]) for (const re of BAD) assert.doesNotMatch(t, re, `${p.slug}: "${t}"`);
});

test("every list names a current layout (no retired Cards, no occasion without a layout)", () => {
  const LAYOUTS = ["sheet", "today", "doc", "board", "sections", "heat", "tracker", "gallery"];
  // Offered occasions only (Valentine's Day and Halloween are out of season).
  const OCCASIONS = ["black-friday", "cyber-monday", "chanukah", "christmas", "kwanzaa", "new-year", "birthday"];
  for (const p of personas)
    for (const l of [p.lists.shopping, p.lists.tasks, p.lists.research]) {
      if (!l.look) continue;
      const [t, o] = l.look.split("--");
      assert.ok(LAYOUTS.includes(t), `${p.slug}: layout "${t}"`);
      if (o) assert.ok(OCCASIONS.includes(o), `${p.slug}: occasion "${o}"`);
    }
});

test("49 pages are indexed; the 18 not yet served stay out", () => {
  assert.equal(personas.filter((p) => p.index).length, 49);
  assert.equal(personas.filter((p) => !p.index).length, 18);
});
