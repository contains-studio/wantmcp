/**
 * Production smoke check: no credentials, read-only. Exits 1 if anything is wrong.
 *   node .github/scripts/smoke.mjs [site] [api] [mcp]
 */
const SITE = process.argv[2] ?? "https://wantmcp.com";
const API = process.argv[3] ?? "https://api.wantmcp.com/v1";
const MCP = process.argv[4] ?? "https://mcp.wantmcp.com";
const UA = { "user-agent": "wantmcp-smoke-check (+https://github.com/contains-studio/wantmcp)" };

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
};

async function get(url, accept = "text/html") {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { ...UA, accept }, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const body = await res.text();
    return { res, body, ms: Date.now() - started };
  } catch (err) {
    return { res: null, body: "", ms: Date.now() - started, err };
  }
}

async function page(path, { status = 200, contains } = {}) {
  const { res, body, ms, err } = await get(`${SITE}${path}`);
  if (!res) return check(false, `${path}: request failed (${err?.message})`);
  check(res.status === status, `${path}: ${res.status} in ${ms} ms (want ${status})`);
  if (contains) check(body.includes(contains), `${path}: contains “${contains}”`);
  return res;
}

const home = await page("/", { contains: "The Want MCP" });
await page("/connect", { contains: "mcp.wantmcp.com" });
await page("/login");
await page("/themes", { contains: "Themes" });
await page("/l/lst_smoke_check_missing", { status: 404 });

if (home) {
  const h = home.headers;
  const csp = h.get("content-security-policy") ?? "";
  check(/script-src[^;]*'nonce-/.test(csp) && /frame-ancestors 'none'/.test(csp), "home: Content-Security-Policy with script nonce and frame-ancestors");
  check(h.get("x-content-type-options") === "nosniff", "home: X-Content-Type-Options nosniff");
  check(!!h.get("referrer-policy"), "home: Referrer-Policy set");
  check(h.get("x-frame-options") === "DENY", "home: X-Frame-Options DENY");
  check(h.get("cross-origin-opener-policy") === "same-origin", "home: Cross-Origin-Opener-Policy same-origin");
}

{
  const { res, body, err } = await get(`${API}/health`, "application/json");
  check(res?.status === 200, `API health: ${res?.status ?? err?.message}`);
  try {
    JSON.parse(body);
    check(true, "API health: JSON body");
  } catch {
    check(false, "API health: JSON body");
  }
}
{
  const { res, body, err } = await get(`${MCP}/mcp/server-card`, "application/json");
  check(res?.status === 200, `MCP server card: ${res?.status ?? err?.message}`);
  let card = null;
  try {
    card = JSON.parse(body);
  } catch {}
  check(!!card && typeof card === "object", "MCP server card: JSON body");
}

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nProduction looks healthy.");
