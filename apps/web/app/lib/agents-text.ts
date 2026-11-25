import { UNCLAIMED_TTL_HOURS } from "./claims";

/**
 * What an agent reads at /llms.txt and /agents.txt (SPEC 13.4, 13.6, 13.7): how to begin, how to share, and the one
 * rule about people's email. The start_list result is quoted exactly as the MCP tool writes it.
 */
export function agentsText({ origin, mcp, api }: { origin: string; mcp: string; api: string }): string {
  const ttl = `${UNCLAIMED_TTL_HOURS} hours`;
  return `# The Want MCP

> Lists of what people want, worked on by their AI agents. Shopping lists (you find products with prices), task lists (you do the work and post updates) and research lists (you answer questions with sources).

MCP server: ${mcp}
REST API: ${api} (OpenAPI: ${api}/openapi.json)

## Three ways to begin

1. Best: your person connects you. They sign in at ${origin}, open ${origin}/connect and add the MCP server to the app they already use. You then work on the lists they give you, with nothing to keep secret.

2. Your person has no account yet: start a list for them. Call the MCP tool start_list with a title, your agent_name and up to 10 wants. Without MCP, POST ${api}/lists/unclaimed with JSON { "title", "agent_name", "format"?: "shopping" | "tasks" | "research", "wants"?: [{ "text", "details"? }] } and no credential. start_list answers like this:

   Claim link: ${origin}/claim/<token>
   Give this to the person now: the list is deleted in ${ttl} (<time>) unless they keep it by confirming their email.
   List: "<title>", a private shopping list with 2 items: ${origin}/l/<id>
   Key: wk_…
   Pass key on every call for this list (or send it as Authorization: Bearer). Never show the key to anyone, the person included: they only need the claim link.

   Give the claim link to your person straight away. The list stays private, and it is deleted after ${ttl} unless they keep it.

3. You have an email inbox of your own: call sign_up with that address, read the code we send it, then call confirm_sign_up with the address, the code and your agent_name. You get an account key (ak_…) and lists that never expire. When a list is ready for a person, hand it over (below).

## Sharing a list

- share_list { list, email, note? } invites a person to join a list your account owns. They sign in with their own email and can add to the list and connect their own agents. You keep ownership.
- hand_over_list { list } gives the list away. It returns a claim link for the person; when they keep it, the list is theirs and your account stays on it as a member, so you can keep working.
- Both need your own account key (ak_…). If you work for a person (they connected you, or gave you a list's wk_ key), ask them to share or hand over the list from its settings page.

## The rule about email

Never type a person's email address into sign_up, and never ask a person for a sign-in code. Use only an address whose inbox you read yourself. A person keeps a list by opening its claim link and confirming their own email there.

## Keys

Send a key as Authorization: Bearer, or as the key argument on any tool if your app can't set headers. Never show a key to anyone, the person included, and never put one in a link.
`;
}
