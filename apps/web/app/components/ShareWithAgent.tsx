import { useEffect, useId, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { AGENT_PROMPT_WITH_KEY, fillPrompt } from "~/lib/agent-prompt";
import { agentMark } from "~/lib/brands";
import { useRootData } from "~/lib/hooks";
import { CopyButton } from "./CopyButton";

/** The owner's choice (25 Nov 2026): these four first, then "Other". */
const FIRST = ["ChatGPT", "Claude", "Muse", "Grok Bot"];
const OTHER = ["Codex", "Gemini", "OpenClaw", "Cursor", "Grok", "Hermes", "Hark", "Instinct"];

type KeyResult = { ok?: boolean; error?: string; intent?: string; key?: string; agent?: { id: string; name: string } };

/**
 * Share › Share with an agent: pick the agent, then one press makes a write key for this list and copies a prompt that
 * sets that agent up on its own. Nothing is created until that press. The key lives only in this step's memory: never
 * in the URL or storage, and it is gone when the menu closes.
 */
/** The prompt's opening, through the line that carries the key: what was shared, where, and with which key. */
function promptFacts(prompt: string): string {
  const lines = prompt.split("\n");
  const keyLine = lines.findIndex((l) => l.includes("Bearer wk_"));
  return lines.slice(0, keyLine >= 0 ? keyLine + 1 : 5).join("\n").trim() + "\n…";
}

export function ShareWithAgent({ listId, listUrl, existing }: { listId: string; listUrl: string; existing: string[] }) {
  const [round, setRound] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  // Closing the menu (or the sheet on a phone) ends the step: a fresh one next time, with no key in it.
  useEffect(() => {
    const el = box.current;
    const holders = [el?.closest("details"), el?.closest("[popover]")].filter(Boolean) as HTMLElement[];
    const reset = () => {
      const open = holders.every((h) => (h instanceof HTMLDetailsElement ? h.open : h.matches(":popover-open")));
      if (open) return;
      // The menu closed: the submenu folds too, so the next open starts at the menu, and the step starts afresh.
      for (const h of holders) if (h instanceof HTMLDetailsElement && h.open && !h.closest("[popover]")?.matches(":popover-open")) h.open = false;
      setRound((n) => n + 1);
    };
    for (const h of holders) h.addEventListener("toggle", reset);
    return () => holders.forEach((h) => h.removeEventListener("toggle", reset));
  }, []);
  return (
    <div ref={box}>
      <Step key={round} round={round} listId={listId} listUrl={listUrl} existing={existing} />
    </div>
  );
}

function Step({ round, listId, listUrl, existing }: { round: number; listId: string; listUrl: string; existing: string[] }) {
  const { mcpUrl } = useRootData();
  const fetcher = useFetcher<KeyResult>({ key: `share-agent-${listId}-${round}` });
  // Its own radio group: the step can be on the page twice (the Share menu and, from /app, open on the page).
  const group = useId();
  const [name, setName] = useState<string>("");
  const [other, setOther] = useState(false);
  const [again, setAgain] = useState(false);
  const [copied, setCopied] = useState<boolean | null>(null);
  const pending = useRef<{ resolve: (b: Blob) => void; reject: (e: unknown) => void } | null>(null);

  const agentName = name.trim();
  const busy = fetcher.state !== "idle";
  const result = fetcher.data?.intent === "create-key" ? fetcher.data : undefined;
  const prompt = result?.key ? fillPrompt(AGENT_PROMPT_WITH_KEY, { mcpUrl, listUrl, key: result.key }) : null;
  const duplicate = !!agentName && existing.some((n) => n.toLowerCase() === agentName.toLowerCase());

  // The copy starts inside the press (Safari only allows clipboard writes there) and is filled in when the key arrives.
  useEffect(() => {
    if (!pending.current || fetcher.state !== "idle" || !fetcher.data) return;
    const p = pending.current;
    pending.current = null;
    if (prompt) p.resolve(new Blob([prompt], { type: "text/plain" }));
    else p.reject(new Error("no key"));
  }, [fetcher.state, fetcher.data, prompt]);
  // Browsers without ClipboardItem: try after the key arrives (may be refused; then the Copy button is the way).
  useEffect(() => {
    if (prompt && copied === null && !("ClipboardItem" in window)) {
      navigator.clipboard?.writeText(prompt).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    }
  }, [prompt, copied]);

  const create = () => {
    if (!agentName) return;
    if ("ClipboardItem" in window && navigator.clipboard?.write) {
      const blob = new Promise<Blob>((resolve, reject) => (pending.current = { resolve, reject }));
      navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    }
    fetcher.submit({ intent: "create-key", agent_name: agentName }, { method: "post", action: `/app/lists/${listId}/settings` });
  };

  // The done state is taller than the picker (it shows the list, server and key lines): bring its top into view so
  // "Copied", the prompt and the one-time note are on one phone screen.
  const doneRef = useRef<HTMLDivElement>(null);
  const done = Boolean(prompt && result?.agent);
  useEffect(() => {
    if (done) doneRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [done]);

  if (prompt && result?.agent) {
    const who = result.agent.name;
    return (
      <div ref={doneRef} className="grid scroll-mt-20 gap-3 p-1">
        <p role="status" className="font-medium text-ink">
          {copied ? `Copied. Paste it to ${who}.` : `Copy this, then paste it to ${who}.`}
        </p>
        <div className="prompt-box grid gap-2">
          {/* Owner, 25 Nov 2026, on seeing only the first line: "doesnt mention the list or the token". The folded
              view shows the lines that say what was shared: the list, the server and the key. The rest (the
              numbered steps for the agent) stays one tap away. */}
          <span className="codeblock prompt-facts text-[0.78rem]" aria-hidden="true">
            {promptFacts(prompt)}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CopyButton text={prompt} label={copied ? "Copy again" : "Copy prompt"} doneText="Copied" className={`btn btn-sm w-fit ${copied ? "" : "btn-want"}`} />
            <details className="prompt-peek">
              <summary className="add-link text-[0.85rem]">Show all</summary>
              <pre className="codeblock text-[0.78rem]" tabIndex={0} role="region" aria-label={`Prompt for ${who}`}>
                {prompt}
              </pre>
            </details>
          </div>
        </div>
        <p className="text-[0.82rem] text-ink-3">
          Anyone with this prompt can add to this list as {who} until you remove it in{" "}
          <Link to={`/app/lists/${listId}/settings#keys-h`} className="link">
            Settings › Agents
          </Link>
          . The key is shown this once.
        </p>
      </div>
    );
  }

  const chip = (n: string) => {
    const mark = agentMark(n);
    const on = name === n;
    return (
      <label key={n} className={`swatch-option flex-none ${on ? "is-on" : ""}`}>
        <input type="radio" name={group} checked={on} onChange={() => setName(n)} className="sr-only" />
        {mark && (
          <span className="agent-chip-mark" aria-hidden="true">
            <img src={mark.light} alt="" width={16} height={16} className={mark.dark ? "brand-logo-light" : ""} />
            {mark.dark && <img src={mark.dark} alt="" width={16} height={16} className="brand-logo-dark" />}
          </span>
        )}
        {n}
      </label>
    );
  };

  return (
    <div className="grid gap-3 p-1">
      <fieldset className="grid gap-2">
        <legend className="label mb-1">Which agent?</legend>
        <div className="flex flex-wrap gap-2">
          {FIRST.map(chip)}
          <button type="button" className={`swatch-option flex-none ${other ? "is-on" : ""}`} aria-expanded={other} onClick={() => setOther(!other)}>
            Other
          </button>
        </div>
        {other && (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">{OTHER.map(chip)}</div>
            <label className="field">
              <span className="label">Or its name</span>
              <input
                className="input"
                maxLength={60}
                value={FIRST.includes(name) || OTHER.includes(name) ? "" : name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My home assistant"
                autoComplete="off"
              />
            </label>
          </div>
        )}
      </fieldset>
      {duplicate && !again ? (
        <div className="grid gap-2">
          <p className="text-[0.9rem] text-ink-2">{agentName} already has a key for this list.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" className="btn btn-sm" onClick={() => setAgain(true)}>
              Create another
            </button>
            <Link to={`/app/lists/${listId}/settings#keys-h`} className="link text-[0.9rem]">
              Manage agents
            </Link>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-want w-full sm:w-fit" disabled={!agentName || busy} onClick={create}>
          {busy ? "Creating…" : "Create key and copy prompt"}
        </button>
      )}
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
    </div>
  );
}
