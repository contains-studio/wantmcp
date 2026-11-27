import assert from "node:assert/strict";
import { test } from "node:test";
import { agentWroteName, runsPer28 } from "./routines.ts";

test("a name is shown as an agent's only when the server says an agent wrote it (the default is the server's)", () => {
  assert.equal(agentWroteName({ name_by: "agent" }), true);
  assert.equal(agentWroteName({ name_by: "server" }), false);
  assert.equal(agentWroteName({ name_by: "person" }), false);
});

test("runs in 28 days, to tell when a schedule runs more often", () => {
  assert.equal(runsPer28({ every: "day" }), 28);
  assert.equal(runsPer28({ every: "week", days: ["mon", "thu"] }), 8);
  assert.ok(runsPer28({ every: "week", interval: 2, days: ["mon"] }) < runsPer28({ every: "week", days: ["mon"] }));
});
