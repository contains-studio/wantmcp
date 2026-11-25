import assert from "node:assert/strict";
import test from "node:test";
import { canonicalRedirect } from "./canonical.ts";

test("www always goes to the HTTPS apex, keeping path and query", () => {
  assert.equal(canonicalRedirect("http://www.wantmcp.com/"), "https://wantmcp.com/");
  assert.equal(canonicalRedirect("https://www.wantmcp.com/l/lst_x?view=sheet"), "https://wantmcp.com/l/lst_x?view=sheet");
});

test("plain HTTP on the apex goes to HTTPS", () => {
  assert.equal(canonicalRedirect("http://wantmcp.com/for?x=1"), "https://wantmcp.com/for?x=1");
});

test("canonical addresses and local development are left alone", () => {
  assert.equal(canonicalRedirect("https://wantmcp.com/"), null);
  assert.equal(canonicalRedirect("http://localhost:5173/app"), null);
  assert.equal(canonicalRedirect("http://127.0.0.1:8787/"), null);
});
