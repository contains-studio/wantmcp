/** The mock's /me/skills routes follow SPEC 14.2: a web session only, the cap's own sentence, slugs that never clash. */
import assert from "node:assert/strict";
import test from "node:test";
import { handleMockRequest, resetMockStore } from "./api.ts";

const call = async (method: string, path: string, token?: string, body?: unknown) => {
  const res = await handleMockRequest(
    new Request(`http://mock/v1${path}`, {
      method,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

async function session(email: string) {
  await call("POST", "/auth/code", undefined, { email });
  return (await call("POST", "/auth/verify", undefined, { email, code: "123456" })).body.token as string;
}

test("skills: create, list oldest first, edit, turn off, delete", async () => {
  resetMockStore();
  const t = await session(`skills-${Date.now()}@example.com`);
  const a = await call("POST", "/me/skills", t, { title: "How I shop", body: "Size M." });
  assert.equal(a.status, 201);
  assert.equal(a.body.name, "how-i-shop");
  assert.equal(a.body.enabled, true);
  assert.equal(a.body.description, "");
  assert.match(a.body.uri, /^skill:\/\/how-i-shop\/SKILL\.md$/);
  const b = await call("POST", "/me/skills", t, { title: "How I shop", body: "Another." });
  assert.equal(b.body.name, "how-i-shop-2", "names never clash");
  const list = await call("GET", "/me/skills", t);
  assert.deepEqual(Object.keys(list.body), ["data"]);
  assert.deepEqual(list.body.data.map((k: { id: string }) => k.id), [a.body.id, b.body.id]);
  const edited = await call("PATCH", `/me/skills/${a.body.id}`, t, { title: "How I really shop", enabled: false });
  assert.equal(edited.body.title, "How I really shop");
  assert.equal(edited.body.name, "how-i-shop", "the name stays when the title changes");
  assert.equal(edited.body.enabled, false);
  assert.equal((await call("DELETE", `/me/skills/${b.body.id}`, t)).status, 204);
  assert.equal((await call("GET", "/me/skills", t)).body.data.length, 1);
});

test("skills: never a built-in skill's name; field limits named", async () => {
  resetMockStore();
  const t = await session(`builtin-${Date.now()}@example.com`);
  const k = await call("POST", "/me/skills", t, { title: "Shop a want list", body: "x" });
  assert.notEqual(k.body.name, "shop-a-want-list");
  assert.match((await call("POST", "/me/skills", t, { title: "x".repeat(81), body: "x" })).body.error.message, /title.*80/);
  assert.match((await call("POST", "/me/skills", t, { title: "t", body: "x", description: "d".repeat(301) })).body.error.message, /description.*300/);
  assert.match((await call("POST", "/me/skills", t, { title: "t", body: "x".repeat(20001) })).body.error.message, /body.*20000/);
});

test("skills: the cap says how to add another", async () => {
  resetMockStore();
  const t = await session(`cap-${Date.now()}@example.com`);
  for (let i = 0; i < 20; i++) assert.equal((await call("POST", "/me/skills", t, { title: `Skill ${i}`, body: "x" })).status, 201);
  const over = await call("POST", "/me/skills", t, { title: "One more", body: "x" });
  assert.equal(over.body.error.code, "rate_limited");
  assert.equal(over.body.error.message, "You have 20 skills. Delete one to add another.");
});

test("skills: only a signed-in person, and only their own", async () => {
  resetMockStore();
  const me = await session(`mine-${Date.now()}@example.com`);
  const other = await session(`other-${Date.now()}@example.com`);
  const k = await call("POST", "/me/skills", me, { title: "Mine", body: "x" });
  assert.equal((await call("PATCH", `/me/skills/${k.body.id}`, other, { title: "Stolen" })).status, 404);
  assert.equal((await call("DELETE", `/me/skills/${k.body.id}`, other)).status, 404);
  // A write key (an agent credential) is refused, even for reading.
  const agent = await call("GET", "/me/skills", "wk_democodexkeyaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(agent.status, 403);
  assert.equal(agent.body.error.message, "Only a signed-in person can change skills.");
  assert.equal((await call("GET", "/me/skills")).status, 401);
});
