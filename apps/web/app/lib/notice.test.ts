import assert from "node:assert/strict";
import { test } from "node:test";
import { noticePath } from "./routines.ts";

test("a notice's link is followed only to a path on this site", () => {
  assert.equal(noticePath("https://wantmcp.com/l/lst_a#itm_b"), "/l/lst_a#itm_b");
  assert.equal(noticePath("/l/lst_a"), "/l/lst_a");
  assert.equal(noticePath("https://evil.example/x"), "/app");
  assert.equal(noticePath("//evil.example/x"), "/app");
  assert.equal(noticePath(null), "/app");
});
