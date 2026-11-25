/** The mock's POST /auth/verify, as the API (server main 9a86769): updates_opt_in applies only when it creates the account. */
import assert from "node:assert/strict";
import test from "node:test";
import { handleMockRequest, resetMockStore } from "./api.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = async (path: string, body: unknown): Promise<any> =>
  (await handleMockRequest(new Request(`http://mock/v1${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))).json();
const verify = async (email: string, optIn: boolean) => {
  await post("/auth/code", { email });
  return post("/auth/verify", { email, code: "123456", updates_opt_in: optIn });
};

test("a new account takes the choice and says created; signing in again never changes it", async () => {
  resetMockStore();
  const first = await verify("verify-new@example.com", true);
  assert.equal(first.created, true);
  assert.equal(first.user.updates_opt_in, true);
  const again = await verify("verify-new@example.com", false);
  assert.equal(again.created, false);
  assert.equal(again.user.updates_opt_in, true, "an existing account's choice is not changed by signing in");
  // The demo person said no; a ticked box at sign-in leaves it no.
  const demo = await verify("demo@example.com", true);
  assert.equal(demo.created, false);
  assert.equal(demo.user.updates_opt_in, false);
});
