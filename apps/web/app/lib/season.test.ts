import assert from "node:assert/strict";
import { test } from "node:test";
import { SEASON, seasonActive, seasonTiles } from "./season.ts";

const at = (iso: string) => Date.parse(iso);

test("each occasion leaves the band at midnight Pacific after its last day", () => {
  assert.deepEqual(seasonTiles(SEASON, at("2026-11-27T23:59:59-08:00")), ["black-friday", "cyber-monday", "chanukah", "christmas", "kwanzaa"]);
  assert.deepEqual(seasonTiles(SEASON, at("2026-11-28T00:00:00-08:00")), ["cyber-monday", "chanukah", "christmas", "kwanzaa"]);
  assert.deepEqual(seasonTiles(SEASON, at("2026-12-12T23:59:59-08:00")), ["chanukah", "christmas", "kwanzaa"]);
  assert.deepEqual(seasonTiles(SEASON, at("2026-12-13T00:00:00-08:00")), ["christmas", "kwanzaa"]);
  assert.deepEqual(seasonTiles(SEASON, at("2026-12-26T00:00:00-08:00")), ["kwanzaa"]);
  assert.deepEqual(seasonTiles(SEASON, at("2027-01-02T00:00:00-08:00")), []);
  assert.equal(seasonActive(SEASON, at("2027-01-02T00:00:00-08:00")), false);
});

test("in UTC terms, Black Friday's tile stays until 08:00 on Saturday", () => {
  assert.ok(seasonTiles(SEASON, at("2026-11-28T07:59:59Z")).includes("black-friday"));
  assert.ok(!seasonTiles(SEASON, at("2026-11-28T08:00:00Z")).includes("black-friday"));
});

test("endsAt switches the whole band off early", () => {
  const early = { ...SEASON, endsAt: "2026-12-01T00:00:00-08:00" };
  assert.equal(seasonTiles(early, at("2026-11-30T12:00:00-08:00")).length, 4);
  assert.deepEqual(seasonTiles(early, at("2026-12-01T00:00:00-08:00")), []);
  assert.equal(seasonActive(early, at("2026-12-05T00:00:00-08:00")), false);
});

test("every occasion in the band has a last day", () => {
  for (const slug of SEASON.occasions) assert.ok(SEASON.over[slug], slug);
});
