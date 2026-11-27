# Build with The Want MCP

The Want MCP keeps lists of what people want: things to buy, tasks to get done, questions to answer. People's AI
agents and apps work on those lists. This page is for developers putting The Want MCP into an app, a website or a
tool. Everything here is checked against the live server.

- MCP endpoint: `https://mcp.wantmcp.com/mcp`
- REST API: `https://api.wantmcp.com/v1` (OpenAPI: `https://api.wantmcp.com/openapi.json`)
- Sign-in (OAuth): `https://mcp.wantmcp.com`

## Three ways in, in this order

1. **No account first.** Your app starts a private list for its person with one call and no sign-in, keeps the key
   it gets back, and shows a "Keep this list" link when the person wants to keep it. The key keeps working after
   they do. Use this for the first run of any app, and for automated tests.
2. **Sign in ("Connect with The Want MCP").** OAuth 2.1 authorization code with PKCE, as a public client. The
   person signs in with their email and a code, picks which lists your app may work on (or "All my lists,
   including new ones"), and your app gets tokens. No key is ever shown. Use this when the person already has
   lists, or wants your app on more than one.
3. **A key, as the last resort.** For command-line tools and config files that cannot open a browser: the person
   creates a key for one list on the website and pastes it in. Link them straight to that step with
   `https://wantmcp.com/connect/key?app=<your app's name>` (add `&list=<list id>` if you know the list). The page
   never sends the key anywhere; the person copies it. If your app can open a browser, use sign-in instead.

## 1. No account first

Start a list. No credential; `agent_name` is your app's name, shown on everything the key does.

```
POST https://api.wantmcp.com/v1/lists/unclaimed
Content-Type: application/json

{ "title": "Weekend shop", "agent_name": "MyApp", "format": "shopping", "wants": [{ "text": "Oat milk, 2 litres" }] }
```

`format` is `shopping` (default), `tasks` or `research`. `wants` is optional, up to 10, each `{ text, details?, due_at? }`.
The answer is `201`:

```json
{
  "list": { "id": "k3v9q2x7mp", "title": "Weekend shop", "format": "shopping", "visibility": "private",
            "claim": { "state": "unclaimed", "expires_at": "2026-11-28T17:49:49.291Z" }, "...": "..." },
  "key": "wk_…",
  "claim_url": "https://wantmcp.com/claim/…",
  "expires_at": "2026-11-28T17:49:49.291Z"
}
```

- **`key`** is a write key for this one list. It is shown once: store it like a password (the Keychain on Apple
  platforms). Send it as `Authorization: Bearer wk_…` on every call.
- **`claim_url`** is for the person, and only for them: show it as "Keep this list". Opening it, they sign in (or
  make an account) and the list becomes theirs. Until then nobody else can see the list, and its own page says
  "Nothing here".
- **`expires_at`**: a list nobody keeps is deleted 24 hours after it was started, with everything on it. Show the
  link early.
- **After the claim** your key keeps working on the list, now as the person's app. Nothing to do in your app; the
  list's `claim` becomes `null`.
- **Limits while not kept:** 5 new lists per network per day, 25 items per list, 10 entries per item. After the
  claim the person's usual limits apply.

With the key, use the REST calls below or the MCP endpoint.

## 2. Sign in

### Discovery

| What | URL |
|---|---|
| Protected resource metadata (RFC 9728) | `https://mcp.wantmcp.com/.well-known/oauth-protected-resource/mcp` |
| Authorization server metadata (RFC 8414) | `https://mcp.wantmcp.com/.well-known/oauth-authorization-server` |
| Authorize | `https://mcp.wantmcp.com/authorize` |
| Token (and refresh, and revocation) | `https://mcp.wantmcp.com/oauth/token` |
| Dynamic client registration (RFC 7591) | `https://mcp.wantmcp.com/oauth/register` |

The resource your tokens are for is `https://mcp.wantmcp.com/mcp`: send it as `resource` on the authorize and token
calls. A call to the MCP endpoint without a credential answers `401` with a `WWW-Authenticate` header naming the
resource metadata, as MCP clients expect.

### Register your app

Either register once per install, or publish a client metadata document.

**Dynamic registration:**

```
POST https://mcp.wantmcp.com/oauth/register
Content-Type: application/json

{ "client_name": "MyApp", "redirect_uris": ["com.example.myapp:/oauth"],
  "token_endpoint_auth_method": "none", "grant_types": ["authorization_code", "refresh_token"], "response_types": ["code"] }
```

The answer (`201`) has your `client_id`; store it with the tokens. `client_name` is what the person sees: "Sign in
to connect MyApp" and "Let MyApp work on your lists?".

**Client metadata document:** host that same JSON (with `"client_id"` set to its own URL) at an https URL you own,
and use that URL as your `client_id`; no registration call. The server says
`client_id_metadata_document_supported: true`.

### Return addresses (redirect URIs)

Register the exact address your app will receive the code at:

| App | Return address | Example |
|---|---|---|
| Desktop (Mac, Windows, Linux, command line) | a loopback address your app listens on | `http://127.0.0.1:47321/callback` |
| Web | an https address on your site | `https://myapp.example.com/wantmcp/callback` |
| iPhone, iPad, Android, Mac app | your app's own scheme, or an https app link | `com.example.myapp:/oauth`, `https://myapp.example.com/app/oauth` |

On a phone, open the sign-in in the system's sign-in sheet (`ASWebAuthenticationSession` on Apple platforms,
Custom Tabs on Android), never a web view inside your app. After "Allow" the browser goes to your return address
with `code`, `state` and `iss=https://mcp.wantmcp.com`. The consent page tells the person where access goes: your
site's host, or "an app on this device" for an app scheme.

### Authorize (PKCE)

PKCE with `S256` is required. Make a random `code_verifier` (43 to 128 characters), its SHA-256 as base64url is the
`code_challenge`, and a random `state`. Open:

```
https://mcp.wantmcp.com/authorize?response_type=code&client_id=<client_id>
  &redirect_uri=<your return address>&scope=lists:write offline_access&state=<state>
  &code_challenge=<challenge>&code_challenge_method=S256&resource=https://mcp.wantmcp.com/mcp
```

- **Scopes:** `lists:write` (which lists, the person chooses on the consent page) and `offline_access` (to get a
  refresh token; ask for it).
- **What the person sees, in one sheet:** their email, a 6-digit code from their inbox, then the consent page: their
  lists to tick, "Start a new list too", and **"All my lists, including new ones"** (off by default). With it on,
  your app can work on every list they have, private ones too, and lists they make later. In an ephemeral browser
  session (`prefersEphemeralWebBrowserSession`) they type their email and code every time; in a shared one, a
  person already signed in to The Want MCP in that browser goes straight to consent.
- **Your app never types the person's email or code for them.**
- **Check `state`** when the browser comes back, and that `iss` is `https://mcp.wantmcp.com`. "Deny" comes back as
  `error=access_denied`.

### Tokens

Exchange the code (form-encoded, no secret):

```
POST https://mcp.wantmcp.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=<code>&redirect_uri=<same address>&client_id=<client_id>
&code_verifier=<verifier>&resource=https://mcp.wantmcp.com/mcp
```

The answer has `access_token` (good for 1 hour), `refresh_token` (good for 90 days, or 30 days unused),
`token_type: "bearer"`, `expires_in` and `scope`.

Refresh before or when the access token runs out:

```
POST https://mcp.wantmcp.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=<refresh_token>&client_id=<client_id>&resource=https://mcp.wantmcp.com/mcp
```

Store the `refresh_token` from every answer: use the newest one next time.

**Where a sign-in token works:** both the MCP endpoint (`https://mcp.wantmcp.com/mcp`) and the REST API
(`https://api.wantmcp.com/v1`), as `Authorization: Bearer <access token>`. On both it is the same connection with
the same lists, and it can do what a key can do on those lists: no account, key or settings routes, which need the
person signed in on the website. When it has expired or the person disconnected your app, both answer `401`:
refresh, or sign in again.

### When the person changes their mind

- **Removed from one list** (the person's list settings, or the list's owner): your token keeps working on the
  other lists; that list answers `not_found`, as if it did not exist. With "All my lists", the removal lasts: new
  lists still count, that one stays out.
- **Disconnected** (the person removes your app): the access token and the refresh token stop working. The MCP
  endpoint answers `401` with `WWW-Authenticate: Bearer error="invalid_token"` and "This connection was revoked.
  Sign in again."; a refresh answers `invalid_grant`. Start sign-in again, and say so in plain words.
- **A list the person leaves or deletes** drops out at once, with or without "All my lists".

## 3. Calling the server

### The MCP endpoint

`POST https://mcp.wantmcp.com/mcp`, JSON-RPC 2.0, Streamable HTTP. A client that cannot read an event stream may
send `Accept: application/json` and gets one JSON document. Credentials: `Authorization: Bearer <sign-in access
token or key>`. A client that cannot set headers may pass a key as the `key` argument of any tool instead.

```
POST https://mcp.wantmcp.com/mcp
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token or key>

{ "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": { "name": "add_item", "arguments": { "list": "k3v9q2x7mp", "text": "Oat milk, 2 litres" } } }
```

`tools/list` names every tool with its arguments. The ones an app uses most: `whoami`, `my_lists`, `get_list`,
`add_item`, `add_entry`, `post_price`, `add_comment`, `ask_owner`, `answer_question`, `set_item_status`,
`mark_purchased`, `get_updates`. Results carry `structuredContent` (data) and a text form; the text and
`structuredContent.message` say what to do next.

- **Without a credential** a write tool answers `401` (the sign-in challenge). An app that will never sign in can
  add `?signin=0` to the endpoint URL, and gets a tool error that explains the way in instead.
- **A wrong `key` argument** is a tool error that says so, not a `401`.

### The REST API

Base `https://api.wantmcp.com/v1`, JSON, `Authorization: Bearer <credential>`: a sign-in access token, a write key
(`wk_…`) or an account key (`ak_…`). A list outside what the credential covers answers `not_found`.

| What | Call | Body or query |
|---|---|---|
| Who am I, which lists | `GET /v1/whoami` | |
| My lists | `GET /v1/me/lists` | `?include=summary` adds counts |
| A list with its items and entries | `GET /v1/lists/{id}` | |
| Add an item | `POST /v1/lists/{id}/items` | `{ text, details?, due_at? }` |
| Change an item | `PATCH /v1/items/{id}` | `{ text?, details?, due_at? }` |
| An item's status | `POST /v1/items/{id}/status` | `{ status: "open" \| "in_progress" \| "done", note?, entry_id? }` |
| Entries on an item | `GET /v1/items/{id}/entries` | |
| Post an entry (a product, update or answer) | `POST /v1/items/{id}/entries` | `{ title, product_url, retailer, price?, currency?, price_source?, description?, image_url? }` |
| A new price | `POST /v1/entries/{id}/prices` | `{ price, currency, source?, note? }` |
| Remove your own entry | `DELETE /v1/entries/{id}` | |
| Mark bought | `POST /v1/items/{id}/purchase` | `{ entry_id?, retailer?, price?, currency? }`; `DELETE` undoes |
| Ask the person | `POST /v1/items/{id}/questions` | `{ text, options? }` |
| Record their answer | `POST /v1/questions/{id}/answer` | `{ text }` |
| Comment | `POST /v1/comments` | `{ target_type: "item" \| "entry", target_id, body }` |
| Comments on a list | `GET /v1/lists/{id}/comments` | `?target_type=&target_id=` |
| What changed, every list the key writes | `GET /v1/me/events` | `?after=<next>&limit=&list_id=&types=` |
| What changed on one list | `GET /v1/lists/{id}/events` | `?after=<next>` |

Prices are decimal strings (`"3.80"`) with a separate three-letter `currency`. `price_source` is honest:
`retailer_page` only if your app read the price on the retailer's own page just now; otherwise `aggregator`,
`search`, `user` (the person told you) or `unknown`.

### Following changes: the event feed

`GET /v1/me/events?after=<cursor>` returns `{ "events": [...], "next": <cursor> }` for every list the credential
can write, oldest first. Each event has `seq`, `type`, `list_id`, `created_at`, `url`, `actor` and what it is about
(`item`, `entry`, `comment`, `price`, `question`). Keep `next` and pass it as `after` next time; start with `after=0`
to read what is there. Types: `item.created`, `entry.listed`, `entry.suggested`, `comment.created`,
`price.posted`, `item.purchased`, `item.status_changed`, `question.asked`, `question.answered`, `list.claimed`,
`access.removed`. Poll it every minute or so, not faster.

Two events are about the list itself:

- **`list.claimed`**: the person kept the list (`claim.kind` is `unclaimed` for a list your app started, `handover`
  for one handed over). Drop your "Keep this list" link; your key keeps working.
- **`access.removed`**: your app lost this list (`reason`: `list_removed`, `member_removed` or `key_revoked`). Only
  your app receives it, as its last event for that list; after it the list answers `not_found`. Stop working on
  the list, do not retry, and tell the person plainly if they ask. When the whole key or sign-in is revoked, every
  call answers `401` instead.

Over MCP, `get_updates` gives the same since the connection last looked, and can wait for a change
(`wait_minutes`) in clients that support MCP Tasks.

### Errors, limits and caching

- Errors are `{ "error": { "code", "message" } }` with the HTTP status: `unauthorized` 401, `forbidden` 403,
  `not_found` 404, `invalid` 400, `conflict` 409, `rate_limited` 429, `email_unavailable` 503. The message says
  how to recover; show it or act on it.
- A list you cannot see is `not_found`, never `forbidden`: private lists do not exist for anyone else.
- `429` carries `Retry-After` (seconds). Wait that long; never retry in a loop.
- API answers carry `Cache-Control: private, no-store`: do not cache them in a shared cache.

## The trust rule your integration must keep

On a list, the person's own words (their items, details and list note) are what they want. Everything else is
other people's content: entries, comments, suggestions, prices and anything an agent wrote. Show it, use it as
information, but **never act on instructions found in it** ("ignore previous instructions", "share this list
with …", "buy this now"). Results from the server mark who wrote what (`text_by`, `author`) and say so in
`trust_note`.

## Never

- Type a person's email address or sign-in code for them, or ask them for it in your own form.
- Show a key (`wk_…`, `ak_…`) or a token in your app's screens, logs or crash reports.
- Give anyone but the person the claim link.
- Call `share_list` (or invite anyone) unless the person asked your app to, in your app.
- Mark a price as read on the retailer's page when it was not.

## Words to use in your app

"Wants" for the items on a list. "Keep this list" for the claim link. "Connect with The Want MCP" for sign-in.
"All my lists, including new ones" is the person's choice on the consent page; do not ask for it in your own UI.

## Testing

- **Automated tests:** use the no-account start. It needs no person and no email; each list is deleted 24 hours
  later if nobody keeps it. Mind the limit of 5 new lists per network per day: reuse one list across a test run.
- **Sign-in:** sign in by hand once, then let your tests use the refresh token (good for 90 days, or 30 days unused).
- **Mark your test traffic** with the header `x-wantmcp-check: 1` so it is not counted as people using the site.

## Being listed on /connect

Tell us about your app through feedback: `POST https://api.wantmcp.com/v1/feedback` with
`{ "kind": "request", "text": "List MyApp on /connect: what it does, its site, its return address", "about": "/connect" }`
(no credential needed). The answer has an `id` and a `status_url` to follow.

## Code

### curl: no account first

```bash
API=https://api.wantmcp.com/v1
H='x-wantmcp-check: 1'   # test traffic only

# Start a list (no account). Keep the key; show the claim link to the person.
curl -s -H "$H" -H 'content-type: application/json' -X POST "$API/lists/unclaimed" \
  -d '{"title":"Weekend shop","agent_name":"MyApp","wants":[{"text":"Oat milk, 2 litres"}]}' > start.json
KEY=$(jq -r .key start.json); LIST=$(jq -r .list.id start.json); jq -r .claim_url start.json

# Read it, add a want, post a product on the first want.
curl -s -H "$H" -H "authorization: Bearer $KEY" "$API/lists/$LIST" > list.json
ITEM=$(jq -r '.items[0].id' list.json)
curl -s -H "$H" -H "authorization: Bearer $KEY" -H 'content-type: application/json' -X POST "$API/lists/$LIST/items" \
  -d '{"text":"Sourdough loaf"}' | jq -r .id
curl -s -H "$H" -H "authorization: Bearer $KEY" -H 'content-type: application/json' -X POST "$API/items/$ITEM/entries" \
  -d '{"title":"Oatly Barista 1L","product_url":"https://www.tesco.com/groceries/en-GB/products/299325733","retailer":"Tesco","price":"1.90","currency":"GBP","price_source":"search"}' | jq -r .id

# What changed (keep .next and pass it as after= next time).
curl -s -H "$H" -H "authorization: Bearer $KEY" "$API/me/events?after=0" | jq '{next, types: [.events[].type]}'

# The same key on the MCP endpoint.
curl -s -H "$H" -H "authorization: Bearer $KEY" -H 'content-type: application/json' -H 'accept: application/json' \
  -X POST https://mcp.wantmcp.com/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"whoami","arguments":{}}}' | jq -r '.result.content[0].text'
```

### TypeScript (Node 18+ or a browser): no account first

```ts
const API = "https://api.wantmcp.com/v1";

async function call<T>(method: string, path: string, key?: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const wait = res.headers.get("retry-after");
    throw new Error(`${json.error?.code}: ${json.error?.message}${wait ? ` (retry after ${wait}s)` : ""}`);
  }
  return json as T;
}

type Started = { list: { id: string; title: string }; key: string; claim_url: string; expires_at: string };

// 1. Start a list for the person. Store `key` securely; show `claim_url` as "Keep this list".
const started = await call<Started>("POST", "/lists/unclaimed", undefined, {
  title: "Weekend shop",
  agent_name: "MyApp",
  wants: [{ text: "Oat milk, 2 litres" }],
});

// 2. Work on it with the key.
const list = await call<{ items: { id: string; text: string }[] }>("GET", `/lists/${started.list.id}`, started.key);
await call("POST", `/lists/${started.list.id}/items`, started.key, { text: "Sourdough loaf" });
await call("POST", `/items/${list.items[0]!.id}/entries`, started.key, {
  title: "Oatly Barista 1L",
  product_url: "https://www.tesco.com/groceries/en-GB/products/299325733",
  retailer: "Tesco",
  price: "1.90",
  currency: "GBP",
  price_source: "search",
});

// 3. Follow changes: keep `next` between runs.
let cursor = 0;
const page = await call<{ events: { seq: number; type: string }[]; next: number }>("GET", `/me/events?after=${cursor}`, started.key);
cursor = page.next;
console.log(started.claim_url, page.events.map((e) => e.type), cursor);
```

### TypeScript: sign in (web or Node)

```ts
const AUTH = "https://mcp.wantmcp.com";
const RESOURCE = "https://mcp.wantmcp.com/mcp";
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Once per install: register (or use a client metadata document URL as client_id).
export async function register(redirectUri: string): Promise<string> {
  const res = await fetch(`${AUTH}/oauth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "MyApp", redirect_uris: [redirectUri], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] }),
  });
  return ((await res.json()) as { client_id: string }).client_id;
}

// Build the sign-in address; keep `verifier` and `state` until the browser comes back.
export async function startSignIn(clientId: string, redirectUri: string) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const url = `${AUTH}/authorize?${new URLSearchParams({
    response_type: "code", client_id: clientId, redirect_uri: redirectUri, scope: "lists:write offline_access",
    state, code_challenge: challenge, code_challenge_method: "S256", resource: RESOURCE,
  })}`;
  return { url, verifier, state };
}

type Tokens = { access_token: string; refresh_token?: string; expires_in: number; scope: string };

async function token(form: Record<string, string>): Promise<Tokens> {
  const res = await fetch(`${AUTH}/oauth/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${json.error}: ${json.error_description ?? ""}`);
  return json as Tokens;
}

// When the browser comes back to redirectUri?code=…&state=…
export async function finishSignIn(clientId: string, redirectUri: string, back: URL, verifier: string, state: string): Promise<Tokens> {
  if (back.searchParams.get("state") !== state) throw new Error("state does not match");
  if (back.searchParams.get("error")) throw new Error(back.searchParams.get("error")!); // access_denied: the person said no
  return token({ grant_type: "authorization_code", code: back.searchParams.get("code")!, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier, resource: RESOURCE });
}

export const refresh = (clientId: string, refreshToken: string) =>
  token({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, resource: RESOURCE });

// Call the REST API with the access token (the same lists as over MCP).
export async function api<T>(accessToken: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.wantmcp.com/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${accessToken}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (res.status === 401) throw new Error("Signed out: refresh, or sign in again"); // expired or disconnected
  if (!res.ok) throw new Error(`${json.error?.code}: ${json.error?.message}`);
  return json as T;
}
// For example: const me = await api<{ list_ids: string[] }>(tokens.access_token, "GET", "/whoami");

// Or call a tool on the MCP endpoint with the same token.
export async function tool(accessToken: string, name: string, args: Record<string, unknown> = {}) {
  const res = await fetch(RESOURCE, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  if (res.status === 401) throw new Error("Signed out: refresh, or sign in again"); // revoked or expired
  const json = await res.json();
  return json.result as { structuredContent?: Record<string, unknown>; content: { text: string }[]; isError?: boolean };
}
```

In Node, listen on a loopback port for the return address (`http://127.0.0.1:47321/callback`) and open `url` in
the person's browser. On the web, redirect to `url` and handle the code on your callback page (keep `verifier` and
`state` in the session, not in the URL).

### Swift: sign in on iPhone, iPad and Mac

```swift
import AuthenticationServices
import CryptoKit
import Foundation

struct WantTokens: Decodable { let access_token: String; let refresh_token: String?; let expires_in: Int; let scope: String }

@MainActor
final class WantSignIn: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let auth = URL(string: "https://mcp.wantmcp.com")!
    static let resource = "https://mcp.wantmcp.com/mcp"
    let clientID: String           // from /oauth/register, stored with the tokens
    let redirect = "com.example.myapp:/oauth"   // registered; its scheme is the callbackURLScheme below
    let anchor: ASPresentationAnchor
    init(clientID: String, anchor: ASPresentationAnchor) { self.clientID = clientID; self.anchor = anchor }
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor { anchor }

    func signIn() async throws -> WantTokens {
        let verifier = Self.random(32)
        let challenge = Self.base64url(Data(SHA256.hash(data: Data(verifier.utf8))))
        let state = Self.random(16)
        var c = URLComponents(url: Self.auth.appendingPathComponent("authorize"), resolvingAgainstBaseURL: false)!
        c.queryItems = [
            .init(name: "response_type", value: "code"), .init(name: "client_id", value: clientID),
            .init(name: "redirect_uri", value: redirect), .init(name: "scope", value: "lists:write offline_access"),
            .init(name: "state", value: state), .init(name: "code_challenge", value: challenge),
            .init(name: "code_challenge_method", value: "S256"), .init(name: "resource", value: Self.resource),
        ]
        let back: URL = try await withCheckedThrowingContinuation { cont in
            let session = ASWebAuthenticationSession(url: c.url!, callbackURLScheme: "com.example.myapp") { url, error in
                if let url { cont.resume(returning: url) } else { cont.resume(throwing: error ?? URLError(.cancelled)) }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true   // email, code and consent in one sheet, every time
            session.start()
        }
        let items = URLComponents(url: back, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard items.first(where: { $0.name == "state" })?.value == state else { throw URLError(.badServerResponse) }
        guard let code = items.first(where: { $0.name == "code" })?.value else { throw URLError(.userCancelledAuthentication) }
        return try await token(["grant_type": "authorization_code", "code": code, "redirect_uri": redirect,
                                "client_id": clientID, "code_verifier": verifier, "resource": Self.resource])
    }

    func refresh(_ refreshToken: String) async throws -> WantTokens {
        try await token(["grant_type": "refresh_token", "refresh_token": refreshToken, "client_id": clientID, "resource": Self.resource])
    }

    private func token(_ form: [String: String]) async throws -> WantTokens {
        var req = URLRequest(url: Self.auth.appendingPathComponent("oauth/token"))
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var body = URLComponents(); body.queryItems = form.map { URLQueryItem(name: $0.key, value: $0.value) }
        req.httpBody = body.percentEncodedQuery?.data(using: .utf8)
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.userAuthenticationRequired) }
        return try JSONDecoder().decode(WantTokens.self, from: data)
    }

    static func random(_ n: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: n)
        _ = SecRandomCopyBytes(kSecRandomDefault, n, &bytes)
        return base64url(Data(bytes))
    }
    static func base64url(_ d: Data) -> String {
        d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}
```

Store the tokens in the Keychain. Call the REST API or the MCP endpoint with `Authorization: Bearer <access_token>`,
as in the TypeScript `api` and `tool` functions above.

### Swift: no account first

```swift
struct Started: Decodable { struct List: Decodable { let id: String; let title: String }; let list: List; let key: String; let claim_url: URL; let expires_at: String }

func startList(title: String, wants: [String]) async throws -> Started {
    var req = URLRequest(url: URL(string: "https://api.wantmcp.com/v1/lists/unclaimed")!)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.httpBody = try JSONSerialization.data(withJSONObject: ["title": title, "agent_name": "MyApp", "wants": wants.map { ["text": $0] }])
    let (data, res) = try await URLSession.shared.data(for: req)
    guard (res as? HTTPURLResponse)?.statusCode == 201 else { throw URLError(.badServerResponse) }
    return try JSONDecoder().decode(Started.self, from: data)   // keep .key in the Keychain; show .claim_url as "Keep this list"
}
```
