/**
 * Builds the skill's reference files (skills/list-want-mcp/reference/*.md at the repo root) from the guides The Want MCP
 * server serves, so they are never copied by hand. Reads only: initialize, resources/read and tools/list, no account.
 *
 *   node scripts/build-skill.mjs            # write the reference files from the live server
 *   node scripts/build-skill.mjs --check    # fail if the checked-in files differ from the live guides, or if SKILL.md
 *                                           # names something that is neither a tool nor a tool's field on the server (CI runs this; it skips, exit 0, when
 *                                           # the server can't be reached, like check:contract)
 *   MCP_URL=http://localhost:8787/mcp node scripts/build-skill.mjs --check
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { GUIDES, SKILL_NAME, guideToReference } from "../app/lib/skill.ts";

const CHECK = process.argv.includes("--check");
const MCP = process.env.MCP_URL ?? "https://mcp.wantmcp.com/mcp";
const DIR = fileURLToPath(new URL(`../../../skills/${SKILL_NAME}/`, import.meta.url));

let session;
let nextId = 1;
async function rpc(method, params) {
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (session) headers["mcp-session-id"] = session;
  const id = method.startsWith("notifications/") ? undefined : nextId++;
  const res = await fetch(MCP, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }), signal: AbortSignal.timeout(15_000) });
  session = res.headers.get("mcp-session-id") ?? session;
  if (id === undefined) return null;
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const text = await res.text();
  const json = (res.headers.get("content-type") ?? "").includes("event-stream")
    ? JSON.parse(text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).pop())
    : JSON.parse(text);
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}

try {
  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "wantmcp-skill-build", version: "1" } });
  await rpc("notifications/initialized");
} catch (err) {
  if (!CHECK) throw err;
  console.log(`skip: can't reach ${MCP} (${err.message})`);
  process.exit(0);
}

let failures = 0;
for (const name of GUIDES) {
  const read = await rpc("resources/read", { uri: `skill://${name}/SKILL.md` });
  const want = guideToReference(name, read.contents[0].text);
  const path = `${DIR}reference/${name}.md`;
  if (!CHECK) {
    await writeFile(path, want);
    console.log(`wrote reference/${name}.md`);
    continue;
  }
  const have = await readFile(path, "utf8").catch(() => "");
  if (have === want) console.log(`ok   reference/${name}.md matches the live guide`);
  else {
    failures++;
    console.log(`FAIL reference/${name}.md differs from the live guide: run pnpm skill:build`);
  }
}

if (CHECK) {
  // Every `name` SKILL.md puts in backticks must be a tool, or a field of a tool's arguments or result, on the server.
  const { tools } = await rpc("tools/list", {});
  const names = new Set(tools.map((t) => t.name));
  // Fields of the tools' arguments and results (price_source, status_url…) count too.
  const fields = new Set(tools.flatMap((t) => [t.inputSchema, t.outputSchema].flatMap((sch) => Object.keys(sch?.properties ?? {}))));
  const skill = await readFile(`${DIR}SKILL.md`, "utf8");
  const named = new Set([...skill.matchAll(/`([a-z]+(?:_[a-z]+)*)`/g)].map((m) => m[1]));
  const NOT_TOOLS = new Set(["price_source", "how_to_work", "text_by", "retailer_page", "aggregator", "search", "user", "wantmcp"]);
  for (const n of named) {
    if (NOT_TOOLS.has(n)) continue;
    if (names.has(n) || fields.has(n)) continue;
    failures++;
    console.log(`FAIL SKILL.md names \`${n}\`, which is neither a tool nor a tool's field on the server`);
  }
  if (!failures) console.log(`ok   every tool and field SKILL.md names is on the server (${[...named].filter((n) => !NOT_TOOLS.has(n)).length} checked)`);
}

process.exit(failures ? 1 : 0);
