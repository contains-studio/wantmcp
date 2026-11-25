import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultCurrency, itemCurrency, listCurrency, moneyPlaceholder } from "./currency.ts";

const priced = (currency: string) => ({ current_price: { currency } });
const gbpList = [{ entries: [{ current_price: null }, priced("GBP")] }, { entries: [] }];

test("a list's own currency wins over the person's and USD", () => {
  const list = listCurrency(gbpList);
  assert.equal(list, "GBP");
  // Mark bought or add a product on an item with no prices yet: still the list's currency.
  assert.equal(defaultCurrency([itemCurrency(gbpList[1], list)], "USD"), "GBP");
  assert.equal(defaultCurrency([itemCurrency(gbpList[1], list)], null), "GBP");
});

test("an item's own prices win over the list's", () => {
  assert.equal(itemCurrency({ entries: [priced("EUR")] }, "GBP"), "EUR");
});

test("an existing price's currency wins over every hint", () => {
  assert.equal(defaultCurrency(["CAD", "GBP"], "USD"), "CAD");
});

test("no prices anywhere: the person's currency, else USD", () => {
  assert.equal(listCurrency([{ entries: [] }]), undefined);
  assert.equal(defaultCurrency([undefined, null], "EUR"), "EUR");
  assert.equal(defaultCurrency([undefined], null), "USD");
});

test("placeholders follow the currency", () => {
  assert.equal(moneyPlaceholder("under {200}", "USD"), "under $200");
  assert.equal(moneyPlaceholder("under {200}", "GBP"), "under £200");
  assert.equal(moneyPlaceholder("under {200}", "CHF"), "under 200 CHF");
});
