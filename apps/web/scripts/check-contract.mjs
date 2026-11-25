/**
 * Does the mock still answer in the real API's shapes? Fetches the API's OpenAPI document and, for the routes the web
 * app reads, compares each response's top-level keys with what the mock returns. Paged routes must be
 * { data, next_cursor }. Skips (exit 0) when the API can't be reached, so it never blocks an offline run.
 *
 *   node scripts/check-contract.mjs [https://api.wantmcp.com/v1/openapi.json]
 */
import { handleMockRequest, resetMockStore } from "../mock/api.ts";

const SPEC = process.argv[2] ?? "https://api.wantmcp.com/v1/openapi.json";

let spec;
try {
  const res = await fetch(SPEC, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  spec = await res.json();
} catch (err) {
  console.log(`skip: can't read ${SPEC} (${err.message})`);
  process.exit(0);
}

const ref = (s) => (s?.$ref ? ref(spec.components.schemas[s.$ref.split("/").pop()]) : s);
/** The object variant of a response schema (an anyOf may also allow the older plain array). */
function shapes(schema) {
  const s = ref(schema);
  if (!s) return [];
  if (s.anyOf || s.oneOf) return (s.anyOf ?? s.oneOf).flatMap(shapes);
  return [s];
}

const call = async (path, token) => {
  const res = await handleMockRequest(new Request(`http://mock/v1${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} }));
  return res.status === 204 ? null : res.json();
};

resetMockStore();
await handleMockRequest(new Request("http://mock/v1/auth/code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "demo@example.com" }) }));
const { token } = await (
  await handleMockRequest(new Request("http://mock/v1/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "demo@example.com", code: "123456" }) }))
).json();

// The routes the web app reads, with a mock path to call. Paged routes first.
const ROUTES = [
  ["/feed", "/feed", true],
  ["/lists", "/lists", true],
  ["/me/feed", "/me/feed", true],
  ["/me/lists", "/me/lists?include=summary", true],
  ["/lists/{id}/comments", "/lists/lst_desk2026/comments", true],
  ["/lists/{id}/suggestions", "/lists/lst_desk2026/suggestions", true],
  ["/me", "/me", false],
  ["/lists/{id}", "/lists/lst_desk2026", false],
  ["/lists/{id}/access", "/lists/lst_desk2026/access", false],
];

let failures = 0;
for (const [specPath, mockPath, paged] of ROUTES) {
  const op = spec.paths[specPath]?.get;
  if (!op) {
    console.log(`note ${specPath}: not in the API's document`);
    continue;
  }
  const schema = op.responses?.["200"]?.content?.["application/json"]?.schema;
  const objects = shapes(schema).filter((s) => s.type === "object" || s.properties);
  const body = await call(mockPath, token);
  const got = body && !Array.isArray(body) ? Object.keys(body).sort() : ["(array)"];
  if (paged) {
    const ok = objects.some((o) => o.properties?.data && o.properties?.next_cursor) && got.join(",") === "data,next_cursor";
    console.log(`${ok ? "ok  " : "FAIL"} ${specPath}: paged { data, next_cursor } (mock: ${got.join(", ")})`);
    if (!ok) failures++;
    continue;
  }
  const known = new Set(objects.flatMap((o) => Object.keys(o.properties ?? {})));
  const required = new Set(objects.flatMap((o) => o.required ?? []));
  const extra = got.filter((k) => known.size && !known.has(k));
  const missing = [...required].filter((k) => !got.includes(k));
  const ok = !missing.length;
  console.log(`${ok ? "ok  " : "FAIL"} ${specPath}${missing.length ? `: mock lacks ${missing.join(", ")}` : ""}${extra.length ? ` (mock-only keys: ${extra.join(", ")})` : ""}`);
  if (!ok) failures++;
}
if (failures) {
  console.log(`\n${failures} route(s) differ from the API.`);
  process.exit(1);
}
console.log("\nThe mock matches the API's shapes for every route checked.");
