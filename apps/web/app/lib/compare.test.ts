import assert from "node:assert/strict";
import { test } from "node:test";
import { frameAncestors, frameAppearance, framePath, isCompareFrame } from "./compare.ts";
import { contentSecurityPolicy } from "./csp.ts";

const directive = (csp: string, name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));

test("only compare frames may be framed, and only by this site", () => {
  for (const path of ["/", "/themes", "/themes/sheet", "/themes/compare", "/l/lst_x", "/app", "/login", "/themes/compare/framed"]) {
    assert.equal(isCompareFrame(path), false, path);
    assert.equal(frameAncestors(path), "'none'", path);
  }
  assert.equal(frameAncestors("/themes/compare/frame/next/sheet"), "'self'");
  assert.equal(frameAncestors("/themes/compare/frame/current/board--christmas"), "'self'");
});

test("the policy is unchanged for every other page", () => {
  const before = contentSecurityPolicy("abc", true);
  assert.equal(directive(before, "frame-ancestors"), "frame-ancestors 'none'");
  assert.equal(contentSecurityPolicy("abc", true, frameAncestors("/l/lst_x")), before);
  const frame = contentSecurityPolicy("abc", true, frameAncestors("/themes/compare/frame/next/sheet"));
  assert.equal(directive(frame, "frame-ancestors"), "frame-ancestors 'self'");
  assert.equal(frame.replace("frame-ancestors 'self'", "frame-ancestors 'none'"), before, "nothing else differs");
});

test("an appearance is forced for compare frames only", () => {
  const at = (u: string) => frameAppearance(new URL(u, "https://wantmcp.com"));
  assert.equal(at("/themes/compare/frame/next/sheet?mode=dark"), "dark");
  assert.equal(at("/themes/compare/frame/current/sheet?mode=light"), "light");
  assert.equal(at("/themes/compare/frame/current/sheet"), null);
  assert.equal(at("/themes/compare/frame/current/sheet?mode=sepia"), null);
  assert.equal(at("/themes/sheet?mode=dark"), null);
  assert.equal(at("/l/lst_x?mode=dark"), null);
  assert.equal(at("/?mode=dark"), null);
});

test("frame addresses", () => {
  assert.equal(framePath("next", "sheet", {}), "/themes/compare/frame/next/sheet");
  assert.equal(framePath("current", "doc", { format: "research", mode: "dark" }), "/themes/compare/frame/current/doc?format=research&mode=dark");
});
