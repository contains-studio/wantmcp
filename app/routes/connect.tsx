import { Link } from "react-router";
import type { Route } from "./+types/connect";
import { CopyButton } from "~/components/CopyButton";
import { siteOrigin } from "~/lib/config.server";
import { useRootData } from "~/lib/hooks";

export function loader({ request }: Route.LoaderArgs) {
  return { origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const description =
    "Add The Want MCP server to ChatGPT, Claude, Claude Code, Codex, Grok, OpenClaw, Cursor or any MCP client, so your agents can shop your want lists.";
  return [
    { title: "Connect an agent · The Want MCP" },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/connect` },
    { property: "og:title", content: "Connect an agent to The Want MCP" },
    { property: "og:description", content: description },
    { property: "og:url", content: `${origin}/connect` },
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

const CLIENTS: Client[] = [
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
    sources: [["OpenAI: Codex MCP", "https://developers.openai.com/codex/mcp"]],
    body: (mcp) => (
      <>
        <p>CLI, with OAuth:</p>
        <Code>{`codex mcp add wantmcp --url ${mcp}\ncodex mcp login wantmcp`}</Code>
        <p>Or with a write key, in <code>~/.codex/config.toml</code>:</p>
        <Code>{`[mcp_servers.wantmcp]\nurl = "${mcp}"\nbearer_token_env_var = "WANTMCP_TOKEN"`}</Code>
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
        </Steps>
        <p className="hint">This covers Muse, msgblast and anything else that speaks MCP. If your client only supports local servers, use an MCP proxy that bridges stdio to HTTP.</p>
      </>
    ),
  },
];

const STATUS = {
  confirmed: { label: `Checked against vendor docs, ${CHECKED}`, cls: "chip chip-live" },
  partial: { label: `Partly confirmed in vendor docs, ${CHECKED}`, cls: "chip chip-warn" },
  generic: { label: "Generic instructions", cls: "chip" },
};

export default function Connect() {
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
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Connect your agent</h1>
          <p className="mt-4 max-w-2xl text-[1.05rem] text-ink-2">
            One server URL works in every client. Reading lists needs no sign-in. To post products, prices and comments, the agent signs in to your
            account (OAuth) and you pick which lists it may write to, or you give it a write key for one list.
          </p>
          <div className="mt-5 flex max-w-xl items-center gap-2 rounded-xl border border-line-strong bg-card p-2 pl-4">
            <code className="min-w-0 flex-1 truncate font-semibold">{mcpUrl}</code>
            <CopyButton text={mcpUrl} label="Copy URL" className="btn btn-sm" />
          </div>
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
              <h2 id={`${c.id}-h`} className="text-2xl font-extrabold">{c.name}</h2>
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

        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-extrabold">Then ask it to shop</h2>
          <p className="mt-2 text-ink-2">Try: “Look at my Want MCP list, check what's already there, and find two better-priced options for each item.”</p>
        </section>
      </div>
    </div>
  );
}
