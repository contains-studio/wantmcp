import assert from "node:assert/strict";
import { test } from "node:test";
import { detailsPatch } from "./details.ts";

test("an empty details prompt sends nothing, so saved details stay", () => {
  assert.equal(detailsPatch(""), null);
  assert.equal(detailsPatch("   \n "), null);
  assert.equal(detailsPatch(null), null);
});

test("a filled prompt sends the trimmed text", () => {
  assert.deepEqual(detailsPatch("  Budget $200, size M  "), { details: "Budget $200, size M" });
});
