import { useState } from "react";
import { Form, Link } from "react-router";
import { AGENT_PROMPT_RESTART_NOTE, AGENT_PROMPT_SIGN_IN, AGENT_PROMPT_WITH_KEY, fillPrompt, promptFacts } from "~/lib/agent-prompt";
import { CopyButton } from "./CopyButton";

/**
 * A ready-to-paste prompt for an agent. With `keyValue` it embeds a write key: that variant is
 * rendered once, beside the new key, and only ever leaves the page through the clipboard.
 */
export function AgentPrompt({ mcpUrl, listUrl, keyValue, title }: { mcpUrl: string; listUrl: string; keyValue?: string; title?: string }) {
  const text = fillPrompt(keyValue ? AGENT_PROMPT_WITH_KEY : AGENT_PROMPT_SIGN_IN, { mcpUrl, listUrl, key: keyValue });
  return (
    <div className="grid gap-2">
      {title && <p className="label">{title}</p>}
      {/* The opening (list, server, key) and Copy; the whole text one tap away. */}
      <div className="prompt-box grid gap-2">
        <span className="codeblock prompt-facts text-[0.78rem]" aria-hidden="true">
          {promptFacts(text)}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <CopyButton text={text} label="Copy prompt" className="btn btn-want btn-sm w-fit" />
          <details className="prompt-peek">
            <summary className="add-link text-[0.85rem]">Show all</summary>
            <pre className="codeblock text-[0.78rem]" tabIndex={0} role="region" aria-label="Prompt for your agent">
              {text}
            </pre>
          </details>
        </div>
      </div>
      <p className="text-[0.82rem] text-ink-3">{AGENT_PROMPT_RESTART_NOTE}</p>
    </div>
  );
}

type MyList = { id: string; title: string; url: string; shared: boolean };

/**
 * The sign-in prompt for /connect, filled with the person's list:
 * - signed in with lists: a select (most recent first, or the list they came from), the prompt
 *   rendered on the server for it; without JavaScript, "Use this list" reloads with ?list=
 * - signed in without lists: no field, a way to start one
 * - signed out: a field for the link
 */
export function AgentPromptBuilder({ mcpUrl, lists, selected, signedIn }: { mcpUrl: string; lists: MyList[]; selected: string | null; signedIn: boolean }) {
  const [id, setId] = useState(selected);
  const [typed, setTyped] = useState("");
  const chosen = lists.find((l) => l.id === id);
  const listUrl = signedIn ? (chosen?.url ?? "") : typed;
  return (
    <div className="grid gap-3">
      {signedIn && lists.length > 0 && (
        <Form method="get" preventScrollReset className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="field">
            <span className="label">Your list</span>
            <select name="list" className="select" value={id ?? ""} onChange={(e) => setId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                  {l.shared ? " (shared)" : ""}
                </option>
              ))}
            </select>
          </label>
          {/* Without JavaScript the prompt follows the list after this; with it, it follows at once. */}
          <noscript>
            <button className="btn">Use this list</button>
          </noscript>
        </Form>
      )}
      {signedIn && lists.length === 0 && (
        <p className="text-[0.95rem] text-ink-2">
          You don't have a list yet.{" "}
          <Link to="/app" className="link font-medium text-ink">
            Start a list
          </Link>
        </p>
      )}
      {!signedIn && (
        <label className="field">
          <span className="label">Your list's link</span>
          <input className="input" value={typed} onChange={(e) => setTyped(e.target.value.trim())} placeholder="https://wantmcp.com/l/…" inputMode="url" />
        </label>
      )}
      <AgentPrompt mcpUrl={mcpUrl} listUrl={listUrl || "[paste the link to your list here]"} />
    </div>
  );
}

/**
 * The write-key prompt with placeholders, for agents that configure themselves (Grok Bot, Muse).
 * The real key is never shown here: list settings fills it in right after a key is created.
 */
export function KeyPromptExample({ mcpUrl, agent }: { mcpUrl: string; agent: string }) {
  const text = fillPrompt(AGENT_PROMPT_WITH_KEY, { mcpUrl, listUrl: "https://wantmcp.com/l/YOUR_LIST", key: "wk_YOUR_WRITE_KEY" });
  return (
    <div className="grid gap-2">
      <pre className="codeblock text-[0.78rem]" tabIndex={0} role="region" aria-label={`Prompt for ${agent}, with a write key`}>{text}</pre>
      <p className="text-[0.85rem] text-ink-2">
        Create a write key in your list's settings (<strong>Agents and write keys</strong>): this same prompt appears there with your list and key filled in, ready to copy.
      </p>
    </div>
  );
}
