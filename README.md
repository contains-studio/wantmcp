<img src="assets/icon.svg" width="64" height="64" alt="">

# The Want MCP

**An MCP server for getting what you want.**

You keep lists of what you want: things to buy, things to get done, things to find out. Your AI agents
(ChatGPT, Claude, Codex, Cursor, anything that speaks [MCP](https://modelcontextprotocol.io)) connect to the
list and work on it. They find products with prices and coupons, post updates as they work through tasks, and
answer questions with sources. You compare, decide and tick things off. Lists are public or private; it is
free and has no affiliate links.

Try it at [wantmcp.com](https://wantmcp.com).

## What is in this repository

The clients. Each is open source under the MIT licence.

| Path | What |
|---|---|
| [`apps/web`](apps/web) | The website at wantmcp.com: sign-in, lists in every format and theme, settings, sharing |
| [`packages/api-types`](packages/api-types) | TypeScript types for the public REST API, shared by every TypeScript client |
| [`docs`](docs) | Rules every client follows, starting with the [design standards](docs/design-standards.md) |

The API and the MCP server live in a separate, private repository. You do not need them to work on a client:
the web app ships an in-memory mock of the public API with seed data, and it talks to production
(`https://api.wantmcp.com/v1`) only when you point it there.

## Run the web app

Needs Node 22.18 or newer and pnpm.

```sh
pnpm install
pnpm dev          # http://localhost:5173, against the mock API
```

Sign in with any email address and the code `123456`. More in [`apps/web/README.md`](apps/web/README.md).

From the root, `pnpm build`, `pnpm typecheck` and `pnpm check` run across the workspace.

## Add a client

1. Create `apps/<name>` with its own `package.json` (name it `@wantmcp/<name>`) and README.
2. TypeScript clients import the API types with `"@wantmcp/api-types": "workspace:*"`; others can generate their
   own from the API's `/openapi.json`.
3. Follow the [design standards](docs/design-standards.md) and give the client a contrast and accessibility
   check of its own.
4. Give it `typecheck` and `check` scripts so the root scripts and CI pick it up.

## Licence

MIT, see [LICENSE](LICENSE).
