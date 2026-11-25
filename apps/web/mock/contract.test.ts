/**
 * The mock must answer in the real API's shapes, or tests pass against something production never sends (the
 * /me/lists?include=summary 500 of 25 Nov). Every paged route returns { data, next_cursor }.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { handleMockRequest, resetMockStore } from "./api.ts";

const call = async (path: string, init: { method?: string; body?: unknown; token?: string } = {}) => {
  const res = await handleMockRequest(
    new Request(`http://mock/v1${path}`, {
      method: init.method ?? "GET",
      headers: { "content-type": "application/json", ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    }),
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

test("every paged route answers { data, next_cursor }", async () => {
  resetMockStore();
  await call("/auth/code", { method: "POST", body: { email: "demo@example.com" } });
  const { body: session } = await call("/auth/verify", { method: "POST", body: { email: "demo@example.com", code: "123456" } });
  const token = session.token as string;
  for (const path of ["/feed", "/lists", "/me/feed", "/me/lists?include=summary", "/lists/lst_desk2026/comments", "/lists/lst_desk2026/suggestions"]) {
    const { status, body } = await call(path, { token });
    assert.equal(status, 200, path);
    assert.ok(Array.isArray(body.data), `${path}: data is an array`);
    assert.ok("next_cursor" in body, `${path}: has next_cursor`);
    assert.equal(Object.keys(body).sort().join(","), "data,next_cursor", `${path}: only data and next_cursor`);
  }
  // The summary items carry what /app reads.
  const { body: lists } = await call("/me/lists?include=summary", { token });
  for (const key of ["items", "done", "waiting", "latest", "note"]) assert.ok(key in lists.data[0].summary, `summary.${key}`);
});
