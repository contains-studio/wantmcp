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

// Every route the web app calls, by method (grep api<…>(request, … in app/ and workers/). Each must exist in the API's
// document, so a renamed or removed route is caught before a deploy.
const CALLS = {
  GET: ["/me/skills", "/me", "/me/invites", "/me/agent-keys", "/me/questions", "/me/lists", "/me/activity", "/me/traffic", "/me/agents", "/feed", "/lists", "/lists/{id}",
    "/lists/{id}/members", "/lists/{id}/agents", "/lists/{id}/prices", "/lists/{id}/access", "/lists/{id}/comments", "/lists/{id}/suggestions",
    "/entries/{id}/prices", "/invites/{token}", "/claims/{claim_token}", "/unsubscribe/{token}"],
  POST: ["/auth/code", "/auth/verify", "/auth/logout", "/claims/lookup", "/claims/claim", "/invites/lookup", "/invites/accept", "/invites/{token}/accept",
    "/claims/{claim_token}", "/me/invites/{list_id}/accept", "/lists", "/lists/{id}/handover", "/lists/{id}/invites", "/lists/{id}/members", "/lists/{id}/keys",
    "/lists/{id}/items", "/items/{id}/entries", "/items/{id}/purchase", "/items/{id}/status", "/entries/{id}/promote", "/entries/{id}/reject",
    "/entries/{id}/prices", "/questions/{id}/answer", "/comments", "/reports", "/unsubscribe", "/me/skills", "/feedback", "/items/{id}/accept"],
  PATCH: ["/me", "/lists/{id}", "/items/{id}", "/entries/{id}", "/me/skills/{id}"],
  DELETE: ["/me", "/me/agent-keys/{id}", "/agents/{id}", "/lists/{id}", "/lists/{id}/members/{member_id}", "/items/{id}", "/items/{id}/purchase", "/entries/{id}", "/comments/{id}", "/me/skills/{id}"],
};

// Responses the web reads, called on the mock and compared with the document. Paged routes must be { data, next_cursor }.
const entryId = (await call("/lists/lst_desk2026", token)).items.flatMap((i) => i.entries)[0].id;
const ROUTES = [
  ["/feed", "/feed", true],
  ["/lists", "/lists", true],
  ["/me/activity", "/me/activity", true],
  ["/me/traffic", "/me/traffic", false],
  ["/me/lists", "/me/lists?include=summary", true],
  ["/lists/{id}/comments", "/lists/lst_desk2026/comments", true],
  ["/lists/{id}/suggestions", "/lists/lst_desk2026/suggestions", true],
  ["/me", "/me", false],
  ["/me/questions", "/me/questions", false],
  ["/lists/{id}", "/lists/lst_desk2026", false],
  ["/lists/{id}/access", "/lists/lst_desk2026/access", false],
  ["/lists/{id}/prices", "/lists/lst_desk2026/prices", false],
  ["/invites/{token}", "/invites/inv_seed_from_agent", false],
  ["/claims/{claim_token}", "/claims/clm_seed_unclaimed", false],
  ["/unsubscribe/{token}", "/unsubscribe/unsub_check_contract", false],
  ["/entries/{id}/prices", `/entries/${entryId}/prices`, false],
  ["/me/skills", "/me/skills", false],
];
let failures = 0;
for (const [method, paths] of Object.entries(CALLS)) {
  for (const path of paths) {
    if (!spec.paths[path]?.[method.toLowerCase()]) {
      console.log(`FAIL ${method} ${path}: the web calls it, the API's document doesn't have it`);
      failures++;
    }
  }
}
console.log(`ok   ${Object.values(CALLS).flat().length} routes the web calls all exist in the API's document`);



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
  // Lists of things ({ data: [...] }): each item's keys against the item schema too.
  const itemSchema = objects.map((o) => ref(o.properties?.data?.items)).find(Boolean);
  if (itemSchema && Array.isArray(body?.data) && body.data.length) {
    const itemShapes = shapes(itemSchema).filter((x) => x.properties);
    const itemRequired = [...new Set(itemShapes.flatMap((x) => x.required ?? []))];
    const itemMissing = itemRequired.filter((k) => !(k in body.data[0]));
    if (itemMissing.length) missing.push(...itemMissing.map((k) => `data[].${k}`));
  }
  const ok = !missing.length;
  console.log(`${ok ? "ok  " : "FAIL"} ${specPath}${missing.length ? `: mock lacks ${missing.join(", ")}` : ""}${extra.length ? ` (mock-only keys: ${extra.join(", ")})` : ""}`);
  if (!ok) failures++;
}
// The claim preview (SPEC 15.1), read through POST /claims/lookup: the preview, each item and each entry.
{
  const schema = ref(spec.paths["/claims/lookup"]?.post?.responses?.["200"]?.content?.["application/json"]?.schema);
  if (!schema?.properties) console.log("note POST /claims/lookup: no ClaimPreview schema in the document yet");
  else {
    const res = await handleMockRequest(new Request("http://mock/v1/claims/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "clm_e2e_car_contract" }) }));
    const preview = await res.json();
    const need = (sch, obj, where) => (ref(sch)?.required ?? []).filter((k) => !(k in obj)).map((k) => `${where}${k}`);
    const itemSchema = ref(schema.properties.items?.items);
    const entrySchema = ref(itemSchema?.properties?.entries?.items);
    const counts = ref(ref(schema.properties.list)?.properties?.counts);
    const missing = [
      ...need(schema, preview, ""),
      ...need(counts, preview.list.counts, "list.counts."),
      ...need(itemSchema, preview.items[0], "items[]."),
      ...need(entrySchema, preview.items[0].entries[0], "items[].entries[]."),
    ];
    console.log(`${missing.length ? "FAIL" : "ok  "} POST /claims/lookup: ClaimPreview, its items and entries${missing.length ? `: mock lacks ${missing.join(", ")}` : ""}`);
    if (missing.length) failures++;
  }
}

// SPEC 16: feedback and accepting an outsider's item. Checked once the live document has them (until the server is
// deployed they are notes, not failures); then the web's calls must exist and the mock must carry every required key.
{
  const mockPost = async (path, body, auth) => {
    const res = await handleMockRequest(new Request(`http://mock/v1${path}`, { method: "POST", headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body ?? {}) }));
    return { status: res.status, body: await res.json() };
  };
  const okSchema = (op) => ref(op?.responses?.["201"]?.content?.["application/json"]?.schema ?? op?.responses?.["200"]?.content?.["application/json"]?.schema);
  const fb = spec.paths["/feedback"]?.post;
  if (!fb) console.log("note POST /feedback: not in the API's document yet");
  else {
    const got = await mockPost("/feedback", { kind: "bug", text: "contract check" });
    const missing = (okSchema(fb)?.required ?? []).filter((k) => !(k in got.body));
    const status = fb.responses?.["201"] ? 201 : 200;
    const ok = !missing.length && got.status === status;
    console.log(`${ok ? "ok  " : "FAIL"} POST /feedback: FeedbackResult${missing.length ? `: mock lacks ${missing.join(", ")}` : ""}${got.status !== status ? ` (mock answers ${got.status}, API ${status})` : ""}`);
    if (!ok) failures++;
  }
  const acc = spec.paths["/items/{id}/accept"]?.post;
  if (!acc) console.log("note POST /items/{id}/accept: not in the API's document yet");
  else {
    await mockPost("/auth/code", { email: "team@example.com" });
    const team = (await mockPost("/auth/verify", { email: "team@example.com", code: "123456" })).body.token;
    const got = await mockPost("/items/itm_fb_held/accept", {}, team);
    const missing = (okSchema(acc)?.required ?? []).filter((k) => !(k in got.body));
    console.log(`${missing.length ? "FAIL" : "ok  "} POST /items/{id}/accept: Item${missing.length ? `: mock lacks ${missing.join(", ")}` : ""}`);
    if (missing.length) failures++;
  }
}

// SPEC 16.6: one report's status, by id, no credential. A note until the live document has it.
{
  const op = spec.paths["/feedback/{id}"]?.get;
  if (!op) console.log("note GET /feedback/{id}: not in the API's document yet");
  else {
    const body = await call("/feedback/fbk_seed_done");
    const schema = ref(op.responses?.["200"]?.content?.["application/json"]?.schema);
    const missing = (schema?.required ?? []).filter((k) => !(k in body));
    const extra = Object.keys(body).filter((k) => schema?.properties && !(k in schema.properties));
    console.log(`${missing.length ? "FAIL" : "ok  "} GET /feedback/{id}: FeedbackStatus${missing.length ? `: mock lacks ${missing.join(", ")}` : ""}${extra.length ? ` (mock-only keys: ${extra.join(", ")})` : ""}`);
    if (missing.length) failures++;
  }
}

// POST /auth/verify: { token, user, created } (the choice applies only when the call creates the account).
{
  const schema = ref(spec.paths["/auth/verify"]?.post?.responses?.["200"]?.content?.["application/json"]?.schema);
  if (!schema?.properties) console.log("note POST /auth/verify: no response schema in the document");
  else {
    await handleMockRequest(new Request("http://mock/v1/auth/code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "contract-verify@example.com" }) }));
    const res = await handleMockRequest(new Request("http://mock/v1/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "contract-verify@example.com", code: "123456" }) }));
    const body = await res.json();
    const missing = (schema.required ?? []).filter((k) => !(k in body));
    const lacksCreated = schema.properties.created && !("created" in body);
    const ok = !missing.length && !lacksCreated;
    console.log(`${ok ? "ok  " : "FAIL"} POST /auth/verify: token, user, created${missing.length || lacksCreated ? `: mock lacks ${[...missing, ...(lacksCreated ? ["created"] : [])].join(", ")}` : ""}`);
    if (!ok) failures++;
  }
}

// /app's cards: each row of GET /me/lists?include=summary and its summary (SPEC 16.2 adds awaiting_review to both).
{
  const page = ref(spec.paths["/me/lists"]?.get?.responses?.["200"]?.content?.["application/json"]?.schema);
  // allOf [ListSummary, { summary }]: one object with every part's required keys and properties.
  const merged = (x) => {
    const r = ref(x);
    if (!r?.allOf) return r;
    const parts = r.allOf.map(merged);
    return { required: parts.flatMap((q) => q?.required ?? []), properties: Object.assign({}, ...parts.map((q) => q?.properties ?? {})) };
  };
  const rowSchema = shapes(page).map((o) => merged(o.properties?.data?.items)).find((r) => r?.properties?.summary);
  if (!rowSchema) console.log("note GET /me/lists: no ListWithSummary schema in the document");
  else {
    const res = await handleMockRequest(new Request("http://mock/v1/me/lists?include=summary", { headers: { authorization: `Bearer ${token}` } }));
    const row = (await res.json()).data?.[0];
    const missing = [
      ...(rowSchema.required ?? []).filter((k) => !(k in row)),
      ...(ref(rowSchema.properties.summary)?.required ?? []).filter((k) => !(k in row.summary)).map((k) => `summary.${k}`),
    ];
    console.log(`${missing.length ? "FAIL" : "ok  "} GET /me/lists?include=summary: each row and its summary${missing.length ? `: mock lacks ${missing.join(", ")}` : ""}`);
    if (missing.length) failures++;
  }
}

if (failures) {
  console.log(`\n${failures} route(s) differ from the API.`);
  process.exit(1);
}
console.log("\nThe mock matches the API's shapes for every route checked.");
