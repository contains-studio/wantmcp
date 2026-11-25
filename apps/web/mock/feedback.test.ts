/** The mock's POST /feedback is exactly SPEC 16.1: kind, text, expected?, about?, list? → { id, received: true }. */
import assert from "node:assert/strict";
import test from "node:test";
import { handleMockRequest, resetMockStore } from "./api.ts";

const send = (body: unknown) =>
  handleMockRequest(new Request("http://mock/v1/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

test("each kind is received with no credential; the result is { id, received }", async () => {
  resetMockStore();
  for (const kind of ["bug", "expectation", "request"]) {
    const res = await send({ kind, text: `A ${kind}`, about: "/claim" });
    assert.equal(res.status, 201);
    const out: any = await res.json(); // eslint-disable-line @typescript-eslint/no-explicit-any
    assert.deepEqual(Object.keys(out).sort(), ["id", "received"]);
    assert.match(out.id, /^fbk_/);
    assert.equal(out.received, true);
  }
});

test("validation: kind, text 1–2,000, expected up to 1,000, about up to 80", async () => {
  resetMockStore();
  assert.equal((await send({ kind: "praise", text: "x" })).status, 400);
  assert.equal((await send({ kind: "bug", text: " " })).status, 400);
  assert.equal((await send({ kind: "bug", text: "x".repeat(2001) })).status, 400);
  assert.equal((await send({ kind: "bug", text: "x", expected: "y".repeat(1001) })).status, 400);
  assert.equal((await send({ kind: "bug", text: "x", about: "z".repeat(81) })).status, 400);
  assert.equal((await send({ kind: "bug", text: "x".repeat(2000), expected: "y".repeat(1000), about: "z".repeat(80) })).status, 201);
});

test("the limit answers 429 with the server's sentence", async () => {
  resetMockStore();
  const res = await send({ kind: "bug", text: "mock: rate limit" });
  assert.equal(res.status, 429);
  const out: any = await res.json(); // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.equal(out.error?.code ?? out.code, "rate_limited");
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; body: any }> => {
  const res = await handleMockRequest(
    new Request(`http://mock/v1${path}`, {
      method,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const t = await res.text();
  return { status: res.status, body: t ? JSON.parse(t) : null };
};
async function session(email: string) {
  await call("POST", "/auth/code", undefined, { email });
  return (await call("POST", "/auth/verify", undefined, { email, code: "123456" })).body.token as string;
}

test("SPEC 16.2: feedback is an outsider's task, held: writers see it, readers and counts do not, until a person accepts it", async () => {
  resetMockStore();
  await send({ kind: "bug", text: "Held for review", about: "/claim" });
  const team = await session("team@example.com");
  const mine = await call("GET", "/lists/lst_feedback", team);
  const held = mine.body.items.filter((i: { pending_review: boolean }) => i.pending_review);
  assert.deepEqual(held.map((i: { text: string }) => i.text).sort(), ["Bug: Held for review", "Request: Let me reorder wants by dragging them"]);
  assert.equal(held[0].text_by, "outsider");
  assert.equal(held[0].created_by.kind, "outside");

  // A reader (signed out, or signed in without write access) never receives one, and the count leaves them out.
  for (const token of [undefined, await session(`reader-${Date.now()}@example.com`)]) {
    const r = await call("GET", "/lists/lst_feedback", token);
    assert.equal(r.status, 200);
    assert.equal(r.body.items.filter((i: { pending_review: boolean }) => i.pending_review).length, 0);
    assert.ok(!JSON.stringify(r.body).includes("Held for review"));
    assert.equal(r.body.item_count, 1);
  }

  // Accepting: a person writer only; it then shows to readers like any other, still marked as an outsider's words.
  const id = held.find((i: { text: string }) => i.text === "Bug: Held for review").id;
  assert.equal((await call("POST", `/items/${id}/accept`)).status, 401);
  const ok = await call("POST", `/items/${id}/accept`, team);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.pending_review, false);
  assert.equal(ok.body.text_by, "outsider");
  const after = await call("GET", "/lists/lst_feedback");
  assert.ok(after.body.items.some((i: { text: string }) => i.text === "Bug: Held for review"));
  assert.equal(after.body.item_count, 2);
});
