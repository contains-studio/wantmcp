/**
 * SPEC 23: every request our checks make says so (x-wantmcp-check: 1), so the site never counts it as a visit.
 * Importing this file tags every fetch; call tagPage(page) on each Puppeteer page.
 */
export const CHECK_HEADER = { "x-wantmcp-check": "1" };

const plain = globalThis.fetch;
globalThis.fetch = (input, init = {}) => {
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set("x-wantmcp-check", "1");
  return plain(input, { ...init, headers });
};

/** Tag a Puppeteer page's requests too. */
export async function tagPage(page) {
  await page.setExtraHTTPHeaders(CHECK_HEADER);
  return page;
}
