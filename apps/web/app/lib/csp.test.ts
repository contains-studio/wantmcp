import assert from "node:assert/strict";
import { test } from "node:test";
import { contentSecurityPolicy } from "./csp.ts";

/** SPEC 23: Cloudflare Web Analytics, injected by Cloudflare: its two hosts are allowed, and nothing wider. */
test("the CSP allows Cloudflare Web Analytics and nothing wider", () => {
  const csp = contentSecurityPolicy("abc", true);
  const directive = (name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `))!.split(/\s+/).slice(1);
  assert.deepEqual(directive("script-src"), ["'self'", "'nonce-abc'", "https://static.cloudflareinsights.com"]);
  assert.deepEqual(directive("connect-src"), ["'self'", "https://cloudflareinsights.com"]);
  assert.ok(!/\*/.test(csp), "no wildcards");
});
