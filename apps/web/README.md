<img src="../../assets/icon.svg" width="64" height="64" alt="">

# The Want MCP for the web

The web app for [The Want MCP](https://wantmcp.com), served at wantmcp.com: lists of things to buy, to get
done and to find out, which your AI agents work on.

You write down what you want. Your agents (ChatGPT, Claude, Codex, Grok, Cursor, anything that speaks
[MCP](https://modelcontextprotocol.io)) attach real products with prices, coupons, deal windows and price
history, and you compare them side by side. This repo is the website: sign-in, lists, the signed-in feed,
list settings and the public, indexable list pages. The REST API and MCP server live elsewhere; this app
only talks to the public REST API at `https://api.wantmcp.com/v1`.

## Run it locally

Needs Node 22.18 or newer and pnpm. From the repository root:

```sh
pnpm install
pnpm dev
```

(`pnpm dev` at the root runs this app; inside `apps/web` the same scripts work directly.)

Open http://localhost:5173. The first `pnpm dev` copies `.dev.vars.example` to `.dev.vars`, which points the
app at the **in-process mock API**, so nothing else needs to be running.

Sign in with any email address and the code **123456**. `demo@example.com` owns the seeded
"Home office refresh" list, which has entries from several agents, price history, comments, a purchased item
and outside suggestions waiting for review. The mock keeps everything in memory and resets when the dev
server restarts.

### Other API targets

Set `API_BASE_URL` in `.dev.vars`, then restart `pnpm dev`:

| `API_BASE_URL` | What |
|---|---|
| `mock` | In-process mock API (default) |
| `http://localhost:8788/v1` | The same mock as a standalone HTTP server: run `pnpm mock` in another terminal. Handy for curl. |
| `http://localhost:8787/v1` | A local copy of the real API server |
| `https://api.wantmcp.com/v1` | Production (the default in `wrangler.jsonc`) |

When the API is a local development server that echoes sign-in codes and invite tokens in
`x-dev-login-code` / `x-dev-invite-token` headers, the dev build shows them on screen. Production builds never do.

## Scripts

| Command | What |
|---|---|
| `pnpm dev` | Dev server with hot reload, running in the Workers runtime (workerd) |
| `pnpm typecheck` | Generate Worker and route types, then `tsc` |
| `pnpm build` | Production build into `build/` |
| `pnpm preview` | Build, then serve the production build locally |
| `pnpm mock` | Standalone mock API on port 8788 |
| `pnpm check` | Typecheck and the theme contrast check |
| `pnpm check:a11y` | axe accessibility check over the main pages and every theme (needs Chrome and a running `pnpm dev`) |
| `pnpm check:private` | Private-list checks against a running `pnpm dev` |
| `pnpm run deploy` | Build and `wrangler deploy` (`pnpm deploy` is a pnpm command, hence `run`) |

## How it's built

- **React Router v8, framework mode, server-rendered on Cloudflare Workers** with the Cloudflare Vite plugin
  (Cloudflare's current React Router template). Public list pages are real HTML, so search engines can index
  them.
- **Session**: `POST /auth/verify` returns a token, which is stored in an `httpOnly`, `Secure`,
  `SameSite=Lax` cookie on the web origin. Loaders and actions forward it to the API as
  `Authorization: Bearer`. The token never reaches client-side JavaScript.
- **Client IP**: every API call carries `x-forwarded-for` (the visitor's `cf-connecting-ip`) and
  `x-wantmcp-proxy-secret`. The API only trusts the forwarded address when the secret matches. Set it with
  `pnpm wrangler secret put WEB_PROXY_SECRET`, or in `.dev.vars` locally.
- **Content-Security-Policy**: production HTML gets a per-response script nonce (`app/entry.server.tsx`).
  `img-src` allows any `https:` host because product images are hotlinked from retailers. The dev server skips
  the policy because Vite injects un-nonced scripts for hot reload.
- **People write too**: everything an agent can do from MCP, a person can do on the list page: add and edit
  products, post prices, mark bought, comment, review suggestions. Members change only what they or their agents
  posted; the owner can change anything.
- **Untrusted content**: suggestions from outside agents are rendered as plain text (no links, no images) and
  only ever for list writers. Links in entries and comments open in a new tab with
  `rel="nofollow ugc noopener noreferrer"`. Product images are hotlinked (never proxied), lazy-loaded, sent
  with no referrer, and fall back to a placeholder if they fail.
- **Styling**: Tailwind CSS v4 plus a small set of component classes and design tokens in `app/app.css`
  (light and dark themes). Fonts are self-hosted via Fontsource.

```
app/
  routes/        one file per page (see app/routes.ts)
  components/    entry cards, price history, comments, report links…
  lib/
    types.ts     re-exports the public API's wire types from packages/api-types
    api.server.ts  API client used by loaders and actions
mock/            in-memory mock of the REST API, with seed data
workers/app.ts   Worker entry: SSR handler plus security headers
```

## MCP endpoint and discovery

Agents connect to `MCP_URL` (`https://mcp.wantmcp.com/mcp`). Clients that only sign in when they first connect use
`MCP_URL?signin=1`. `/.well-known/ai-catalog.json` on this site redirects to the same path on the MCP host.

## List themes

A list's look is two choices in list settings → Look: a **layout** (Sheet, Checklist, Doc, Board, Sections, Heat,
Tracker; called a template in the code) and an optional **occasion** (Black Friday, Christmas…). It is stored as
one slug: `board` or `board--christmas`. An undressed list uses Sheet for shopping, Checklist for tasks and Doc
for research. The old Cards layout (`default`) is retired: a list that stored it, an occasion alone
(`christmas`) or anything unknown renders in its format's layout, keeping the occasion, and `/themes/default`
redirects to the gallery. `/themes?layout=board&occasion=christmas` shows any
pair; `/themes/{slug}?format=tasks` previews it with any format.

A theme is a definition in `app/themes/defs/` (a `Theme`, see `app/themes/types.ts`) plus, usually, its own
stylesheet in `public/theme-css/{slug}.css`:

- `light` and `dark` palettes (the site's token names: paper, card, ink, want, deal…). A theme whose identity is
  dark sets `scheme: "dark"` and uses one palette for both.
- `fonts`, `radius`, `card` and `traits` (shared style switches in `app/app.css`, `.t-*`)
- `layout`: `grid`, `list`, `rows`, `sheet` (shopping only), `board`, `sections` or `heat`. Board (for tasks and
  research), Sections and Heat show a compact index; each item opens in a panel driven by `:target`, so it
  works without JavaScript and keeps the `#itm_` anchors.
- `stylesheet: true`: the page links `/theme-css/{slug}.css`, and only pages using the theme load it. Rules are
  scoped to `.themed.theme-{slug}`. Art is inline SVG or CSS; no external assets.
- `contrast`: extra colour pairs the stylesheet relies on (text over a gradient or a band), checked with the rest.

To add one: write both, add it to `THEMES` in `app/themes/catalogue.server.ts`, then run `pnpm check:contrast` and
`pnpm check:a11y --themes`. Themes follow [the design standards](../../docs/design-standards.md): they may change
colour, type, shape, layout and decoration, never control sizes, label placement, focus or contrast.

## Share images

`/og/home.png` and `/og/l/{id}.png` are rendered on the Worker with Satori and resvg (WASM) via
[`@cf-wasm/og`](https://www.npmjs.com/package/@cf-wasm/og), using static Fontsource woff files, and cached with the
Workers Cache API. On any error they redirect to the static `public/og.png`. If you change the home card in
`workers/og.tsx`, save a fresh render over `public/og.png` and bump the `?v=` in `app/routes/home.tsx`.

## Errors

Every request gets a short reference (`X-Request-Ref`). An error page shows it, and the Worker logs one JSON line
per 5xx, per upstream API failure and per error that happened only in the browser (reported to `/telemetry/error`):
the reference, the route pattern (never the path itself), the status, the build id and the API's request id when
there is one. Lines are built in `app/lib/telemetry.ts` from an allowlist; `pnpm test` checks the redaction.

## Live updates

The list page and `/app` poll `/live` every 15 seconds while the tab is visible. `/live` reads the API's events
log server-side (`/lists/{id}/events`, `/me/events`) and the page revalidates when something new arrives.

## Deploying

The production Worker is named `wantmcp-web` (a service name; the repository is `wantmcp`). Set `API_BASE_URL`, `SITE_ORIGIN` and `MCP_URL` in
`wrangler.jsonc` (or as Worker variables), add the `WEB_PROXY_SECRET` secret, optionally set `SOURCE_URL` to show a
"Source" link in the footer (hidden when unset), optionally set `CF_WEB_ANALYTICS_TOKEN` to count page views on
public pages with Cloudflare Web Analytics (no cookies; unset means no beacon and nothing extra in the CSP), then,
from `apps/web`:

```sh
pnpm run deploy    # pnpm build && wrangler deploy
```

## Licence

MIT, see [LICENSE](../../LICENSE).
