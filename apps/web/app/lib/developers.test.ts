import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseBlocks, parseInline, readGuide } from "./developers.ts";

const md = readFileSync(new URL("../content/developers.md", import.meta.url), "utf8");

test("the guide reads into three ways in, its sections and code in several languages", () => {
  const g = readGuide(md);
  assert.equal(g.title, "Build with The Want MCP");
  assert.equal(g.ways.length, 3);
  assert.deepEqual(g.ways.map((w) => w.href), ["#1-no-account-first", "#2-sign-in", null]);
  assert.ok(g.ways[2].text.includes("https://wantmcp.com/connect/key?app="), "the key way names /connect/key");
  const noAccount = g.code!.groups.find((x) => x.topic === "no account first")!;
  assert.deepEqual(noAccount.variants.map((v) => v.lang), ["curl", "TypeScript", "Swift"]);
  assert.deepEqual(g.code!.groups.find((x) => x.topic.startsWith("sign in"))!.variants.map((v) => v.lang), ["TypeScript", "Swift"]);
});

test("nothing is lost: every code block and table row of the source is on the page", () => {
  const g = readGuide(md);
  const all = [...g.intro, ...g.sections.flatMap((s) => s.blocks), ...g.code!.groups.flatMap((x) => x.variants.flatMap((v) => v.blocks))];
  const fences = md.match(/^```/gm)!.length / 2;
  assert.equal(all.filter((b) => b.kind === "code").length, fences);
  for (const b of all.filter((b) => b.kind === "code")) assert.ok(md.includes(b.kind === "code" ? b.text : ""), "code is copied exactly");
  const tableRows = md.split("\n").filter((l) => l.startsWith("|") && !/^\|[-| ]+\|$/.test(l)).length;
  assert.equal(all.reduce((n, b) => n + (b.kind === "table" ? b.rows.length + 1 : 0), 0), tableRows);
});

test("tables keep escaped pipes in a cell; inline bold may hold code", () => {
  const [t] = parseBlocks('| a | b |\n|---|---|\n| x | `"open" \\| "done"` |');
  assert.deepEqual(t.kind === "table" && t.rows[0], ["x", '`"open" | "done"`']);
  assert.deepEqual(parseInline("**`key`** is it"), [{ kind: "bold", parts: [{ kind: "code", text: "key" }] }, { kind: "text", text: " is it" }]);
});
