import assert from "node:assert/strict";
import { test } from "node:test";
import { flipped, frameAncestors, frameAppearance, framePath, isExhibitFrame, withFlip } from "./exhibits.ts";
import { contentSecurityPolicy } from "./csp.ts";

const directive = (csp: string, name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
const FRAME = "/explorations/redesigning-the-looks/frame";

test("only exhibit frames may be framed, and only by this site", () => {
  for (const path of ["/", "/themes", "/themes/sheet", "/explorations", "/explorations/redesigning-the-looks", "/l/lst_x", "/app", "/login", `${FRAME}d`, "/themes/compare/frame/next/sheet"]) {
    assert.equal(isExhibitFrame(path), false, path);
    assert.equal(frameAncestors(path), "'none'", path);
  }
  assert.equal(frameAncestors(`${FRAME}/after/sheet`), "'self'");
  assert.equal(frameAncestors(`${FRAME}/before/board--christmas`), "'self'");
});

test("the policy is unchanged for every other page", () => {
  const before = contentSecurityPolicy("abc", true);
  assert.equal(directive(before, "frame-ancestors"), "frame-ancestors 'none'");
  assert.equal(contentSecurityPolicy("abc", true, frameAncestors("/l/lst_x")), before);
  const frame = contentSecurityPolicy("abc", true, frameAncestors(`${FRAME}/after/sheet`));
  assert.equal(directive(frame, "frame-ancestors"), "frame-ancestors 'self'");
  assert.equal(frame.replace("frame-ancestors 'self'", "frame-ancestors 'none'"), before, "nothing else differs");
});

test("an appearance is forced for exhibit frames only", () => {
  const at = (u: string) => frameAppearance(new URL(u, "https://wantmcp.com"));
  assert.equal(at(`${FRAME}/after/sheet?mode=dark`), "dark");
  assert.equal(at(`${FRAME}/before/sheet?mode=light`), "light");
  assert.equal(at(`${FRAME}/before/sheet`), null);
  assert.equal(at(`${FRAME}/before/sheet?mode=sepia`), null);
  assert.equal(at("/explorations/redesigning-the-looks?mode=dark"), null);
  assert.equal(at("/themes/sheet?mode=dark"), null);
  assert.equal(at("/l/lst_x?mode=dark"), null);
  assert.equal(at("/?mode=dark"), null);
});

test("frame addresses", () => {
  assert.equal(framePath("after", "sheet"), `${FRAME}/after/sheet`);
  assert.equal(framePath("before", "doc", { format: "research", mode: "dark" }), `${FRAME}/before/doc?format=research&mode=dark`);
  assert.equal(framePath("after", "heat", { format: "tasks", head: true }), `${FRAME}/after/heat?format=tasks&head=1`);
});

test("a tick in an exhibit lives in the frame's address and nowhere else", () => {
  const u = (s: string) => new URL(`https://wantmcp.com${FRAME}/after/today${s}`);
  assert.equal(withFlip(u("?format=tasks"), "itm_sample_2"), `${FRAME}/after/today?format=tasks&flip=itm_sample_2`);
  assert.equal(withFlip(u("?format=tasks&flip=itm_sample_2"), "itm_sample_3"), `${FRAME}/after/today?format=tasks&flip=itm_sample_2%2Citm_sample_3`);
  assert.equal(withFlip(u("?format=tasks&flip=itm_sample_2"), "itm_sample_2"), `${FRAME}/after/today?format=tasks`);
  assert.deepEqual(flipped(new URLSearchParams("flip=itm_sample_1,<script>,itm_sample_2")), ["itm_sample_1", "itm_sample_2"]);
});
