# @wantmcp/api-types

TypeScript types for the JSON the public Want MCP REST API returns (`https://api.wantmcp.com/v1`), in the
API's own snake_case shapes. Every TypeScript client in this repository imports them from here:

```ts
import type { ListSummary, Item, Entry } from "@wantmcp/api-types";
```

The package is types only: nothing is emitted at runtime. It is copied from the API contract; when the API
changes, update `src/index.ts` and run `pnpm typecheck` from the repository root.

Fields marked as pending in `src/index.ts` are specified but not yet in the published contract.
