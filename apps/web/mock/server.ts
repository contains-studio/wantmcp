/**
 * Run the mock API as a standalone HTTP server, for curl or for pointing the web app
 * (or anything else) at a real URL:
 *
 *   pnpm mock            # http://localhost:8788/v1
 *   PORT=9000 pnpm mock
 *
 * Needs Node 22.18+ (runs TypeScript directly).
 */
import { createServer } from "node:http";
import { handleMockRequest } from "./api.ts";

const port = Number(process.env.PORT ?? 8788);

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const method = req.method ?? "GET";
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks),
  });
  const response = await handleMockRequest(request);
  res.writeHead(response.status, {
    ...Object.fromEntries(response.headers),
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => {
  console.log(`Mock Want MCP API on http://localhost:${port}/v1  (sign in with any email, code 123456)`);
});
