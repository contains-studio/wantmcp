import assert from "node:assert/strict";
import test from "node:test";
import { updatesOptInDefault } from "./consent.ts";

test("the new-features box starts unticked in the EU, EEA, UK and Switzerland, ticked elsewhere", () => {
  for (const c of ["DE", "FR", "IE", "NO", "IS", "LI", "GB", "CH", "de"]) assert.equal(updatesOptInDefault(c), false, c);
  for (const c of ["US", "CA", "AU", "JP", "BR", "IN", "XX"]) assert.equal(updatesOptInDefault(c), true, c);
  assert.equal(updatesOptInDefault(null), true, "unknown (local dev, tests) counts as not in the list");
  assert.equal(updatesOptInDefault(undefined), true);
  assert.equal(updatesOptInDefault(""), true);
});
