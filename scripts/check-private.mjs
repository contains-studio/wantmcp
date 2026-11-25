/**
 * Private-list checks (SPEC 11.2) against a running dev server using the mock API.
 *
 *   pnpm dev                         # API_BASE_URL=mock
 *   pnpm check:private               # or: node scripts/check-private.mjs http://localhost:5173
 *
 * Signs in through the web app as the owner, a member and an unrelated user (mock accounts),
 * and checks what each of them, and a signed-out visitor, can reach.
 */
const BASE = process.argv[2] ?? "http://localhost:5173";
const PRIVATE = "lst_tasks"; // mock: private task list, owner demo@, member heron@
const PRIVATE_TITLE = "Moving flat: things to sort";
const PRIVATE_SNIPPET = "Called the provider";
const PUBLIC = "lst_desk2026";

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${msg}`);
  if (!cond) failures++;
};

async function signIn(email) {
  const form = (o) => new URLSearchParams(o).toString();
  const h = { "content-type": "application/x-www-form-urlencoded", accept: "text/html" };
  await fetch(`${BASE}/login?next=/app`, { method: "POST", headers: h, body: form({ email, next: "/app" }) });
  const res = await fetch(`${BASE}/login?next=/app`, {
    method: "POST",
    headers: h,
    body: form({ intent: "verify", email, code: "123456", next: "/app" }),
    redirect: "manual",
  });
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  if (!cookie.startsWith("wm_session=")) throw new Error(`sign-in failed for ${email}: ${res.status}`);
  return cookie;
}

const get = (path, cookie) => fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });

function noSharedCache(res) {
  const cc = res.headers.get("cache-control") ?? "";
  return !/\bpublic\b/.test(cc) || /s-maxage=0\b/.test(cc);
}

async function expectHidden(who, cookie) {
  const res = await get(`/l/${PRIVATE}`, cookie);
  const body = await res.text();
  ok(res.status === 404, `${who}: private list page is 404 (got ${res.status})`);
  ok(!body.includes(PRIVATE_TITLE) && !body.includes(PRIVATE_SNIPPET), `${who}: 404 page reveals nothing of the list`);
  ok(/noindex/.test(res.headers.get("x-robots-tag") ?? "") || /name="robots" content="noindex/.test(body), `${who}: 404 is noindex`);
  ok(noSharedCache(res), `${who}: 404 is not publicly cacheable (${res.headers.get("cache-control")})`);
  const cmts = await get(`/l/${PRIVATE}/comments`, cookie);
  ok(cmts.status === 404, `${who}: private comments endpoint is 404 (got ${cmts.status})`);
  const live = await (await get(`/live?list=${PRIVATE}`, cookie)).json();
  ok(live.disabled === true && live.next === undefined, `${who}: live updates for the private list are refused`);
  const settings = await get(`/app/lists/${PRIVATE}/settings`, cookie);
  ok(settings.status === 404 || settings.status === 302, `${who}: private list settings unreachable (got ${settings.status})`);
}

async function expectVisible(who, cookie) {
  const res = await get(`/l/${PRIVATE}`, cookie);
  const body = await res.text();
  ok(res.status === 200, `${who}: private list page loads (got ${res.status})`);
  ok(body.includes(PRIVATE_TITLE), `${who}: sees the list`);
  ok(/private/.test(res.headers.get("cache-control") ?? "") && /no-store/.test(res.headers.get("cache-control") ?? ""), `${who}: private, no-store`);
  ok(/noindex/.test(res.headers.get("x-robots-tag") ?? ""), `${who}: X-Robots-Tag noindex`);
  ok(/<meta name="robots" content="noindex/.test(body), `${who}: robots meta noindex`);
  ok(!body.includes("application/ld+json"), `${who}: no structured data`);
  ok(!/og:image" content="[^"]*\/og\/l\//.test(body), `${who}: generic share image only`);
  ok(/Private/.test(body), `${who}: "Private" marker shown`);
}

const anon = null;
const owner = await signIn("demo@example.com");
const member = await signIn("heron@example.com");
const other = await signIn("lynx@example.com");

await expectHidden("signed out", anon);
await expectHidden("other signed-in user", other);
await expectVisible("member", member);
await expectVisible("owner", owner);

const og = await get(`/og/l/${PRIVATE}.png`, anon);
ok(og.status === 302 && (og.headers.get("location") ?? "").endsWith("/og.png"), `share image of a private list falls back to the generic image (${og.status})`);
ok(/no-store/.test(og.headers.get("cache-control") ?? ""), "that fallback is not cached");

const home = await (await get("/", anon)).text();
ok(!home.includes(PRIVATE_SNIPPET) && !home.includes(PRIVATE_TITLE), "home feed has nothing from private lists");
const sitemap = await (await get("/sitemap.xml", anon)).text();
ok(!sitemap.includes(PRIVATE) && sitemap.includes(PUBLIC), "sitemap lists public lists only");

const pub = await get(`/l/${PUBLIC}`, anon);
ok(pub.status === 200 && noSharedCache(pub), `public list: shared caches must revalidate (${pub.headers.get("cache-control")})`);

// Switching a public list to private hides it at once, then switch it back.
const flip = (visibility) =>
  fetch(`${BASE}/app/lists/${PUBLIC}/settings`, {
    method: "POST",
    headers: { cookie: owner, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ intent: "visibility", visibility }).toString(),
  });
await flip("private");
ok((await get(`/l/${PUBLIC}`, anon)).status === 404, "a list made private is 404 to visitors immediately");
ok(!(await (await get("/sitemap.xml", anon)).text()).includes(PUBLIC), "and leaves the sitemap");
await flip("public");
ok((await get(`/l/${PUBLIC}`, anon)).status === 200, "and returns when made public again");

console.log(failures ? `\n${failures} check(s) failed` : "\nAll private-list checks passed.");
process.exit(failures ? 1 : 0);
