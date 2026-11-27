import { useEffect, useState } from "react";
import { data, Link, useFetcher } from "react-router";
import { AGENT_PROMPT_WITH_KEY, fillPrompt, promptFacts } from "~/lib/agent-prompt";
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
import { AgentLine } from "~/components/AgentLine";
import { SKILL_CLAUDE_CODE_DIR, SKILL_INSTALL, SKILL_MEMORY_LINE, SKILL_NAME } from "~/lib/skill";

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
  status: "confirmed" | "partial" | "unchecked" | "generic" | "soon";
  sources: Array<[string, string]>;
  steps: (ctx: Ctx) => React.ReactNode;
  more?: (ctx: Ctx) => React.ReactNode;
  /** The steps end with their own "Then" (an app where you act rather than say something): no "Then say" box. */
  ownThen?: boolean;
  /** "So it remembers next time": our skill's install command (coding agents), its ZIP (Claude apps), or a line for the app's memory (chat apps). */
  remember?: "command" | "zip" | "memory";
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
function KeyPrompt({ ctx, agent, app }: { ctx: Ctx; agent: string; app: string }) {
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
    // Folded like the Claude Code and Codex prompts: the opening (list, server, key) and the whole text behind "Show all".
    return (
      <div className="grid gap-2">
        <p className="text-[0.92rem] text-ink-2">
          <Link to={`/login?next=${encodeURIComponent(`/connect?app=${app}`)}`} className="link">
            Sign in to fill this in
          </Link>{" "}
          with your list and a key.
        </p>
        <div className="prompt-box grid gap-2">
          <span className="codeblock prompt-facts text-[0.78rem]" aria-hidden="true">
            {promptFacts(text)}
          </span>
          <details className="prompt-peek">
            <summary className="add-link text-[0.85rem]">Show all</summary>
            <pre className="codeblock text-[0.78rem]" tabIndex={0} role="region" aria-label={`Prompt for ${agent}`}>
              {text}
            </pre>
          </details>
        </div>
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

/**
 * A disclosure's summary with an arrow that turns when open. The arrow is its own flex item after a gap (a trailing space
 * collapses in a flex row), and only the words are underlined: on the summary itself the underline carried into the
 * turned arrow and stood as a stroke over the last letter (WebKit).
 */
function SummaryArrow({ children }: { children: React.ReactNode }) {
  return (
    <summary className="textlink-btn gap-1.5 text-[0.9rem] no-underline">
      <span className="underline decoration-line-strong underline-offset-[3px]">{children}</span>
      <span aria-hidden="true" className="inline-block w-[0.6em] text-center transition group-open:rotate-90">
        ›
      </span>
    </summary>
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

/** A screenshot in a step: its own frame, lazy, with a short caption. */
function Shot({ src, width, height, alt, caption, narrow = false }: { src: string; width: number; height: number; alt: string; caption: string; narrow?: boolean }) {
  return (
    <figure className={`grid gap-1.5 ${narrow ? "max-w-[18rem]" : "max-w-[32rem]"}`}>
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="block h-auto w-full rounded-xl border border-line" />
      <figcaption className="text-[0.85rem] text-ink-2">{caption}</figcaption>
    </figure>
  );
}

const b64 = (s: string) => (typeof btoa === "function" ? btoa(s) : Buffer.from(s).toString("base64"));

type Ctx = { mcp: string; origin: string; signedIn: boolean; lists: MyList[]; selected: string | null };
type MyList = { id: string; title: string; url: string; shared: boolean; format?: string };

const CLIENT_LIST: Client[] = [
  {
    id: "grok-bot",
    name: "Grok Bot",
    status: "partial",
    remember: "memory",
    sources: [
      ["xAI: Grok Bot computer and apps", "https://docs.x.ai/grok-bot/computer-and-apps"],
      ["xAI: Grok Bot overview", "https://docs.x.ai/grok-bot/overview"],
    ],
    steps: (c) => (
      <>
        <p>Paste this in a chat with Grok Bot. It adds the server itself and sends your key with every call.</p>
        <KeyPrompt ctx={c} agent="Grok Bot" app="grok-bot" />
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
    status: "unchecked",
    remember: "memory",
    sources: [["Meta: How Muse works with Connectors", "https://www.meta.com/help/superintelligence/1687253048996149/"]],
    steps: (c) => (
      <>
        <p>Paste this in a chat with Muse. It creates a custom connector and keeps your key in its credential store.</p>
        <KeyPrompt ctx={c} agent="Muse" app="muse" />
      </>
    ),
    more: () => <p>Muse has no "add server" setting. Meta's docs describe custom connectors but don't mention MCP servers; we haven't tested this in Muse yet.</p>,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    status: "confirmed",
    remember: "memory",
    sources: [
      ["OpenAI: custom MCP servers", "https://developers.openai.com/api/docs/guides/custom-mcp-server"],
      ["OpenAI Help Center", "https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt"],
    ],
    steps: (c) => (
      <>
        <p className="text-ink-2">Business, Enterprise and Edu plans can post. Pro can read lists but not post; Plus and Free aren't in OpenAI's docs.</p>
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
      </>
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
    remember: "zip",
    sources: [["Claude Help Center: custom connectors", "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp"]],
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
          {/* Owner's screenshot of the Claude desktop app, 25 Nov 2026 (820×1061), cropped to its Authentication block (y 232–632),
              which leaves out the warning, Request headers and the recording's pointer. Shown at 96% width with a 2% white margin
              so the ring drawn over "Sign in now" (y 268–382) clears the radio buttons. Percentages of the fixed 820:400 frame,
              so the ring stays put at any width. */}
          <figure className="mt-2 grid max-w-[26rem] gap-1.5">
            <div className="relative aspect-[820/400] overflow-hidden rounded-xl border border-line bg-white">
              <img
                src="/shots/claude-add-custom-connector.webp"
                alt="Claude's Authentication choices: Sign in now, Sign in when needed, and No sign-in, which Claude has selected and marked Detected. Sign in now is circled."
                width={820}
                height={1061}
                loading="lazy"
                decoding="async"
                className="block h-auto w-[96%] max-w-none"
                style={{ margin: "calc(-232 / 820 * 96%) 0 0 2%" }}
              />
              <span aria-hidden="true" className="pointer-events-none absolute top-[8.4%] left-[0.6%] h-[27.6%] w-[96.8%] rounded-lg border-[3px] border-[#0a6fe0]" />
            </div>
            <figcaption className="text-[0.85rem] text-ink-2">
              Claude selects No sign-in at first. <strong className="text-ink">Choose Sign in now.</strong>
            </figcaption>
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
    remember: "command",
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
        <p>
          Our skill without npx, saved to <code>{SKILL_CLAUDE_CODE_DIR}/</code>:
        </p>
        <Code>{`mkdir -p ~/.claude/skills && curl -fsSL ${c.origin}/skills/${SKILL_NAME}.zip -o /tmp/${SKILL_NAME}.zip \\\n  && unzip -o /tmp/${SKILL_NAME}.zip -d ~/.claude/skills`}</Code>
      </>
    ),
  },
  {
    id: "codex",
    name: "Codex",
    status: "confirmed",
    remember: "command",
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
    remember: "memory",
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
    remember: "command",
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
    remember: "command",
    sources: [
      ["Cursor docs: MCP", "https://cursor.com/docs/mcp"],
      ["Cursor docs: install links", "https://cursor.com/docs/mcp/install-links"],
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
    remember: "command",
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
    // "Not yet checked": these steps are from Hermes Agent's docs and nobody here has run them.
    status: "unchecked",
    remember: "command",
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
        <p>These steps are from Hermes Agent's own docs. We haven't tested this in Hermes yet.</p>
      </>
    ),
  },
  {
    id: "hark",
    name: "Hark",
    status: "unchecked",
    remember: "memory",
    sources: [["Hark", "https://hark.com/"]],
    steps: (c) => (
      <>
        <p>Paste this in a chat with Hark.</p>
        <KeyPrompt ctx={c} agent="Hark" app="hark" />
      </>
    ),
    more: () => <p>Hark publishes no "add a server" setting that we could find, and we haven't tested this in Hark yet.</p>,
  },
  {
    id: "instinct",
    name: "Instinct",
    status: "unchecked",
    remember: "memory",
    sources: [["Instinct", "https://instinct.com/"]],
    steps: (c) => (
      <>
        <p>Send this to Instinct.</p>
        <KeyPrompt ctx={c} agent="Instinct" app="instinct" />
      </>
    ),
    more: () => <p>Instinct publishes no "add a server" setting that we could find, and we haven't tested this in Instinct yet.</p>,
  },
  {
    id: "msgblast",
    name: "msgblast",
    // From msgblast's docs/wants.md and its app code (27 Nov 2026); nobody here has run them in a released build yet.
    status: "unchecked",
    sources: [["msgblast: Wants (docs/wants.md)", "https://github.com/contains-studio/msgblast/blob/main/docs/wants.md"]],
    ownThen: true,
    steps: () => (
      <>
        <h3 className="text-[1rem] font-semibold">On a Mac</h3>
        <Steps>
          <li>
            Open <strong>View › Show Wants</strong> (⌘3).
          </li>
          <li>
            Choose <strong>Sign In…</strong> and pick your lists in the browser.
          </li>
          <li>
            Or connect one list with a key: on wantmcp.com open the list's settings, <strong>Agents › Add another agent</strong>. In msgblast click{" "}
            <strong>Use a Write Key</strong>, paste the key and click <strong>Add</strong>.
          </li>
        </Steps>
        <Shot src="/shots/msgblast-signin-mac.webp" width={760} height={320} alt="msgblast's Want MCP sign-in on Mac, with a Sign In… button and a field for a write key." caption="Sign in to pick your lists, or use one list's key." />
        <h3 className="text-[1rem] font-semibold">On an iPhone</h3>
        <Steps>
          <li>
            Open <strong>Wants</strong> from the inbox (on an iPhone that isn't paired: <strong>Open Wants</strong>).
          </li>
          <li>
            On wantmcp.com, open the list's settings, <strong>Agents</strong>, choose <strong>Other</strong> and name it msgblast. Create the key and open{" "}
            <strong>Show all</strong> to copy it.
          </li>
          <li>
            In msgblast paste it into <strong>List write key</strong> and tap <strong>Connect list</strong>.
          </li>
        </Steps>
        <Shot src="/shots/msgblast-open-wants-iphone.webp" width={600} height={498} narrow alt="msgblast on iPhone, with Open Wants above Pair Your Mac." caption="Wants, on the iPhone's first screen." />
        <h3 className="text-[1rem] font-semibold">Then</h3>
        <Steps>
          <li>Add a want in the field under your lists.</li>
          <li>
            Open it and choose <strong>Find Offers</strong> (shopping) or <strong>Ask Agents</strong> (a task or a question). Replies show under the item.
          </li>
          <li>
            Answer what's under <strong>Waiting on you</strong>. If you like, turn on <strong>Forward Activity</strong> so new comments reach the agents you asked.
          </li>
        </Steps>
        <Shot src="/shots/msgblast-wants-mac.webp" width={1024} height={738} alt="The msgblast Wants window on Mac: a headphones want with two offers, from Claude and from Codex, and a comment. Demo data." caption="A want with its offers in msgblast (demo data)." />
        <p className="text-[0.85rem] text-ink-3">
          Wants comes in the next msgblast release: the download today (0.11.1) doesn't have it yet. Update when a newer version arrives.
        </p>
      </>
    ),
  },
  {
    id: "other",
    name: "Other apps",
    status: "generic",
    remember: "command",
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

/**
 * After the steps, quietly: install our skill (skills/list-want-mcp), so the agent knows in a new session to use The Want
 * MCP when the person talks about what they want. Coding agents take the installer's command; the Claude apps take the
 * ZIP; chat apps with no skills get a line for their memory instead.
 */
function RemembersNextTime({ kind, app }: { kind: "command" | "zip" | "memory"; app: string }) {
  const lead = <span className="font-semibold text-ink">So it remembers next time:</span>;
  return (
    <div className="grid gap-1.5 text-[0.92rem] text-ink-2">
      {kind === "command" && (
        <>
          <p>{lead} install our skill, so {app} knows to use your lists in a new session.</p>
          <span className="flex items-stretch gap-2">
            <code className="input flex min-w-0 flex-1 items-center break-words font-mono text-[0.8rem]">{SKILL_INSTALL}</code>
            <CopyButton text={SKILL_INSTALL} label="Copy" ariaLabel="Copy the skill install command" className="btn btn-ghost btn-sm" />
          </span>
        </>
      )}
      {kind === "zip" && (
        <p>
          {lead}{" "}
          <a href={`/skills/${SKILL_NAME}.zip`} download className="link">
            download our skill
          </a>
          , then in Claude open <strong>Customize › Skills › + › Upload a skill</strong>. Skills need code execution on (Settings › Capabilities).
        </p>
      )}
      {kind === "memory" && (
        <>
          <p>{lead} add this line to {app}'s memory or custom instructions.</p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-ink">“{SKILL_MEMORY_LINE}”</span>
            <CopyButton text={SKILL_MEMORY_LINE} label="Copy" ariaLabel="Copy the line for memory" className="btn btn-ghost btn-xs" />
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Each app's own pages (owner, 27 Nov 2026: "all our connect documentation needs to link to the sites/pages"): its site
 * or download, and where it explains adding a connector or MCP server. Every link was opened and checked on LINKS_CHECKED;
 * `none` says how it's done when the app has no such page.
 */
const LINKS_CHECKED = "27 Nov 2026";
const LINKS: Record<string, { links: Array<[string, string]>; none?: string }> = {
  chatgpt: { links: [["ChatGPT download", "https://chatgpt.com/download/"], ["OpenAI: custom MCP servers in ChatGPT", "https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt"]] },
  codex: { links: [["Codex", "https://openai.com/codex/"], ["Codex: MCP", "https://learn.chatgpt.com/docs/extend/mcp"]] },
  claude: { links: [["Claude download", "https://claude.com/download"], ["Claude: custom connectors", "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp"]] },
  "claude-code": { links: [["Claude Code", "https://claude.com/product/claude-code"], ["Claude Code docs: MCP", "https://code.claude.com/docs/en/mcp"]] },
  "grok-bot": { links: [["Grok Bot download", "https://x.ai/bot"], ["xAI: Grok Bot apps and connectors", "https://docs.x.ai/grok-bot/computer-and-apps"]] },
  muse: { links: [["Muse download", "https://ai.meta.com/muse/download/"], ["Meta: how Muse works with connectors", "https://www.meta.com/help/superintelligence/1687253048996149/"]] },
  openclaw: { links: [["OpenClaw", "https://openclaw.ai/"], ["OpenClaw docs: MCP", "https://docs.openclaw.ai/tools/mcp"]] },
  cursor: { links: [["Cursor download", "https://cursor.com/download"], ["Cursor docs: MCP", "https://cursor.com/docs/mcp"]] },
  grok: { links: [["Grok", "https://grok.com/"], ["xAI: Grok connectors", "https://docs.x.ai/grok/connectors"]] },
  gemini: { links: [["Gemini CLI", "https://geminicli.com/"], ["Gemini CLI: MCP servers", "https://geminicli.com/docs/tools/mcp-server/"]] },
  hermes: { links: [["Hermes Agent", "https://hermes-agent.nousresearch.com/"], ["Hermes docs: MCP", "https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp"]] },
  hark: { links: [["Hark", "https://hark.com/"]], none: "Hark has no setup page: you set it up in a chat." },
  instinct: { links: [["Instinct", "https://instinct.com/"]], none: "Instinct has no setup page: you set it up by texting it." },
  msgblast: { links: [["msgblast.app", "https://msgblast.app/"], ["Download", "https://msgblast.app/download/"], ["msgblast: Wants", "https://github.com/contains-studio/msgblast/blob/main/docs/wants.md"]] },
  other: { links: [["MCP: connect to remote servers", "https://modelcontextprotocol.io/docs/develop/connect-remote-servers"]] },
};

/** The app's own pages, after the steps: quiet links in a new tab, with the date they were checked. */
function AppLinks({ id }: { id: string }) {
  const l = LINKS[id];
  if (!l) return null;
  return (
    <p className="app-links text-[0.85rem] text-ink-3">
      {l.links.map(([label, url], i) => (
        <span key={url}>
          {i > 0 && " · "}
          <a href={url} className="link text-ink-2" target="_blank" rel="noopener noreferrer">
            {label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </span>
      ))}
      {l.none && <> · {l.none}</>}
      <span className="block text-[0.78rem]">Links checked {LINKS_CHECKED}.</span>
    </p>
  );
}

/** The order the owner uses: ChatGPT, Codex, Claude, Grok Bot, Muse, OpenClaw, then the rest. */
const ORDER = ["chatgpt", "codex", "claude", "claude-code", "grok-bot", "muse", "openclaw", "cursor", "grok", "gemini", "hermes", "hark", "instinct", "msgblast", "other"];
const CLIENTS = [...CLIENT_LIST].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

/** `note`: what "partly" leaves out (docs/marketing-plan.md: sign-in and posting end to end are untested for these). */
const STATUS: Record<Client["status"], { label: string; cls: string; note?: string } | null> = {
  confirmed: { label: `Checked ${CHECKED}`, cls: "chip chip-live" },
  partial: { label: `Partly checked ${CHECKED}`, cls: "chip chip-warn", note: "Sign-in and posting not tested yet." },
  unchecked: { label: "Not yet checked", cls: "chip", note: "We haven't tried these steps in this app yet." },
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
        {/* The home page's words for an agent, with its copy button. */}
        {!loaderData.signedIn && <AgentLine lead="No account yet? Tell your agent:" className="grid max-w-full justify-items-start gap-1.5" />}
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
        ctx={{ mcp: mcpUrl, origin: loaderData.origin, signedIn: loaderData.signedIn, lists: loaderData.lists, selected: loaderData.selected }}
        listParam={loaderData.selected}
      />

      <AwaySection />


      {/* The same text agents read at /llms.txt and /agents.txt: folded for people, still in the page for agents reading it. */}
      <section id="for-agents" aria-label="For agents" className="grid scroll-mt-24 gap-1 border-t border-line pt-6">
        <details className="group">
          <SummaryArrow>For agents: the full instructions</SummaryArrow>
          <pre className="mt-3 max-w-3xl font-sans text-[0.88rem] leading-relaxed whitespace-pre-wrap text-ink-2">{loaderData.forAgents}</pre>
        </details>
        <p className="text-[0.9rem] text-ink-3">
          Also at{" "}
          <a href="/llms.txt" className="link">
            /llms.txt
          </a>
          .
        </p>
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
          {status?.note && <p className="text-[0.82rem] text-ink-3">{status.note}</p>}
        </div>
        <div className="grid min-w-0 max-w-3xl gap-4 text-[0.97rem] [&_code]:rounded-[3px] [&_code]:bg-sunk [&_code]:px-1 [&_code]:text-[0.85em]">
          {c.steps(ctx)}
          {c.status !== "soon" && !c.ownThen && (
            <p className="rounded-md bg-sunk px-4 py-3">
              <span className="font-semibold">Then say:</span> “{thenSay}”{" "}
              <CopyButton text={thenSay} label="Copy" ariaLabel="Copy what to say" className="btn btn-ghost btn-xs" />
            </p>
          )}
          {c.remember && <RemembersNextTime kind={c.remember} app={c.id === "other" ? "your agent" : c.name} />}
          <AppLinks id={c.id} />
          {(c.more || c.sources.length > 0) && (
            <details className="group">
              <SummaryArrow>Details and troubleshooting</SummaryArrow>
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
