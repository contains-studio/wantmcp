import assert from "node:assert/strict";
import { test } from "node:test";
import { apiPathPattern, errorLine, newRef, routePattern } from "./telemetry.ts";

test("paths become route patterns: ids, tokens and query strings never survive", () => {
  assert.equal(routePattern("/l/lst_k3m9q2xyz"), "/l/:id");
  assert.equal(routePattern("/l/lst_k3m9q2xyz.data"), "/l/:id");
  assert.equal(routePattern("/app/lists/lst_abc/settings?template=board"), "/app/lists/:id/settings");
  assert.equal(routePattern("/invite/SaYjQuOmxszphMoAIlOoeK9h"), "/invite/:token");
  assert.equal(routePattern("/app?list=lst_secret"), "/app");
  assert.equal(routePattern("/weird/someone@example.com"), "(other)");
});

test("API paths keep their shape and lose their ids", () => {
  assert.equal(apiPathPattern("/v1/lists/lst_x/items?cursor=abc"), "/v1/lists/:id/items");
  assert.equal(apiPathPattern("/v1/questions/qst_1/answer"), "/v1/questions/:id/answer");
});

test("an error line is redacted: no email, token, list id or query string", () => {
  const line = errorLine({
    kind: "server_error",
    ref: newRef(),
    route: "/l/lst_private123?email=someone@example.com&token=wk_secretsecret",
    status: 500,
    build: "mwvfy18x",
    upstream_request_id: "req_01HXYZ",
    name: "someone@example.com",
    code: "Bearer wk_secret",
  });
  for (const leak of ["someone@example.com", "wk_secret", "lst_private123", "token=", "?"]) {
    assert.ok(!line.includes(leak), `line leaks ${leak}: ${line}`);
  }
  const parsed = JSON.parse(line);
  assert.deepEqual(Object.keys(parsed).sort(), ["build", "event", "ref", "route", "status", "upstream_request_id"].sort());
  assert.equal(parsed.route, "/l/:id");
});

test("malformed fields are dropped, not logged", () => {
  const parsed = JSON.parse(errorLine({ kind: "client_error", ref: "NOT A REF", route: "javascript:alert(1)", status: 9999, build: "x".repeat(80), upstream_request_id: "a b c" }));
  assert.deepEqual(parsed, { event: "client_error", route: "(other)" });
});
