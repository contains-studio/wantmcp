import assert from "node:assert/strict";
import { test } from "node:test";
import { appLabel, connectKeyPath, listParam } from "./connect-key.ts";

/** SPEC 24.2: `app` is only a label; nothing from the address becomes a return address. */
test("an app label is 1–40 letters, digits, spaces and .-_; anything else is none", () => {
  assert.equal(appLabel("msgblast"), "msgblast");
  assert.equal(appLabel("  Pantry   Pal 2.0 "), "Pantry Pal 2.0");
  assert.equal(appLabel("my_app-x"), "my_app-x");
  for (const bad of [null, "", "   ", "...", "a".repeat(41), "<b>hi</b>", "app?x=1", "https://evil.example", "naïve", "a/b"]) assert.equal(appLabel(bad), null, String(bad));
});

test("a list id is the server's shape; the path is rebuilt from cleaned values only", () => {
  assert.equal(listParam("lst_abc-1"), "lst_abc-1");
  assert.equal(listParam("../x"), null);
  assert.equal(connectKeyPath("Pantry Pal", "lst_a"), "/connect/key?app=Pantry+Pal&list=lst_a");
  assert.equal(connectKeyPath(null, null), "/connect/key");
});
