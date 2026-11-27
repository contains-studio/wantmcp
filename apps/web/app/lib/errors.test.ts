import assert from "node:assert/strict";
import test from "node:test";
import { friendlyError } from "./errors.ts";

const e = (code: string, status = 400, message = "", details?: unknown) => ({ code, status, message, details });

test("every kind of failure gets its own plain sentence", () => {
  assert.equal(friendlyError(e("rate_limited", 429, "x", { retry_after: 300 })), "Too many tries for now. Try again in 5 minutes.");
  assert.equal(friendlyError(e("rate_limited", 429)), "Too many tries for now. Wait a few minutes, then try again.");
  assert.equal(friendlyError(e("email_unavailable", 503)), "We can't send email right now. Try again in a little while.");
  assert.equal(friendlyError(e("forbidden", 403, "Only the list owner can do that")), "Only the list owner can do that");
  assert.equal(friendlyError(e("forbidden", 403, "API error 403")), "You don't have permission to do that on this list.");
  assert.equal(friendlyError(e("network", 503)), "Can't reach the server. Check your connection and try again.");
  assert.equal(friendlyError(e("internal", 500, "boom")), "Something went wrong on our side. Try again in a moment.");
  assert.equal(friendlyError(e("invalid", 400, "Title is required")), "Title is required");
  // Bug audit, 27 Nov 2026: the validator's field-name wording, said plainly.
  assert.equal(friendlyError(e("invalid", 400, "email is not valid")), "That doesn't look like an email address. Check it and try again.");
  assert.equal(friendlyError(e("invalid_request", 400, "email must be a valid address")), "That doesn't look like an email address. Check it and try again.");
});
