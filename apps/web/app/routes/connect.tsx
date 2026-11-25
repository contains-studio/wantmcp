import { data, Link } from "react-router";
import { AgentPromptBuilder, KeyPromptExample } from "~/components/AgentPrompt";
import { api } from "~/lib/api.server";
import { getSessionToken } from "~/lib/session.server";
import type { ListSummary } from "~/lib/types";
import type { Route } from "./+types/connect";
import { CopyButton } from "~/components/CopyButton";
import { siteOrigin } from "~/lib/config.server";
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
    .map((l) => ({ id: l.id, title: l.title, url: l.url, shared: l.my_role !== "owner" }));
  const asked = new URL(request.url).searchParams.get("list");
  const selected = mine.find((l) => l.id === asked)?.id ?? mine[0]?.id ?? null;
  return data(
    { origin: siteOrigin(request), signedIn, lists: mine, selected },
    { headers: { "Cache-Control": signedIn ? "private, no-store" : "public, max-age=300, s-maxage=3600", Vary: "Cookie" } },
  );
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
    { property: "og:image", content: `${origin}/og/home.png?v=6` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

const CHECKED = "24 Nov 2026";

type Client = {
  id: string;
  name: string;
  status: "confirmed" | "partial" | "generic" | "soon";
  sources: Array<[string, string]>;
  body: (mcp: string) => React.ReactNode;
};

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
          Muse has no "add server" setting. Ask it to create a custom connector: paste the prompt below in a chat with Muse. It keeps your write key in its
          secure credential store.
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
        <p>On chatgpt.com, in a browser.</p>
        <Steps>
          <li>
            Go to <strong>Plugins</strong> (chatgpt.com/plugins) › <strong>+</strong> › <strong>Add custom MCP server</strong>.
          </li>
          <li>
            Name: The Want MCP. <strong>Connection</strong>: <code>{mcp}</code>.
          </li>
          <li>
            Authentication: <strong>OAuth</strong>. Tick <strong>I understand and want to continue</strong>, then <strong>Create as a plugin</strong>.
          </li>
          <li>Install it, sign in, and tick the lists ChatGPT can work on.</li>
          <li>
            In a chat, type <kbd>@</kbd> and pick The Want MCP.
          </li>
        </Steps>
        <p className="hint">
          Business, Enterprise and Edu: full access (an admin, owner or permitted member adds it). Pro: reads lists, can't post. Plus and Free: not in OpenAI's
          docs. ChatGPT asks before each change.
        </p>
      </>
    ),
  },
  {
    id: "claude",
    name: "Claude",
    status: "confirmed",
    sources: [
      ["Claude Help Center: custom connectors", "https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp"],
    ],
    body: (mcp) => (
      <>
        <p>On claude.ai or the desktop app. It then works on mobile too.</p>
        <Steps>
          <li>
            <strong>Customize › Connectors › + Add › Add custom connector</strong>.
          </li>
          <li>
            Name: The Want MCP. URL: <code>{mcp}</code>. Press <strong>Continue</strong>.
          </li>
          <li>
            Leave <strong>Use Claude's published identity (Recommended)</strong> selected and press <strong>Continue</strong>.
          </li>
          <li>
            Press <strong>Add</strong>, sign in, and tick the lists Claude can work on.
          </li>
        </Steps>
        <p className="hint">
          Free (one custom connector), Pro, Max, Team, Enterprise. Team and Enterprise: an owner adds it in <strong>Organization settings › Connectors</strong>{" "}
          (Add › Custom › Web), then members press <strong>Connect</strong>.
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
        <p>
          Run this, then <code>/mcp</code> in a session to sign in:
        </p>
        <Code>{`claude mcp add --transport http --scope user wantmcp ${mcp}`}</Code>
        <p>Or with a key from list settings:</p>
        <Code>{`claude mcp add --transport http wantmcp ${mcp} \\\n  --header "Authorization: Bearer wk_your_key"`}</Code>
        <p className="hint">With a key, Claude Code won't ask you to sign in.</p>
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
        <p>Command line, with sign-in:</p>
        <Code>{`codex mcp add wantmcp --url ${mcp}\ncodex mcp login wantmcp`}</Code>
        <p>
          Or with a key, in <code>~/.codex/config.toml</code>:
        </p>
        <Code>{`[mcp_servers.wantmcp]\nurl = "${mcp}"\nbearer_token_env_var = "WANTMCP_TOKEN"`}</Code>
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
    body: (mcp) => (
      <>
        <p>
          <strong>grok.com/connectors › New Connector › Custom</strong>. Enter <code>{mcp}</code> and sign in. xAI's docs don't yet list plans or sign-in
          methods.
        </p>
        <p>Grok Build CLI (checked):</p>
        <Code>{`grok mcp add --transport http wantmcp ${mcp}`}</Code>
        <p>xAI API, in your request:</p>
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
        <p>With sign-in:</p>
        <Code>{`openclaw mcp add wantmcp --url ${mcp} --transport streamable-http --auth oauth\nopenclaw mcp login wantmcp\nopenclaw mcp doctor wantmcp --probe`}</Code>
        <p>Or with a key, in your OpenClaw config:</p>
        <Code>{`{ "mcp": { "servers": { "wantmcp": {\n  "url": "${mcp}",\n  "transport": "streamable-http",\n  "headers": { "Authorization": "Bearer \${WANTMCP_TOKEN}" }\n} } } }`}</Code>
        <p className="hint">
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
    body: (mcp) => (
      <>
        <p>
          <a
            className="btn btn-sm"
            href={`cursor://anysphere.cursor-deeplink/mcp/install?name=wantmcp&config=${encodeURIComponent(b64(JSON.stringify({ url: mcp })))}`}
          >
            Add to Cursor
          </a>{" "}
          <span className="hint">opens Cursor if it's installed</span>
        </p>
        <p>
          Or add it to <code>~/.cursor/mcp.json</code> (all projects) or <code>.cursor/mcp.json</code> (one project). Leave out <code>headers</code> to sign in
          with OAuth:
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
          Gemini CLI: add the server to <code>~/.gemini/settings.json</code>, then run <code>/mcp auth wantmcp</code> in Gemini CLI and sign in in the browser.
        </p>
        <Code>{`{\n  "mcpServers": {\n    "wantmcp": { "httpUrl": "${mcp}" }\n  }\n}`}</Code>
        <p className="hint">The Gemini app itself doesn't take custom MCP servers yet.</p>
      </>
    ),
  },
  {
    id: "msgblast",
    name: "msgblast",
    // Not released yet (brands.ts comingSoon): no steps until it ships.
    status: "soon",
    sources: [],
    body: () => <p className="text-ink-2">Not available yet.</p>,
  },
  {
    id: "other",
    name: "Other apps",
    status: "generic",
    sources: [],
    body: (mcp) => (
      <>
        <p>Any app that supports remote MCP servers (Streamable HTTP):</p>
        <Steps>
          <li>
            Add <code>{mcp}</code> as a remote server.
          </li>
          <li>
            Sign in when the app asks. To use a key instead, send <code>Authorization: Bearer wk_…</code> with a key from your{" "}
            <Link to="/app" className="link">
              list settings
            </Link>
            .
          </li>
          <li>Reading public lists needs no sign-in.</li>
          <li>
            If the app never asks you to sign in, use <code>{signinUrl(mcp)}</code> instead.
          </li>
        </Steps>
        <p className="hint">Apps with only local servers need a stdio-to-HTTP proxy.</p>
      </>
    ),
  },
];

/** The order the owner uses: ChatGPT, Codex, Claude, Grok Bot, Muse, OpenClaw, then the rest. */
const ORDER = ["chatgpt", "codex", "claude", "claude-code", "grok-bot", "muse", "openclaw", "cursor", "grok", "gemini", "msgblast", "other"];
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
  return (
    <div className="wrap grid gap-12 py-10 sm:py-14">
      <header className="grid max-w-3xl gap-5">
        <h1 className="display text-[2.25rem] sm:text-[2.75rem]">Connect an agent</h1>
        <p className="max-w-[65ch] text-[1.0625rem] text-ink-2">Add The Want MCP to your AI app, sign in, and pick the lists it can work on.</p>
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

      <nav aria-label="Apps" className="border-y border-line py-3">
        <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {CLIENTS.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="brand-tile" aria-label={c.name} title={c.name}>
                {c.id === "other" ? (
                  <span className="text-[0.95rem] font-semibold">{c.name}</span>
                ) : (
                  <BrandLogo brand={brandFor(c)} />
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="prompt-h" className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:gap-10">
        <div className="grid content-start gap-2">
          <h2 id="prompt-h" className="serif text-[1.75rem] leading-tight">
            Coding agents: paste this
          </h2>
          <p className="text-ink-2">For Claude Code, Codex and agents that can set themselves up. It signs in and starts on your list.</p>
        </div>
        <div className="min-w-0 max-w-3xl">
          <AgentPromptBuilder mcpUrl={mcpUrl} lists={loaderData.lists} selected={loaderData.selected} signedIn={loaderData.signedIn} />
        </div>
      </section>

      <div className="grid border-t border-line">
        {CLIENTS.map((c) => {
          const status = STATUS[c.status];
          const brand = brandFor(c);
          return (
            <section
              key={c.id}
              id={c.id}
              aria-labelledby={`${c.id}-h`}
              className="grid scroll-mt-24 gap-4 border-b border-line py-8 lg:grid-cols-[18rem_1fr] lg:gap-10"
            >
              <div className="grid content-start justify-items-start gap-2">
                <h2 id={`${c.id}-h`} className="serif flex items-center gap-2.5 text-[1.6rem] leading-tight">
                  {/* A symbol mark sits beside the name; a wordmark would only repeat it. */}
                  {brand.logo?.nameBeside && (
                    <span className="flex h-7 w-7 items-center justify-center [&_img]:!h-6 [&_img]:!w-6 [&>span]:hidden" aria-hidden="true">
                      <BrandLogo brand={brand} />
                    </span>
                  )}
                  {c.name}
                </h2>
                {status && <span className={status.cls}>{status.label}</span>}
              </div>
              <div className="grid min-w-0 max-w-3xl gap-3 text-[0.97rem] [&_code]:rounded-[3px] [&_code]:bg-sunk [&_code]:px-1 [&_code]:text-[0.85em]">
                {c.body(mcpUrl)}
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
              </div>
            </section>
          );
        })}
      </div>

      <AwaySection />

      <section aria-labelledby="ask-h" className="grid gap-4 lg:grid-cols-[18rem_1fr] lg:gap-10">
        <h2 id="ask-h" className="serif text-[1.75rem] leading-tight">
          Then ask
        </h2>
        <dl className="grid max-w-3xl border-t border-line">
          {ASKS.map(([k, v]) => (
            <div key={k} className="grid gap-1 border-b border-line py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-ink-2">“{v}”</dd>
            </div>
          ))}
        </dl>
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
