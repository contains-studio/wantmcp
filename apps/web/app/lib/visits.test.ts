import assert from "node:assert/strict";
import { test } from "node:test";
import { refHost, skipVisit, sourceOf, visitPath, visitTag } from "./visits.ts";

test("pages are counted as their route pattern, never a real id", () => {
  assert.equal(visitPath("/"), "/");
  assert.equal(visitPath("/l/lst_abc123"), "/l/:id");
  assert.equal(visitPath("/for/black-friday-shopping-list"), "/for/:slug");
  assert.equal(visitPath("/app/lists/lst_x/settings"), "/app/lists/:id/settings");
  assert.equal(visitPath("/claim"), "/claim");
  assert.equal(visitPath("/claim/clm_1"), "/claim/:token");
  assert.equal(visitPath("/connect/"), "/connect");
  // SPEC 24 pages (server 19266f5).
  assert.equal(visitPath("/connect/key"), "/connect/key");
  assert.equal(visitPath("/developers"), "/developers");
  assert.equal(visitPath("/developers.md"), "/developers.md");
  assert.equal(visitPath("/l/lst_x.data"), "/l/:id"); // never reached: data requests aren't HTML
  assert.equal(visitPath("/assets/app.js"), null);
  assert.equal(visitPath("/og/l/lst_x.png"), null);
  assert.equal(visitPath("/nope"), null);
});

test("the referrer is a host: lowercased, no www., direct when absent, our own host for a click within the site", () => {
  assert.equal(refHost(null, "wantmcp.com"), "direct");
  assert.equal(refHost("https://WWW.News.YCombinator.com/item?id=1", "wantmcp.com"), "news.ycombinator.com");
  assert.equal(refHost("https://wantmcp.com/for", "wantmcp.com"), "wantmcp.com");
  assert.equal(refHost("https://www.wantmcp.com/", "wantmcp.com"), "wantmcp.com");
  assert.equal(refHost("not a url", "wantmcp.com"), "direct");
});

test("?ref= is a tag only when it is plain", () => {
  assert.equal(visitTag(new URL("https://wantmcp.com/?ref=x-post")), "x-post");
  assert.equal(visitTag(new URL("https://wantmcp.com/?ref=Bad%20Tag")), null);
  assert.equal(visitTag(new URL("https://wantmcp.com/?ref=" + "a".repeat(33))), null);
});

test("our checks, headless browsers and bots are skipped", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  assert.equal(skipVisit(h({ "user-agent": safari })), false);
  assert.equal(skipVisit(h({ "user-agent": safari, "x-wantmcp-check": "1" })), true);
  assert.equal(skipVisit(h({ "user-agent": "Mozilla/5.0 HeadlessChrome/120" })), true);
  assert.equal(skipVisit(h({ "user-agent": "Googlebot/2.1" })), true);
  assert.equal(skipVisit(h({ "user-agent": "curl/8.0" })), true);
  assert.equal(skipVisit(h({})), true);
});

test("the sign-up source is the tag, else the referring host", () => {
  assert.equal(sourceOf(new URL("https://wantmcp.com/?ref=x-post"), new Headers({ referer: "https://t.co/x" })), "x-post");
  assert.equal(sourceOf(new URL("https://wantmcp.com/"), new Headers({ referer: "https://www.reddit.com/r/x" })), "reddit.com");
  assert.equal(sourceOf(new URL("https://wantmcp.com/"), new Headers()), null);
  assert.equal(sourceOf(new URL("https://wantmcp.com/l/x"), new Headers({ referer: "https://wantmcp.com/" })), null);
});
