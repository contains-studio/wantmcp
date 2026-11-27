import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, type FetcherWithComponents } from "react-router";
import { AGENT_PROMPT_WITH_KEY, fillPrompt, promptFacts } from "~/lib/agent-prompt";
import { agentMark, clientKind, markStyle } from "~/lib/brands";
import { useRootData } from "~/lib/hooks";
import { CopyButton } from "./CopyButton";

/** The owner's choice (25 Nov 2026): these four first, then "Other". */
const FIRST = ["ChatGPT", "Claude", "Muse", "Grok Bot"];
// msgblast is an app (SPEC 24.2): it takes the plain key, so it is named here with its mark.
const OTHER = ["msgblast", "Codex", "Gemini", "OpenClaw", "Cursor", "Grok", "Hermes", "Hark", "Instinct"];

type KeyResult = { ok?: boolean; error?: string; intent?: string; key?: string; agent?: { id: string; name: string } };

/**
 * Share with an agent: pick the agent, then one press makes a write key for this list and copies a prompt that sets
 * that agent up on its own. Nothing is created until that press. The same step in the list's Share menu, on the list
 * page from a card's menu, and in settings › Agents. The key lives only in this step's memory: never in the URL or
 * storage, and gone when the menu closes.
 *
 * It is a real form posting to the list's settings, so without JavaScript it still creates the key: the settings page
 * then shows the done state (`AgentPromptDone`). With JavaScript the press also copies the prompt.
 */
export function ShareWithAgent({ listId, listUrl, existing, onList }: { listId: string; listUrl: string; existing: string[]; onList?: string[] }) {
  const [round, setRound] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  // Closing the menu (or the sheet on a phone) ends the step: a fresh one next time, with no key in it.
  useEffect(() => {
    const el = box.current;
    const holders = [el?.closest("details.menu-sub"), el?.closest("[popover]")].filter(Boolean) as HTMLElement[];
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
      <Step key={round} round={round} listId={listId} listUrl={listUrl} existing={existing} onList={onList ?? existing} />
    </div>
  );
}

/**
 * The done state for whichever client was picked (SPEC 24.2): a chat agent gets the prompt first; an app, or a name
 * typed under "Other", gets the plain key first and the prompt as the quiet second choice.
 */
export function KeyDone({ who, keyText, prompt, listId, copied }: { who: string; keyText: string; prompt: string; listId: string; copied: boolean | null }) {
  const c = clientKind(who);
  return c.kind === "app" ? (
    <AppKeyDone who={who} keyText={keyText} prompt={prompt} pasteInto={c.pasteInto} listId={listId} copied={copied} />
  ) : (
    <AgentPromptDone prompt={prompt} who={who} listId={listId} copied={copied} />
  );
}

/**
 * An app's done state: the key in a one-line field with "Copy key", one sentence on where it goes, then "Or copy a
 * prompt for an AI agent" for anyone who picked a name but means a chatbot. Also the end of /connect/key.
 */
export function AppKeyDone({
  who,
  keyText,
  prompt,
  pasteInto,
  listId,
  listTitle,
  copied,
  scroll = true,
}: {
  who: string;
  keyText: string;
  prompt: string;
  pasteInto?: string;
  listId: string;
  /** Named where the list isn't already on screen (/connect/key). */
  listTitle?: string;
  copied: boolean | null;
  /** In a menu the done state is taller than the picker: bring it into view. Not on a page where it is already. */
  scroll?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroll) ref.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [scroll]);
  // "msgblast › Wants › Connect list": each › stays with the word before it, so a line never starts with one.
  const where = (pasteInto ?? "").replace(/ › /g, "\u00a0› ");
  const fieldId = `key-${listId}`;
  return (
    <div ref={ref} className="grid scroll-mt-20 gap-3 p-1">
      <div className="grid gap-1.5">
        <label htmlFor={fieldId} className="label">
          Key for {who}
          {listTitle && <span className="font-normal text-ink-2"> · {listTitle}</span>}
        </label>
        <div className="flex items-center gap-2">
          {/* No name: it is never part of a form, so it is never sent anywhere. Tapping it selects it all. */}
          <input
            id={fieldId}
            readOnly
            value={keyText}
            className="input key-field min-w-0 flex-1 font-mono text-[0.85rem]"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            onFocus={(e) => e.currentTarget.select()}
          />
          <CopyButton text={keyText} label={copied ? "Copy again" : "Copy key"} doneText="Copied" className={`btn flex-none ${copied ? "" : "btn-want"}`} />
        </div>
      </div>
      <p role="status" className="font-medium text-ink">
        {copied ? "Copied. " : ""}
        {pasteInto ? `Paste it into ${where}.` : `Paste it where ${who} asks for a key.`}
      </p>
      <CopyButton text={prompt} label="Or copy a prompt for an AI agent" doneText="Prompt copied" className="textlink-btn w-fit text-[0.88rem]" />
      <p className="text-[0.82rem] text-ink-3">
        Anyone with this key can add to this list as {who} until you remove it in{" "}
        <Link to={`/app/lists/${listId}/settings#keys-h`} className="link">
          Settings › Agents
        </Link>
        . The key is shown this once.
      </p>
    </div>
  );
}

/**
 * Copy inside the press (Safari allows clipboard writes only there), filled in when the key arrives; browsers without
 * ClipboardItem try once the key is back. `text` is what to copy once the fetcher has answered.
 */
export function useCopyOnPress(fetcher: FetcherWithComponents<unknown>, text: string | null) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const pending = useRef<{ resolve: (b: Blob) => void; reject: (e: unknown) => void } | null>(null);
  useEffect(() => {
    if (!pending.current || fetcher.state !== "idle" || !fetcher.data) return;
    const p = pending.current;
    pending.current = null;
    if (text) p.resolve(new Blob([text], { type: "text/plain" }));
    else p.reject(new Error("no key"));
  }, [fetcher.state, fetcher.data, text]);
  useEffect(() => {
    if (text && copied === null && !("ClipboardItem" in window)) {
      navigator.clipboard?.writeText(text).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    }
  }, [text, copied]);
  const start = () => {
    if ("ClipboardItem" in window && navigator.clipboard?.write) {
      const blob = new Promise<Blob>((resolve, reject) => (pending.current = { resolve, reject }));
      navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    }
  };
  return { copied, start };
}

/** The done state: what to do next, the prompt's facts (list, server, key) with Copy, and the one-time note. */
export function AgentPromptDone({ prompt, who, listId, copied }: { prompt: string; who: string; listId: string; copied: boolean | null }) {
  // The done state is taller than the picker: bring its top into view so "Copied", the prompt and the one-time note are
  // on one phone screen.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);
  return (
    <div ref={ref} className="grid scroll-mt-20 gap-3 p-1">
      <p role="status" className="font-medium text-ink">
        {copied ? `Copied. Paste it to ${who}.` : `Copy this, then paste it to ${who}.`}
      </p>
      <div className="prompt-box grid gap-2">
        {/* Owner, 25 Nov 2026, on seeing only the first line: "doesnt mention the list or the token". */}
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

function Step({ round, listId, listUrl, existing, onList }: { round: number; listId: string; listUrl: string; existing: string[]; onList: string[] }) {
  const { mcpUrl } = useRootData();
  const fetcher = useFetcher<KeyResult>({ key: `share-agent-${listId}-${round}` });
  // Each step is its own form, so its radios are their own group even when the step is on a page twice.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // The agent already on the list, when there is exactly one kind: picked to begin with (review G3).
  const kinds = [...new Set(onList.map((n) => n.trim().toLowerCase()).filter(Boolean))];
  // Only a name with a chip, so what is picked can be seen (an agent named by hand is typed again under "Other").
  const known = kinds.length === 1 ? [...FIRST, ...OTHER].find((n) => n.toLowerCase() === kinds[0].toLowerCase()) : undefined;
  const [name, setName] = useState<string>(known ?? "");
  const [typed, setTyped] = useState("");
  const [again, setAgain] = useState(false);

  // A typed name wins over a chip (the server reads agent_name_other first, too).
  const agentName = (typed.trim() || name).trim();
  const app = !!agentName && clientKind(agentName).kind === "app";
  const busy = fetcher.state !== "idle";
  const result = fetcher.data?.intent === "create-key" ? fetcher.data : undefined;
  const prompt = result?.key ? fillPrompt(AGENT_PROMPT_WITH_KEY, { mcpUrl, listUrl, key: result.key }) : null;
  const duplicate = !!agentName && existing.some((n) => n.toLowerCase() === agentName.toLowerCase());
  // What the press copies: the key for an app, the prompt for a chat agent (by the name the server gave back).
  const doneApp = result?.agent ? clientKind(result.agent.name).kind === "app" : app;
  const { copied, start } = useCopyOnPress(fetcher as FetcherWithComponents<unknown>, result?.key ? (doneApp ? result.key : prompt) : null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agentName) return;
    start();
    fetcher.submit({ intent: "create-key", agent_name: agentName }, { method: "post", action: `/app/lists/${listId}/settings` });
  };

  if (prompt && result?.agent && result.key) return <KeyDone who={result.agent.name} keyText={result.key} prompt={prompt} listId={listId} copied={copied} />;

  const chip = (n: string) => {
    const mark = agentMark(n);
    const on = name === n && !typed.trim();
    return (
      <label key={n} className={`swatch-option agent-chip flex-none ${on ? "is-on" : ""}`}>
        <input type="radio" name="agent_name" value={n} checked={on} onChange={() => (setName(n), setTyped(""))} className="sr-only" />
        {mark && (
          <span className="agent-chip-mark" aria-hidden="true">
            <img src={mark.light} alt="" width={16} height={16} className={mark.dark ? "brand-logo-light" : ""} style={markStyle(mark)} />
            {mark.dark && <img src={mark.dark} alt="" width={16} height={16} className="brand-logo-dark" style={markStyle(mark)} />}
          </span>
        )}
        {n}
      </label>
    );
  };

  return (
    <fetcher.Form method="post" action={`/app/lists/${listId}/settings`} onSubmit={onSubmit} className="grid gap-3 p-1">
      <input type="hidden" name="intent" value="create-key" />
      <fieldset className="grid gap-2">
        <legend className="label mb-1">Which agent?</legend>
        <div className="flex flex-wrap items-start gap-2">
          {FIRST.map(chip)}
          {/* "Other" opens the rest and a name field; a details element, so it opens without JavaScript too. */}
          <details className="choice-other" ref={(d) => { if (d && known && OTHER.includes(known) && !d.dataset.init) { d.dataset.init = "1"; d.open = true; } }}>
            <summary className="swatch-option agent-chip flex-none w-fit">Other</summary>
            <div className="mt-2 grid w-full gap-2">
              <div className="flex flex-wrap gap-2">{OTHER.map(chip)}</div>
              <label className="field">
                <span className="label">Or its name</span>
                <input
                  name="agent_name_other"
                  className="input"
                  maxLength={60}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="e.g. My home assistant"
                  autoComplete="off"
                />
              </label>
            </div>
          </details>
        </div>
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
        // Disabled only once JavaScript knows no agent is picked, and then it says why; without JavaScript the server
        // answers an empty choice.
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button className="btn btn-want w-full sm:w-fit" disabled={busy || (hydrated && !agentName)} aria-describedby={hydrated && !agentName ? `pick-${listId}-${round}` : undefined}>
            {busy ? "Creating…" : app ? "Create key and copy it" : "Create key and copy prompt"}
          </button>
          {hydrated && !agentName && (
            <span id={`pick-${listId}-${round}`} className="text-[0.85rem] text-ink-3">
              Pick an agent
            </span>
          )}
        </div>
      )}
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
    </fetcher.Form>
  );
}
