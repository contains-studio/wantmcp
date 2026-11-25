import assert from "node:assert/strict";
import test from "node:test";
import { priceChangeLabel } from "./prices.ts";

test("a price drop reads as the amount and the share", () => {
  assert.equal(priceChangeLabel(799.99, 649.99, "USD"), "−$150.00 (−19%)");
  assert.equal(priceChangeLabel(100, 110, "USD"), "+$10.00 (+10%)");
});

test("no change says nothing", () => {
  assert.equal(priceChangeLabel(649.99, 649.99, "USD"), null);
});
