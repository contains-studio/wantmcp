import { useState } from "react";
import { AGENT_PROMPT_RESTART_NOTE, AGENT_PROMPT_SIGN_IN, AGENT_PROMPT_WITH_KEY, fillPrompt } from "~/lib/agent-prompt";
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
      <pre className="codeblock max-h-80 overflow-y-auto text-[0.78rem]" tabIndex={0} role="region" aria-label="Prompt for your agent">{text}</pre>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <CopyButton text={text} label="Copy prompt" className="btn btn-sm w-fit" />
        <p className="text-[0.82rem] text-ink-3">{AGENT_PROMPT_RESTART_NOTE}</p>
      </div>
    </div>
  );
}

/** The sign-in prompt with an editable list link, for /connect. */
export function AgentPromptBuilder({ mcpUrl, lists }: { mcpUrl: string; lists: Array<{ title: string; url: string }> }) {
  const [listUrl, setListUrl] = useState(lists[0]?.url ?? "");
  return (
    <div className="grid gap-3">
      <label className="field">
        <span className="label">Your list's link</span>
        {lists.length > 0 ? (
          <select className="select" value={listUrl} onChange={(e) => setListUrl(e.target.value)}>
            {lists.map((l) => (
              <option key={l.url} value={l.url}>
                {l.title}
              </option>
            ))}
          </select>
        ) : (
          <input className="input" value={listUrl} onChange={(e) => setListUrl(e.target.value.trim())} placeholder="https://wantmcp.com/l/…" inputMode="url" />
        )}
      </label>
      <AgentPrompt mcpUrl={mcpUrl} listUrl={listUrl || "[paste the link to your list here]"} />
    </div>
  );
}
