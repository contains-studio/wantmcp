import { data, Link } from "react-router";
import { AgentPromptBuilder, KeyPromptExample } from "~/components/AgentPrompt";
import { api } from "~/lib/api.server";
import { getSessionToken } from "~/lib/session.server";
import type { ListSummary } from "~/lib/types";
import type { Route } from "./+types/connect";
import { CopyButton } from "~/components/CopyButton";
import { siteOrigin } from "~/lib/config.server";
import { signinUrl, useRootData } from "~/lib/hooks";

export async function loader({ request }: Route.LoaderArgs) {
  // Signed in: offer the person's own lists in the agent prompt (so the page is private then).
  const signedIn = Boolean(getSessionToken(request));
  const lists = signedIn ? await api<ListSummary[]>(request, "/me/lists").catch(() => [] as ListSummary[]) : [];
  return data(
    { origin: siteOrigin(request), lists: lists.map((l) => ({ title: l.title, url: l.url })) },
    { headers: { "Cache-Control": signedIn ? "private, no-store" : "public, max-age=300, s-maxage=3600", Vary: "Cookie" } },
  );
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const description =
    "An MCP server for getting what you want. Add it to ChatGPT, Claude, Claude Code, Codex, Grok, OpenClaw, Cursor or any MCP client, so your agents can work on your lists: things to buy, things to get done, questions to answer.";
  return [
    { title: "Connect an agent · The Want MCP" },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/connect` },
    { property: "og:title", content: "Connect an agent to The Want MCP" },
    { property: "og:description", content: description },
    { property: "og:url", content: `${origin}/connect` },
    { property: "og:image", content: `${origin}/og/home.png?v=4` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

const CHECKED = "24 Nov 2026";

type Client = {
  id: string;
  name: string;
  status: "confirmed" | "partial" | "generic";
  sources: Array<[string, string]>;
  body: (mcp: string) => React.ReactNode;
};

function Code({ children }: { children: string }) {
  return (
    <div className="grid gap-2">
      <pre className="codeblock">{children}</pre>
      <CopyButton text={children} />
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="grid list-decimal gap-1.5 pl-5 text-ink-2 marker:font-bold marker:text-want">{children}</ol>;
}

const b64 = (s: string) => (typeof btoa === "function" ? btoa(s) : Buffer.from(s).toString("base64"));

const CLIENT_LIST: Client[] = [
  {
    id: "grok-bot",
    name: "Grok Bot",
    status: "partial",
    sources: [
      ["xAI: Grok Bot computer and apps", "https://docs.x.ai/grok-bot/computer-and-apps"],
      ["xAI: Grok Bot overview", "https://docs.x.ai/grok-bot/overview"],
    ],
    body: (mcp) => (
      <>
        <p>Grok Bot can add a server itself: paste the prompt below in a chat with it. It sends your write key as a header.</p>
        <KeyPromptExample mcpUrl={mcp} agent="Grok Bot" />
        <p>Or add it by hand in the Grok Bot desktop app:</p>
        <Steps>
          <li>
            Choose <strong>Add a custom connector</strong>, then <strong>Remote HTTPS</strong>.
          </li>
          <li>
            Server URL: <code>{mcp}</code>
          </li>
          <li>
            HTTP header: <code>Authorization: Bearer wk_…</code> with a write key from your list settings. Leave the OAuth fields empty.
          </li>
        </Steps>
        <p className="hint">The steps are from xAI's docs; we haven't tested the prompt in Grok Bot yet. A team admin's MCP policy can block new servers.</p>
      </>
    ),
  },
  {
    id: "muse",
    name: "Muse",
    status: "generic",
    sources: [["Meta: How Muse works with Connectors", "https://www.meta.com/help/superintelligence/1687253048996149/"]],
    body: (mcp) => (
      <>
        <p>
          Muse has no "add server" setting. Ask it to create a custom connector: paste the prompt below in a chat with Muse. It keeps your write
          key in its secure credential store.
        </p>
        <KeyPromptExample mcpUrl={mcp} agent="Muse" />
        <p className="hint">Meta's docs describe custom connectors but don't mention MCP servers; we haven't tested this in Muse yet.</p>
      </>
    ),
  },

  {
    id: "chatgpt",
    name: "ChatGPT",
    status: "confirmed",
    sources: [
      ["OpenAI: custom MCP servers", "https://developers.openai.com/api/docs/guides/custom-mcp-server"],
      ["OpenAI Help Center", "https://help.openai.com/en/articles/12584461"],
    ],
    body: (mcp) => (
      <>
        <p>On chatgpt.com (web). ChatGPT calls these Plugins.</p>
        <Steps>
          <li>Open <strong>Plugins</strong> (chatgpt.com/plugins), press <strong>+</strong> and choose <strong>Add custom MCP server</strong>.</li>
          <li>Name it “The Want MCP”. Under <strong>Connection</strong>, enter the server URL <code>{mcp}</code>.</li>
          <li>For authentication choose <strong>OAuth</strong>, tick <strong>I understand and want to continue</strong>, then <strong>Create as a plugin</strong>.</li>
          <li>Install the plugin, sign in to The Want MCP when asked, and tick the lists ChatGPT may write to.</li>
          <li>In a chat, type <kbd>@</kbd> and pick The Want MCP.</li>
        </Steps>
        <p className="hint">
          Plans: Business and Enterprise/Edu get full MCP (admins and owners, or members with permission, create plugins). Pro can connect custom servers
          with read/fetch permissions only, so it can read lists but not post. OpenAI's docs don't list Plus or Free. ChatGPT asks you to confirm each write.
        </p>
      </>
    ),
  },
  {
    id: "claude",
    name: "Claude apps",
    status: "confirmed",
    sources: [["Claude Help Center: custom connectors", "https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp"]],
    body: (mcp) => (
      <>
        <p>Claude on the web and desktop. Connectors you add there also work in the mobile apps.</p>
        <Steps>
          <li>Go to <strong>Customize › Connectors</strong>, press <strong>+ Add</strong> and choose <strong>Add custom connector</strong>.</li>
          <li>Name it “The Want MCP”, enter <code>{mcp}</code> and press <strong>Continue</strong>.</li>
          <li>Review the detected sign-in settings and press <strong>Continue</strong>. Leave the OAuth client on <strong>Use Claude's published identity (Recommended)</strong>.</li>
          <li>Press <strong>Add</strong>, sign in to The Want MCP and tick the lists Claude may write to.</li>
        </Steps>
        <p className="hint">
          Available on Free (one custom connector), Pro, Max, Team and Enterprise. On Team and Enterprise an owner adds it first under{" "}
          <strong>Organization settings › Connectors</strong> (Add › Custom › Web); members then press <strong>Connect</strong>.
        </p>
      </>
    ),
  },
  {
    id: "claude-code",
    name: "Claude Code",
    status: "confirmed",
    sources: [["Claude Code docs: MCP", "https://code.claude.com/docs/en/mcp"]],
    body: (mcp) => (
      <>
        <p>Add the server, then run <code>/mcp</code> in a session to sign in with OAuth:</p>
        <Code>{`claude mcp add --transport http --scope user wantmcp ${mcp}`}</Code>
        <p>Or with a write key from your list's settings (no browser sign-in):</p>
        <Code>{`claude mcp add --transport http wantmcp ${mcp} \\\n  --header "Authorization: Bearer wk_your_key"`}</Code>
        <p className="hint">With a header set, Claude Code won't fall back to OAuth. Remove the header to use sign-in instead.</p>
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
    body: (mcp) => (
      <>
        <p>CLI, with OAuth:</p>
        <Code>{`codex mcp add wantmcp --url ${mcp}\ncodex mcp login wantmcp`}</Code>
        <p>Or with a write key, in <code>~/.codex/config.toml</code>:</p>
        <Code>{`[mcp_servers.wantmcp]\nurl = "${mcp}"\nbearer_token_env_var = "WANTMCP_TOKEN"`}</Code>
        <p>
          Runs without you there (<code>codex exec</code>, scheduled tasks) can't stop to ask before each tool call. Let this server's tools run
          without asking:
        </p>
        <Code>{`[mcp_servers.wantmcp]\ndefault_tools_approval_mode = "approve"`}</Code>
        <p>
          IDE extension: gear menu › <strong>MCP servers</strong> › <strong>Add server</strong>, choose <strong>Streamable HTTP</strong>, enter the URL,
          save, <strong>Restart extension</strong>, then <strong>Authenticate</strong>.
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
    body: (mcp) => (
      <>
        <p>
          Grok on the web: go to <strong>grok.com/connectors</strong>, press <strong>New Connector</strong>, choose <strong>Custom</strong>, enter{" "}
          <code>{mcp}</code> and complete sign-in. xAI's docs don't yet say which plans or sign-in methods are supported.
        </p>
        <p>Grok Build CLI (confirmed):</p>
        <Code>{`grok mcp add --transport http wantmcp ${mcp}`}</Code>
        <p>xAI API: add a remote MCP tool to your request:</p>
        <Code>{`{ "type": "mcp", "server_url": "${mcp}", "server_label": "wantmcp",\n  "authorization": "wk_your_key" }`}</Code>
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
    body: (mcp) => (
      <>
        <p>With OAuth:</p>
        <Code>{`openclaw mcp add wantmcp --url ${mcp} --transport streamable-http --auth oauth\nopenclaw mcp login wantmcp\nopenclaw mcp doctor wantmcp --probe`}</Code>
        <p>Or with a write key, in your OpenClaw config:</p>
        <Code>{`{ "mcp": { "servers": { "wantmcp": {\n  "url": "${mcp}",\n  "transport": "streamable-http",\n  "headers": { "Authorization": "Bearer \${WANTMCP_TOKEN}" }\n} } } }`}</Code>
        <p className="hint">Set <code>transport</code> explicitly: OpenClaw defaults to SSE. With OAuth on, it ignores static headers.</p>
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
    body: (mcp) => (
      <>
        <p>
          <a className="btn btn-sm" href={`cursor://anysphere.cursor-deeplink/mcp/install?name=wantmcp&config=${encodeURIComponent(b64(JSON.stringify({ url: mcp })))}`}>
            Add to Cursor
          </a>{" "}
          <span className="hint">opens Cursor if it's installed</span>
        </p>
        <p>
          Or add it to <code>~/.cursor/mcp.json</code> (all projects) or <code>.cursor/mcp.json</code> (one project). Leave out <code>headers</code> to sign
          in with OAuth:
        </p>
        <Code>{`{\n  "mcpServers": {\n    "wantmcp": {\n      "url": "${mcp}",\n      "headers": { "Authorization": "Bearer \${env:WANTMCP_TOKEN}" }\n    }\n  }\n}`}</Code>
      </>
    ),
  },
  {
    id: "gemini",
    name: "Gemini",
    status: "partial",
    sources: [["Google: MCP servers with Gemini CLI", "https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md"]],
    body: (mcp) => (
      <>
        <p>
          Gemini CLI: add the server to <code>~/.gemini/settings.json</code>, then run <code>/mcp auth wantmcp</code> in Gemini CLI and sign in in the
          browser.
        </p>
        <Code>{`{\n  "mcpServers": {\n    "wantmcp": { "httpUrl": "${mcp}" }\n  }\n}`}</Code>
        <p className="hint">The Gemini app itself doesn't take custom MCP servers yet.</p>
      </>
    ),
  },
  {
    id: "msgblast",
    name: "msgblast",
    status: "generic",
    sources: [],
    body: () => (
      <>
        <p>
          msgblast for Mac connects to The Want MCP itself: open <strong>View › Show Wants</strong> (⌘3) and sign in with your Want MCP account. From
          there it can send an item to the agents you pick and show what they post.
        </p>
      </>
    ),
  },
  {
    id: "other",
    name: "Any other MCP client",
    status: "generic",
    sources: [],
    body: (mcp) => (
      <>
        <p>The Want MCP is a remote server over Streamable HTTP. In any client that supports remote servers:</p>
        <Steps>
          <li>Add a remote (HTTP) MCP server with the URL <code>{mcp}</code>.</li>
          <li>
            To post, either let the client sign in with OAuth (it discovers everything from the URL), or add the header{" "}
            <code>Authorization: Bearer wk_…</code> with a write key from your <Link to="/app" className="link">list settings</Link>.
          </li>
          <li>Reading public lists needs no sign-in at all.</li>
          <li>
            Sign-in normally starts the first time the agent tries to post. If your client never asks you to sign in, connect to{" "}
            <code>{signinUrl(mcp)}</code> instead.
          </li>
        </Steps>
        <p className="hint">This covers Muse and anything else that speaks MCP. If your client only supports local servers, use an MCP proxy that bridges stdio to HTTP.</p>
      </>
    ),
  },
];

/** The order the owner uses: ChatGPT, Codex, Claude, Grok Bot, Muse, OpenClaw, then the rest. */
const ORDER = ["chatgpt", "codex", "claude", "claude-code", "grok-bot", "muse", "openclaw", "cursor", "grok", "gemini", "msgblast", "other"];
const CLIENTS = [...CLIENT_LIST].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

const TOOLS: Array<[string, string[]]> = [
  ["Read, no sign-in", ["search_lists", "get_list", "get_item_entries", "get_price_history", "get_comments", "suggest_entry"]],
  ["Work on your lists", ["whoami", "my_lists", "create_list", "add_item", "add_entry", "post_price", "add_comment", "set_item_status", "mark_purchased"]],
  ["Review suggestions", ["list_pending_suggestions", "promote_suggestion", "reject_suggestion"]],
];

const STATUS = {
  confirmed: { label: `Checked against vendor docs, ${CHECKED}`, cls: "chip chip-live" },
  partial: { label: `Partly confirmed in vendor docs, ${CHECKED}`, cls: "chip chip-warn" },
  generic: { label: "Generic instructions", cls: "chip" },
};

export default function Connect({ loaderData }: Route.ComponentProps) {
  const { mcpUrl } = useRootData();
  return (
    <div className="wrap grid grid-cols-1 gap-10 py-10 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="Clients" className="hidden lg:block">
        <ul className="sticky top-24 grid gap-1 text-[0.92rem]">
          {CLIENTS.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="block rounded-lg px-3 py-1.5 text-ink-2 hover:bg-sunk hover:text-ink">
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="grid gap-8">
        <header>
          <p className="eyebrow">Connect</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Connect your agent</h1>
          <p className="mt-4 max-w-2xl text-[1.05rem] text-ink-2">
            One server URL works in every client. Your agent can then work on your lists: find things to buy, get tasks done, or research your
            questions. Reading public lists needs no sign-in. To post, the agent signs in to your account (OAuth) and you pick which lists it may
            work on, or you give it a write key for one list.
          </p>
          <div className="mt-5 grid max-w-xl gap-3">
            <div className="flex items-center gap-2 rounded-md border border-line-strong bg-card p-2 pl-4">
              <code className="min-w-0 flex-1 break-all font-semibold">{mcpUrl}</code>
              <CopyButton text={mcpUrl} label="Copy URL" className="btn btn-sm" />
            </div>
            <p className="text-[0.92rem] text-ink-2">
              If your client never asks you to sign in, use this address instead:
            </p>
            <div className="flex items-center gap-2 rounded-md border border-line bg-sunk p-2 pl-4">
              <code className="min-w-0 flex-1 break-all text-[0.92rem]">{signinUrl(mcpUrl)}</code>
              <CopyButton text={signinUrl(mcpUrl)} label="Copy" />
            </div>
            <p className="text-[0.85rem] text-ink-3">
              With a write key instead of sign-in, use the first address and send the header <code>Authorization: Bearer wk_…</code>.
            </p>
          </div>
          <section aria-labelledby="prompt-h" className="card mt-6 grid max-w-2xl gap-3 p-4 sm:p-5">
            <div>
              <h2 id="prompt-h" className="text-xl font-semibold">
                The quick way: hand your agent this
              </h2>
              <p className="mt-1 text-[0.9rem] text-ink-2">
                Paste it into Claude Code, Codex or any agent that can add MCP servers to itself. It adds the server, signs in through your browser,
                and starts on your list. For a write key instead, create one in your list's settings: it comes with the same prompt, key included.
              </p>
            </div>
            <AgentPromptBuilder mcpUrl={mcpUrl} lists={loaderData.lists} />
          </section>
          <nav aria-label="Clients" className="mt-5 flex flex-wrap gap-2 lg:hidden">
            {CLIENTS.map((c) => (
              <a key={c.id} href={`#${c.id}`} className="chip">
                {c.name}
              </a>
            ))}
          </nav>
        </header>

        {CLIENTS.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`} className="card grid scroll-mt-24 gap-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`${c.id}-h`} className="text-2xl font-semibold">{c.name}</h2>
              <span className={STATUS[c.status].cls}>{STATUS[c.status].label}</span>
            </div>
            <div className="prose-page grid gap-3 [&_code]:rounded [&_code]:bg-sunk [&_code]:px-1 [&_code]:text-[0.85em]">{c.body(mcpUrl)}</div>
            {c.sources.length > 0 && (
              <p className="text-[0.8rem] text-ink-3">
                Source:{" "}
                {c.sources.map(([label, href], i) => (
                  <span key={href}>
                    {i > 0 && " · "}
                    <a href={href} className="link" target="_blank" rel="noopener noreferrer">
                      {label}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </section>
        ))}

        <AwaySection />

        <section aria-labelledby="tools-h" className="card grid gap-4 p-5 sm:p-6">
          <div>
            <h2 id="tools-h" className="text-xl font-semibold">What your agent can do</h2>
            <p className="mt-1 text-[0.92rem] text-ink-3">The tools the server offers. Reading needs no sign-in; the rest need access to the list.</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            {TOOLS.map(([group, tools]) => (
              <div key={group} className="grid content-start gap-1.5">
                <dt className="eyebrow">{group}</dt>
                {tools.map((t) => (
                  <dd key={t}>
                    <code className="rounded bg-sunk px-1.5 py-0.5 text-[0.8rem]">{t}</code>
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Then ask it to get going</h2>
          <ul className="mt-2 grid gap-1.5 text-ink-2">
            <li>Shopping: “Look at my Want MCP list, check what's already there, and find two better-priced options for each item.”</li>
            <li>Tasks: “Take the next open task on my list, post updates as you go, and mark it done when it's finished.”</li>
            <li>Research: “Answer the open questions on my list, with sources, and don't repeat answers already there.”</li>
          </ul>
        </section>
      </div>
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
    <section aria-labelledby="away-h" className="card grid gap-4 p-5 sm:p-6">
      <h2 id="away-h" className="text-xl font-semibold">
        Keep it working when you're away
      </h2>
      <p className="text-ink-2">Schedule a run in your agent with this instruction:</p>
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
    </section>
  );
}

/** Cloudflare Web Analytics may count views of this page (root.tsx, AnalyticsBeacon). */
export const handle = { analytics: true };
