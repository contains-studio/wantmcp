import assert from "node:assert/strict";
import test from "node:test";
import { safeNext } from "./url.ts";

test("same-site paths pass through", () => {
  assert.equal(safeNext("/app"), "/app");
  assert.equal(safeNext("/claim"), "/claim");
  assert.equal(safeNext("/invite/inv_abc?x=1#y"), "/invite/inv_abc?x=1#y");
  assert.equal(safeNext("/for/black-friday-shopping-list"), "/for/black-friday-shopping-list");
});

test("anything that could leave the site falls back to /app", () => {
  for (const bad of [
    "/\\evil.example",
    "//evil.example",
    "/%09/evil.example",
    "/%2F/evil.example",
    "/%5Cevil.example",
    "/\n/evil.example",
    "/\t/evil.example",
    "/app\r\nSet-Cookie: x=1",
    "https://evil.example/",
    "javascript:alert(1)",
    "evil.example",
    "",
    "/%E0%A4%A",
    "/" + "a".repeat(600),
  ]) {
    assert.equal(safeNext(bad), "/app", JSON.stringify(bad));
  }
  assert.equal(safeNext(null), "/app");
  assert.equal(safeNext("//x", "/"), "/");
});
