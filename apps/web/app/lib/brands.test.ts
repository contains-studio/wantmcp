import assert from "node:assert/strict";
import { test } from "node:test";
import { clientKind, liveBrands, MSGBLAST_WANTS_RELEASED, msgblastNote } from "./brands.ts";

/** Owner, 27 Nov 2026: one constant flips msgblast from "not out yet" to "out" the day 0.12.0 ships. */
test("before msgblast 0.12.0: the note leads its steps, and it is not in the home row", () => {
  assert.equal(msgblastNote(false), "Wants arrives in msgblast 0.12.0. The download today (0.11.1) doesn't have it yet.");
  assert.ok(!liveBrands(false).some((b) => b.id === "msgblast"));
});

test("after: no note, and msgblast is in the home row", () => {
  assert.equal(msgblastNote(true), null);
  assert.ok(liveBrands(true).some((b) => b.id === "msgblast"));
  assert.equal(liveBrands(true).length, liveBrands(false).length + 1);
});

test("today the switch is off", () => {
  assert.equal(MSGBLAST_WANTS_RELEASED, false);
});

test("an app takes a plain key; a chat agent, the prompt; a typed name, the key", () => {
  assert.deepEqual(clientKind("msgblast"), { kind: "app", pasteInto: "msgblast › Wants › Connect list" });
  assert.equal(clientKind("Claude").kind, "chat");
  assert.equal(clientKind("claude code").kind, "chat");
  assert.equal(clientKind("Pantry Pal").kind, "app");
});
