import { useEffect, useState } from "react";
import { data, Link, useFetcher } from "react-router";
import { AGENT_PROMPT_WITH_KEY, fillPrompt } from "~/lib/agent-prompt";
import { agentsText } from "~/lib/agents-text";
import { AgentPromptBuilder } from "~/components/AgentPrompt";
import { api, formError } from "~/lib/api.server";
import { assertSameOrigin, getSessionToken } from "~/lib/session.server";
import type { ListSummary } from "~/lib/types";
import type { Route } from "./+types/connect";
import { CopyButton } from "~/components/CopyButton";
import { apiBaseUrl, mcpUrl, siteOrigin } from "~/lib/config.server";
import { signinUrl, useRootData } from "~/lib/hooks";
import { BRANDS, type Brand } from "~/lib/brands";
import { BrandLogo } from "~/components/BrandLogo";

export async function loader({ request }: Route.LoaderArgs) {
  // Signed in: offer the person's own lists in the agent prompt (so the page is private then).
  const signedIn = Boolean(getSessionToken(request));
  const lists = signedIn ? await api<ListSummary[]>(request, "/me/lists").catch(() => [] as ListSummary[]) : [];
  // Most recently active first; ?list=<id> (from a list page or its settings) preselects that list.
  const mine = [...lists]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((l) => ({ id: l.id, title: l.title, url: l.url, shared: l.my_role !== "owner", format: l.format ?? "shopping" }));
  const asked = new URL(request.url).searchParams.get("list");
  const selected = mine.find((l) => l.id === asked)?.id ?? mine[0]?.id ?? null;
  const base = apiBaseUrl();
  const forAgents = agentsText({ origin: siteOrigin(request), mcp: mcpUrl(), api: base === "mock" ? "https://api.wantmcp.com/v1" : base });
  const asked_app = new URL(request.url).searchParams.get("app");
  const app = CLIENTS.some((c) => c.id === asked_app) ? asked_app : null;
  return data(
    { origin: siteOrigin(request), signedIn, lists: mine, selected, forAgents, app },
    { headers: { "Cache-Control": signedIn ? "private, no-store" : "public, max-age=300, s-maxage=3600", Vary: "Cookie" } },
  );
}

/** "Create a key for <app>": a write key for one list, made with the person's session. */
export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  if (form.get("intent") !== "create-key") return data({ error: "Unknown action" }, 400);
  const listId = String(form.get("list_id") ?? "");
  try {
    const res = await api<{ key: string }>(request, `/lists/${encodeURIComponent(listId)}/keys`, {
      method: "POST",
      body: { agent_name: String(form.get("agent_name") ?? "").slice(0, 60) },
    });
    const list = await api<ListSummary>(request, `/lists/${encodeURIComponent(listId)}`);
    return data({ ok: true, key: res.key, listUrl: list.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return data(formError(err), 400);
  }
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const description = "Add The Want MCP to ChatGPT, Claude, Codex, Cursor or any AI app, step by step.";
  return [
    { title: "Connect an agent · The Want MCP" },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/connect` },
    { property: "og:title", content: "Connect an agent to The Want MCP" },
    { property: "og:description", content: description },
    { property: "og:url", content: `${origin}/connect` },
    { property: "og:image", content: `${origin}/og/home.png?v=13` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

const CHECKED = "24 Nov 2026";

/** One app: at most three steps and one thing to copy; caveats, other ways and sources behind "Details and troubleshooting". */
type Client = {
  id: string;
  name: string;
  status: "confirmed" | "partial" | "generic" | "soon";
  sources: Array<[string, string]>;
  steps: (ctx: Ctx) => React.ReactNode;
  more?: (ctx: Ctx) => React.ReactNode;
};

/** The server URL with its own Copy, inside a step. */
function UrlCopy({ mcp }: { mcp: string }) {
  return (
    <span className="mt-2 flex items-stretch gap-2">
      <code className="input flex min-w-0 flex-1 items-center break-all font-mono text-[0.8rem]">{mcp}</code>
      <CopyButton text={mcp} label="Copy" ariaLabel="Copy server URL" className="btn btn-sm" />
    </span>
  );
}

/**
 * The prompt for apps that need a write key. Signed in: "Create a key for <app>" makes one for the chosen list (the call
 * list settings uses) and fills it in, shown once, leaving only through Copy. Signed out: the placeholders, and a way to
 * sign in to fill them.
 */
function KeyPrompt({ ctx, agent }: { ctx: Ctx; agent: string }) {
  const fetcher = useFetcher<{ ok?: boolean; key?: string; listUrl?: string; error?: string }>();
  const [listId, setListId] = useState(ctx.selected ?? ctx.lists[0]?.id ?? "");
  const made = fetcher.data?.ok && fetcher.data.key ? fetcher.data : null;
  if (made) {
    const text = fillPrompt(AGENT_PROMPT_WITH_KEY, { mcpUrl: ctx.mcp, listUrl: made.listUrl ?? "", key: made.key });
    return (
      <div className="grid gap-2">
        <pre className="codeblock text-[0.78rem]" tabIndex={0} role="region" aria-label={`Prompt for ${agent}, with your new key`}>
          {text}
        </pre>
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={text} label="Copy prompt" className="btn btn-want btn-sm" />
          <span className="text-[0.85rem] text-ink-3">Shown once. The key works on this list only; revoke it in list settings.</span>
        </div>
      </div>
    );
  }
  if (!ctx.signedIn) {
    const text = fillPrompt(AGENT_PROMPT_WITH_KEY, { mcpUrl: ctx.mcp, listUrl: "https://wantmcp.com/l/YOUR_LIST", key: "wk_YOUR_WRITE_KEY" });
    return (
      <div className="grid gap-2">
        <pre className="codeblock text-[0.78rem]" tabIndex={0} role="region" aria-label={`Prompt for ${agent}`}>
          {text}
        </pre>
        <p className="text-[0.85rem] text-ink-2">
          <Link to={`/login?next=${encodeURIComponent(`/connect?app=${agent === "Muse" ? "muse" : "grok-bot"}`)}`} className="link">
            Sign in to fill this in
          </Link>{" "}
          with your list and a key.
        </p>
      </div>
    );
  }
  if (!ctx.lists.length) {
    return (
      <p className="text-ink-2">
        <Link to="/app/new" className="link">
          Make a list
        </Link>{" "}
        first, then come back to give it to {agent}.
      </p>
    );
  }
  return (
    <fetcher.Form method="post" className="grid gap-2">
      <input type="hidden" name="intent" value="create-key" />
      <input type="hidden" name="agent_name" value={agent} />
      {ctx.lists.length > 1 ? (
        <label className="field max-w-md">
          <span className="label">List</span>
          <select name="list_id" value={listId} onChange={(e) => setListId(e.target.value)} className="input">
            {ctx.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="list_id" value={listId} />
      )}
      <button className="btn btn-want btn-sm w-fit" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Creating…" : `Create a key for ${agent}`}
      </button>
      {fetcher.data?.error && (
        <p className="form-error" role="alert">
          {fetcher.data.error}
        </p>
      )}
    </fetcher.Form>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div className="grid gap-2">
      <pre className="codeblock">{children}</pre>
      <CopyButton text={children} className="btn btn-ghost btn-sm w-fit" />
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="grid list-decimal gap-1.5 pl-5 marker:text-ink-3">{children}</ol>;
}

const b64 = (s: string) => (typeof btoa === "function" ? btoa(s) : Buffer.from(s).toString("base64"));

type Ctx = { mcp: string; signedIn: boolean; lists: MyList[]; selected: string | null };
type MyList = { id: string; title: string; url: string; shared: boolean; format?: string };

const CLIENT_LIST: Client[] = [
  {
    id: "grok-bot",
    name: "Grok Bot",
    status: "partial",
    sources: [
      ["xAI: Grok Bot computer and apps", "https://docs.x.ai/grok-bot/computer-and-apps"],
      ["xAI: Grok Bot overview", "https://docs.x.ai/grok-bot/overview"],
    ],
    steps: (c) => (
      <>
        <p>Paste this in a chat with Grok Bot. It adds the server itself and sends your key with every call.</p>
        <KeyPrompt ctx={c} agent="Grok Bot" />
      </>
    ),
    more: (c) => (
      <>
        <p>Or add it by hand in the Grok Bot desktop app:</p>
        <Steps>
          <li>
            Choose <strong>Add a custom connector</strong>, then <strong>Remote HTTPS</strong>.
          </li>
          <li>
            Server URL: <code>{c.mcp}</code>
          </li>
          <li>
            HTTP header: <code>Authorization: Bearer wk_…</code> with a write key from your list settings. Leave the OAuth fields empty.
          </li>
        </Steps>
        <p>The steps are from xAI's docs; we haven't tested the prompt in Grok Bot yet. A team admin's MCP policy can block new servers.</p>
      </>
    ),
  },
  {
    id: "muse",
    name: "Muse",
    status: "generic",
    sources: [["Meta: How Muse works with Connectors", "https://www.meta.com/help/superintelligence/1687253048996149/"]],
    steps: (c) => (
      <>
        <p>Paste this in a chat with Muse. It creates a custom connector and keeps your key in its credential store.</p>
        <KeyPrompt ctx={c} agent="Muse" />
      </>
    ),
    more: () => <p>Muse has no "add server" setting. Meta's docs describe custom connectors but don't mention MCP servers; we haven't tested this in Muse yet.</p>,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    status: "confirmed",
    sources: [
      ["OpenAI: custom MCP servers", "https://developers.openai.com/api/docs/guides/custom-mcp-server"],
      ["OpenAI Help Center", "https://help.openai.com/en/articles/12584461"],
    ],
    steps: (c) => (
      <Steps>
        <li>
          On chatgpt.com, go to <strong>Plugins</strong> › <strong>+</strong> › <strong>Add custom MCP server</strong>.
        </li>
        <li>
          Name it The Want MCP, paste the server URL as <strong>Connection</strong>, choose <strong>OAuth</strong>, tick{" "}
          <strong>I understand and want to continue</strong> and press <strong>Create as a plugin</strong>.
          <UrlCopy mcp={c.mcp} />
        </li>
        <li>
          Install it, sign in and tick your lists. In a chat, type <kbd>@</kbd> and pick The Want MCP.
        </li>
      </Steps>
    ),
    more: () => (
      <p>
        Business, Enterprise and Edu: full access (an admin, owner or permitted member adds it). Pro: reads lists, can't post. Plus and Free: not in OpenAI's
        docs. ChatGPT asks before each change.
      </p>
    ),
  },
  {
    id: "claude",
    name: "Claude",
    status: "confirmed",
    sources: [["Claude Help Center: custom connectors", "https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp"]],
    steps: (c) => (
      <Steps>
        <li>
          On claude.ai or the desktop app: <strong>Customize › Connectors › + Add › Add custom connector</strong>.
        </li>
        <li>
          Name it The Want MCP, paste the server URL and press <strong>Continue</strong>.
          <UrlCopy mcp={c.mcp} />
        </li>
        <li>
          Under Authentication choose <strong>Sign in now</strong>. Claude pre-selects <strong>No sign-in</strong>, and with that it can't see your
          private lists.
          {/* Owner's screenshot of the Claude desktop app, 25 Nov 2026: the step where the wrong choice is the default. */}
          <figure className="mt-2 grid max-w-[26rem] gap-1.5">
            <img
              src="/shots/claude-add-custom-connector.webp"
              alt="Claude's Add custom connector screen for The Want MCP. Under Authentication there are three choices: Sign in now, Sign in when needed, and No sign-in, which is selected and marked Detected. Below is a Request headers section with an authorization header."
              width={820}
              height={1061}
              loading="lazy"
              decoding="async"
              className="h-auto w-full rounded-xl border border-line"
            />
            <figcaption className="text-[0.82rem] text-ink-3">The screen as Claude first shows it. Change the choice to Sign in now.</figcaption>
          </figure>
        </li>
        <li>
          Press <strong>Add</strong>, sign in and tick the lists Claude can work on. It then works on mobile too.
        </li>
      </Steps>
    ),
    more: () => (
      <p>
        Leave <strong>Use Claude's published identity (Recommended)</strong> selected. Prefer a key to signing in? Keep <strong>No sign-in</strong> and add
        a request header named <strong>authorization</strong> with the value <code>Bearer wk_your_key</code> (a list's key, from its settings): Claude can
        then work on that one list. Free (one custom connector), Pro, Max, Team, Enterprise. Team and Enterprise: an owner adds it in{" "}
        <strong>Organization settings › Connectors</strong> (Add › Custom › Web), then members press <strong>Connect</strong>.
      </p>
    ),
  },
  {
    id: "claude-code",
    name: "Claude Code",
    status: "confirmed",
    sources: [["Claude Code docs: MCP", "https://code.claude.com/docs/en/mcp"]],
    steps: (c) => (
      <>
        <p>Paste this into Claude Code. It adds the server, signs in and starts on your list.</p>
        <AgentPromptBuilder mcpUrl={c.mcp} lists={c.lists} selected={c.selected} signedIn={c.signedIn} />
      </>
    ),
    more: (c) => (
      <>
        <p>Or add it yourself, then run <code>/mcp</code> in a session to sign in:</p>
        <Code>{`claude mcp add --transport http --scope user wantmcp ${c.mcp}`}</Code>
        <p>With a key from list settings instead (no sign-in):</p>
        <Code>{`claude mcp add --transport http wantmcp ${c.mcp} \\\n  --header "Authorization: Bearer wk_your_key"`}</Code>
      </>
    ),
  },
  {
    id: "codex",
    name: "Codex",
    status: "confirmed",
    sources: [
      ["OpenAI: Codex MCP", "https://learn.chatgpt.com/docs/extend/mcp"],
      ["OpenAI: Codex config reference", "https://learn.chatgpt.com/docs/config-file/config-reference"],
    ],
    steps: (c) => (
      <>
        <p>Paste this into Codex. It adds the server, signs in and starts on your list.</p>
        <AgentPromptBuilder mcpUrl={c.mcp} lists={c.lists} selected={c.selected} signedIn={c.signedIn} />
      </>
    ),
    more: (c) => (
      <>
        <p>Or from the command line, with sign-in:</p>
        <Code>{`codex mcp add wantmcp --url ${c.mcp}\ncodex mcp login wantmcp`}</Code>
        <p>
          With a key, in <code>~/.codex/config.toml</code>:
        </p>
        <Code>{`[mcp_servers.wantmcp]\nurl = "${c.mcp}"\nbearer_token_env_var = "WANTMCP_TOKEN"`}</Code>
        <p>
          Runs without you there (<code>codex exec</code>, scheduled tasks) can't stop to ask before each tool call. Let this server's tools run without asking:
        </p>
        <Code>{`[mcp_servers.wantmcp]\ndefault_tools_approval_mode = "approve"`}</Code>
        <p>
          Editor extension: gear › <strong>MCP servers</strong> › <strong>Add server</strong> › <strong>Streamable HTTP</strong>. Enter the URL, save,{" "}
          <strong>Restart extension</strong>, then <strong>Authenticate</strong>.
        </p>
      </>
    ),
  },
  {
    id: "grok",
    name: "Grok",
    status: "partial",
    sources: [
      ["xAI: Grok connectors", "https://docs.x.ai/grok/connectors"],
      ["xAI: Grok Build MCP servers", "https://docs.x.ai/build/features/mcp-servers"],
      ["xAI API: remote MCP", "https://docs.x.ai/developers/tools/remote-mcp"],
    ],
    steps: (c) => (
      <Steps>
        <li>
          Go to <strong>grok.com/connectors › New Connector › Custom</strong>.
        </li>
        <li>
          Paste the server URL.
          <UrlCopy mcp={c.mcp} />
        </li>
        <li>Sign in and pick your lists.</li>
      </Steps>
    ),
    more: (c) => (
      <>
        <p>xAI's docs don't yet list plans or sign-in methods. Grok Build CLI (checked):</p>
        <Code>{`grok mcp add --transport http wantmcp ${c.mcp}`}</Code>
        <p>xAI API, in your request:</p>
        <Code>{`{ "type": "mcp", "server_url": "${c.mcp}", "server_label": "wantmcp",\n  "authorization": "wk_your_key" }`}</Code>
      </>
    ),
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    status: "partial",
    sources: [
      ["OpenClaw docs: MCP", "https://docs.openclaw.ai/tools/mcp"],
      ["OpenClaw docs: transports", "https://docs.openclaw.ai/cli/mcp/transports"],
    ],
    steps: (c) => (
      <>
        <p>Run these three commands, then sign in when OpenClaw opens the browser:</p>
        <Code>{`openclaw mcp add wantmcp --url ${c.mcp} --transport streamable-http --auth oauth\nopenclaw mcp login wantmcp\nopenclaw mcp doctor wantmcp --probe`}</Code>
      </>
    ),
    more: (c) => (
      <>
        <p>Or with a key, in your OpenClaw config:</p>
        <Code>{`{ "mcp": { "servers": { "wantmcp": {\n  "url": "${c.mcp}",\n  "transport": "streamable-http",\n  "headers": { "Authorization": "Bearer \${WANTMCP_TOKEN}" }\n} } } }`}</Code>
        <p>
          Set <code>transport</code> explicitly: OpenClaw defaults to SSE. With OAuth on, it ignores static headers.
        </p>
      </>
    ),
  },
  {
    id: "cursor",
    name: "Cursor",
    status: "confirmed",
    sources: [
      ["Cursor docs: MCP", "https://cursor.com/docs/context/mcp"],
      ["Cursor docs: install links", "https://cursor.com/docs/context/mcp/install-links"],
    ],
    steps: (c) => (
      <Steps>
        <li>
          <a className="btn btn-sm" href={`cursor://anysphere.cursor-deeplink/mcp/install?name=wantmcp&config=${encodeURIComponent(b64(JSON.stringify({ url: c.mcp })))}`}>
            Add to Cursor
          </a>{" "}
          <span className="hint">opens Cursor if it's installed</span>
        </li>
        <li>Sign in when Cursor asks.</li>
      </Steps>
    ),
    more: (c) => (
      <>
        <p>
          Or add it to <code>~/.cursor/mcp.json</code> (all projects) or <code>.cursor/mcp.json</code> (one project). Leave out <code>headers</code> to sign in
          with OAuth:
        </p>
        <Code>{`{\n  "mcpServers": {\n    "wantmcp": {\n      "url": "${c.mcp}",\n      "headers": { "Authorization": "Bearer \${env:WANTMCP_TOKEN}" }\n    }\n  }\n}`}</Code>
      </>
    ),
  },
  {
    id: "gemini",
    name: "Gemini",
    status: "partial",
    sources: [["Google: MCP servers with Gemini CLI", "https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md"]],
    steps: (c) => (
      <Steps>
        <li>
          Add this to <code>~/.gemini/settings.json</code>:
          <Code>{`{\n  "mcpServers": {\n    "wantmcp": { "httpUrl": "${c.mcp}" }\n  }\n}`}</Code>
        </li>
        <li>
          In Gemini CLI, run <code>/mcp auth wantmcp</code> and sign in in the browser.
        </li>
      </Steps>
    ),
    more: () => <p>The Gemini app itself doesn't take custom MCP servers yet; these steps are for Gemini CLI.</p>,
  },
  {
    id: "hermes",
    name: "Hermes",
    status: "partial",
    sources: [["Hermes Agent docs: MCP", "https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp"]],
    steps: (c) => (
      <>
        <p>
          Add this to <code>~/.hermes/config.yaml</code>, start <code>hermes chat</code>, and sign in when Hermes shows the link:
        </p>
        <Code>{`mcp_servers:\n  wantmcp:\n    url: "${c.mcp}"\n    auth: oauth`}</Code>
      </>
    ),
    more: (c) => (
      <>
        <p>Or with a key from your list's settings, kept in <code>~/.hermes/.env</code> as WANTMCP_TOKEN:</p>
        <Code>{`mcp_servers:\n  wantmcp:\n    url: "${c.mcp}"\n    headers:\n      Authorization: "Bearer \${WANTMCP_TOKEN}"`}</Code>
        <p>From Hermes Agent's own docs. We haven't run it in Hermes yet.</p>
      </>
    ),
  },
  {
    id: "hark",
    name: "Hark",
    status: "generic",
    sources: [["Hark", "https://hark.com/"]],
    steps: (c) => (
      <>
        <p>Paste this in a chat with Hark.</p>
        <KeyPrompt ctx={c} agent="Hark" />
      </>
    ),
    more: () => <p>Hark publishes no "add a server" setting that we could find, and we haven't tested this in Hark yet.</p>,
  },
  {
    id: "instinct",
    name: "Instinct",
    status: "generic",
    sources: [["Instinct", "https://instinct.com/"]],
    steps: (c) => (
      <>
        <p>Send this to Instinct.</p>
        <KeyPrompt ctx={c} agent="Instinct" />
      </>
    ),
    more: () => <p>Instinct publishes no "add a server" setting that we could find, and we haven't tested this in Instinct yet.</p>,
  },
  {
    id: "msgblast",
    name: "msgblast",
    // Not released yet (brands.ts comingSoon): no steps until it ships.
    status: "soon",
    sources: [],
    steps: () => <p className="text-ink-2">Not available yet.</p>,
  },
  {
    id: "other",
    name: "Other apps",
    status: "generic",
    sources: [],
    steps: (c) => (
      <Steps>
        <li>
          In any app that takes remote MCP servers (Streamable HTTP), add the server URL.
          <UrlCopy mcp={c.mcp} />
        </li>
        <li>Sign in when the app asks.</li>
      </Steps>
    ),
    more: (c) => (
      <>
        <p>
          To use a key instead, send <code>Authorization: Bearer wk_…</code> with a key from your list settings. Reading public lists needs no sign-in.
        </p>
        <p>
          If the app never asks you to sign in, use <code>{signinUrl(c.mcp)}</code> instead. Apps with only local servers need a stdio-to-HTTP proxy.
        </p>
      </>
    ),
  },
];

/** The order the owner uses: ChatGPT, Codex, Claude, Grok Bot, Muse, OpenClaw, then the rest. */
const ORDER = ["chatgpt", "codex", "claude", "claude-code", "grok-bot", "muse", "openclaw", "cursor", "grok", "gemini", "hermes", "hark", "instinct", "msgblast", "other"];
const CLIENTS = [...CLIENT_LIST].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

const STATUS = {
  confirmed: { label: `Checked ${CHECKED}`, cls: "chip chip-live" },
  partial: { label: `Partly checked ${CHECKED}`, cls: "chip chip-warn" },
  generic: null,
  soon: { label: "Coming soon", cls: "chip" },
};

/** Each client's mark. Claude Code uses the Claude symbol with its name beside it, as Codex uses OpenAI's. */
const CLAUDE_CODE: Brand = { id: "claude-code", name: "Claude Code", logo: { light: "/brands/claude-spark.svg", width: 2000, height: 2000, nameBeside: true, optical: 1.3 } };
function brandFor(c: Client): Brand {
  if (c.id === "claude-code") return CLAUDE_CODE;
  return BRANDS.find((x) => x.id === c.id && x.logo) ?? { id: c.id, name: c.name };
}

const ASKS: Array<[string, string]> = [
  ["Shopping", "Find two cheaper products for each want on my Want MCP list."],
  ["Tasks", "Do the next open task on my Want MCP list."],
  ["Research", "Answer the open questions on my Want MCP list, with sources."],
];

export default function Connect({ loaderData }: Route.ComponentProps) {
  const { mcpUrl } = useRootData();
  const app = useChosenApp(loaderData.app);
  return (
    <div className="wrap grid gap-12 py-10 sm:py-14">
      <header className="grid max-w-3xl gap-5">
        <h1 className="display text-[2.25rem] sm:text-[2.75rem]">Connect an agent</h1>
        <p className="max-w-[65ch] text-[1.0625rem] text-ink-2">Add The Want MCP to your AI app, sign in, and pick the lists it can work on.</p>
        {!loaderData.signedIn && (
          <p className="text-[0.95rem] text-ink-2">
            No account yet?{" "}
            <a href="#for-agents" className="link">
              Your agent can start a list for you
            </a>
            .
          </p>
        )}
        <div className="grid max-w-xl gap-1.5">
          <span id="url-l" className="label">
            Server URL
          </span>
          <div className="flex items-stretch gap-2">
            <code aria-labelledby="url-l" className="input flex min-w-0 flex-1 items-center break-all font-mono text-[0.8rem] sm:text-[0.95rem]">
              {mcpUrl}
            </code>
            <CopyButton text={mcpUrl} label="Copy" ariaLabel="Copy server URL" className="btn btn-primary" />
          </div>
        </div>
      </header>

      <AppPicker
        app={app}
        ctx={{ mcp: mcpUrl, signedIn: loaderData.signedIn, lists: loaderData.lists, selected: loaderData.selected }}
        listParam={loaderData.selected}
      />

      <AwaySection />


      {/* The same text agents read at /llms.txt and /agents.txt, for anyone (or any agent) reading this page. */}
      <section id="for-agents" aria-labelledby="agents-h" className="grid scroll-mt-24 gap-4 lg:grid-cols-[18rem_1fr] lg:gap-10">
        <div className="grid content-start gap-2">
          <h2 id="agents-h" className="serif text-[1.75rem] leading-tight">
            For agents
          </h2>
          <p className="text-[0.9rem] text-ink-3">
            Also at <a href="/llms.txt" className="link">/llms.txt</a>.
          </p>
        </div>
        <pre className="max-w-3xl font-sans text-[0.88rem] leading-relaxed whitespace-pre-wrap text-ink-2">{loaderData.forAgents}</pre>
      </section>
    </div>
  );
}

const AWAY_PROMPT = "Every morning, call get_updates on my Want MCP lists, re-check the prices you posted, and answer what is new.";

/** Clients whose own docs confirm scheduled runs that can use MCP tools (checked 26 Nov 2026). */
const SCHEDULERS: Array<[name: string, feature: string, href: string]> = [
  ["ChatGPT", "Scheduled tasks", "https://learn.chatgpt.com/docs/automations"],
  ["Claude", "Scheduled tasks", "https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork"],
  ["Claude Code", "Scheduled tasks", "https://code.claude.com/docs/en/routines"],
  ["Codex", "Scheduled tasks in the desktop app", "https://learn.chatgpt.com/docs/automations"],
  ["Cursor", "Automations", "https://cursor.com/docs/cloud-agent/automations"],
  ["Grok Bot", "Routines", "https://docs.x.ai/grok-bot/skills-routines-and-automations"],
];

function AwaySection() {
  return (
    <section aria-labelledby="away-h" className="grid gap-4 lg:grid-cols-[18rem_1fr] lg:gap-10">
      <div className="grid content-start gap-2">
        <h2 id="away-h" className="serif text-[1.75rem] leading-tight">
          Keep it working when you're away
        </h2>
        <p className="text-ink-2">Schedule a run in your agent with this instruction.</p>
      </div>
      <div className="grid min-w-0 max-w-3xl gap-4">
        <div className="grid gap-2">
          <pre className="codeblock" tabIndex={0} role="region" aria-label="Instruction for a scheduled run">
            {AWAY_PROMPT}
          </pre>
          <CopyButton text={AWAY_PROMPT} label="Copy" className="btn btn-sm w-fit" />
        </div>
        <ul className="grid border-t border-line">
          {SCHEDULERS.map(([name, feature, href]) => (
            <li key={name} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line py-2 text-[0.92rem]">
              <span className="font-medium">{name}</span>
              <a href={href} className="link text-ink-2" rel="noopener noreferrer">
                {feature}
              </a>
            </li>
          ))}
        </ul>
        <p className="hint">Codex and Gemini CLI also run without you (codex exec, gemini -p); schedule them with cron.</p>
      </div>
    </section>
  );
}

/** Cloudflare Web Analytics may count views of this page (root.tsx, AnalyticsBeacon). */
export const handle = { analytics: true };

const LAST_APP = "wm_last_app";

/** The app to show: ?app= (works without JavaScript), else #app (links from a list), else the last one used here, else Claude. */
function useChosenApp(fromQuery: string | null): string {
  const [app, setApp] = useState(fromQuery ?? "claude");
  useEffect(() => {
    if (fromQuery) {
      setApp(fromQuery);
      return;
    }
    const hash = window.location.hash.slice(1);
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_APP);
    } catch {
      // no storage: fine
    }
    const pick = [hash, last].find((x) => x && CLIENTS.some((c) => c.id === x));
    if (pick) setApp(pick);
  }, [fromQuery]);
  useEffect(() => {
    try {
      localStorage.setItem(LAST_APP, app);
    } catch {
      // ignore
    }
  }, [app]);
  return app;
}

/** The logo row picks an app; only that app's steps are on the page. */
function AppPicker({ app, ctx, listParam }: { app: string; ctx: Ctx; listParam: string | null }) {
  const c = CLIENTS.find((x) => x.id === app) ?? CLIENTS.find((x) => x.id === "claude")!;
  const status = STATUS[c.status];
  const brand = brandFor(c);
  // What to say next, in the chosen list's own terms (shopping until there is a list).
  const chosenFormat = ctx.lists.find((l) => l.id === ctx.selected)?.format ?? "shopping";
  const thenSay = (ASKS.find(([k]) => k.toLowerCase() === (chosenFormat === "tasks" ? "tasks" : chosenFormat === "research" ? "research" : "shopping")) ?? ASKS[0])[1];
  const href = (id: string) => `/connect?${new URLSearchParams({ app: id, ...(listParam ? { list: listParam } : {}) })}#steps`;
  return (
    <>
      <nav aria-label="Pick your app" className="border-y border-line py-3">
        <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {CLIENTS.map((x) => (
            <li key={x.id}>
              <Link
                to={href(x.id)}
                replace
                preventScrollReset
                aria-current={x.id === c.id ? "page" : undefined}
                className={`brand-tile ${x.id === c.id ? "is-on" : ""}`}
                aria-label={x.name}
                title={x.name}
              >
                {x.id === "other" ? <span className="text-[0.95rem] font-semibold">{x.name}</span> : <BrandLogo brand={brandFor(x)} />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section id="steps" aria-labelledby="steps-h" className="grid scroll-mt-24 gap-4 lg:grid-cols-[18rem_1fr] lg:gap-10">
        <div className="grid content-start justify-items-start gap-2">
          <h2 id="steps-h" className="serif flex items-center gap-2.5 text-[1.6rem] leading-tight">
            {brand.logo?.nameBeside && (
              <span className="flex h-7 w-7 items-center justify-center [&_img]:!h-6 [&_img]:!w-6 [&>span]:hidden" aria-hidden="true">
                <BrandLogo brand={brand} />
              </span>
            )}
            {c.name}
          </h2>
          {status && <span className={`${status.cls} text-[0.75rem]`}>{status.label}</span>}
        </div>
        <div className="grid min-w-0 max-w-3xl gap-4 text-[0.97rem] [&_code]:rounded-[3px] [&_code]:bg-sunk [&_code]:px-1 [&_code]:text-[0.85em]">
          {c.steps(ctx)}
          {c.status !== "soon" && (
            <p className="rounded-md bg-sunk px-4 py-3">
              <span className="font-semibold">Then say:</span> “{thenSay}”{" "}
              <CopyButton text={thenSay} label="Copy" ariaLabel="Copy what to say" className="btn btn-ghost btn-xs" />
            </p>
          )}
          {(c.more || c.sources.length > 0) && (
            <details className="group">
              <summary className="textlink-btn text-[0.9rem]">
                Details and troubleshooting <span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3 grid gap-3 text-[0.92rem] text-ink-2">
                {c.more?.(ctx)}
                {c.sources.length > 0 && (
                  <p className="text-[0.8rem] text-ink-3">
                    Source:{" "}
                    {c.sources.map(([label, url], i) => (
                      <span key={url}>
                        {i > 0 && " · "}
                        <a href={url} className="link" target="_blank" rel="noopener noreferrer">
                          {label}
                        </a>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </details>
          )}
        </div>
      </section>
    </>
  );
}
