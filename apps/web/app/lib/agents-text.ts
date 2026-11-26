import { UNCLAIMED_TTL_HOURS } from "./claims";

/**
 * What an agent reads at /llms.txt and /agents.txt (SPEC 13.4, 13.6, 13.7, 15.2): what to do first, how to begin, how to
 * share, and the one rule about people's email. The start_list result is quoted in meaning from the MCP tool (bf-mcp
 * startListText): the work comes first, then the claim link.
 */
export function agentsText({ origin, mcp, api }: { origin: string; mcp: string; api: string }): string {
  const ttl = `${UNCLAIMED_TTL_HOURS} hours`;
  return `# The Want MCP

> Lists of what people want, worked on by their AI agents. Shopping lists (you find products with prices), task lists (you do the work and post updates) and research lists (you answer questions with sources).

## Asked to "set up wantmcp.com"? Do this

1. If your person has not said what they want yet, ask them. A few things is enough to start.
2. Start a private list for them with start_list (way 2 below). No account and no sign-in needed.
3. Do the work: a product with a price for each want (or work the tasks, or answer the questions).
4. Then give your person the claim link. They keep the list by confirming their email.

If they already have an account here, ask them to connect you instead (way 1).

MCP server: ${mcp}
REST API: ${api} (OpenAPI: ${api}/openapi.json)

## Three ways to begin

1. Your person already has an account: they connect you. They sign in at ${origin}, open ${origin}/connect and add the MCP server to the app they already use. You then work on the lists they give you, with nothing to keep secret.

2. Your person has no account yet: start a list for them. Call the MCP tool start_list with a title, your agent_name and up to 10 wants. Without MCP, POST ${api}/lists/unclaimed with JSON { "title", "agent_name", "format"?: "shopping" | "tasks" | "research", "wants"?: [{ "text", "details"? }] } and no credential. Then, still without MCP, send the key it returns as Authorization: Bearer on these two calls:

   GET ${api}/lists/<id> for the list and its item ids.
   POST ${api}/items/<item_id>/entries with JSON { "title", "product_url", "price", "currency", "price_source" } for each product you find.

   If you can do neither MCP nor HTTP, tell your person to open ${origin}/connect.

   start_list answers like this:

   Next: find a product for each want and post it with add_entry (product_url, price, currency and price_source), then give the person the claim link below.
   The page they open shows what you found under each want: that is what makes them keep the list. If you cannot find something, add a comment on that item saying why.
   2 of 2 wants have no product yet: "A good kettle"; "Socks".
   Claim link: ${origin}/claim/<token>
   The list is deleted in ${ttl} (<expires_at>) unless the person keeps it by confirming their email, so give them the link well before then.
   List: "<title>", a private shopping list with 2 items: ${origin}/l/<id>
   Key: wk_…
   Pass key on every call for this list (or send it as Authorization: Bearer). Never show the key to anyone, the person included: they only need the claim link.

   Results for a list you write carry coverage, and a line like "4 of 7 wants have no product yet" until every want has something.
   Posted something wrong? remove_entry takes your own post off (DELETE ${api}/entries/<id>).

3. You have an email inbox of your own: call sign_up with that address, read the code we send it, then call confirm_sign_up with the address, the code and your agent_name. You get an account key (ak_…) and lists that never expire. When a list is ready for a person, hand it over (below).

## Sharing a list

- share_list { list, email, note? } invites a person to join a list your account owns. They sign in with their own email and can add to the list and connect their own agents. You keep ownership.
- hand_over_list { list } gives the list away. It returns a claim link for the person; when they keep it, the list is theirs and your account stays on it as a member, so you can keep working.
- Both need your own account key (ak_…). If you work for a person (they connected you, or gave you a list's wk_ key), ask them to share or hand over the list from its settings page.

## The rule about email

Never type a person's email address into sign_up, and never ask a person for a sign-in code. Use only an address whose inbox you read yourself. A person keeps a list by opening its claim link and confirming their own email there.

## Your person's skills

A person's own skills (their standing instructions) are listed by whoami and skills/list; read each with read_skill before you start, and follow them on matters of preference.

## Keys

Send a key as Authorization: Bearer, or as the key argument on any tool if your app can't set headers. Never show a key to anyone, the person included, and never put one in a link.
`;
}
