import { useEffect, useRef } from "react";
import { Form, Link } from "react-router";
import { AGENT_PROMPT_SIGN_IN, fillPrompt } from "~/lib/agent-prompt";
import { LIVE_BRANDS } from "~/lib/brands";
import { useRootData } from "~/lib/hooks";
import { BrandLogo } from "./BrandLogo";
import { CopyButton } from "./CopyButton";

/** The chat apps offered as shortcuts to their own steps on /connect. */
const CHAT_APPS = ["chatgpt", "claude", "grok-bot", "gemini"];

/**
 * The one next step after making a list: give it to an agent. Shown to the owner until an agent connects to the list
 * or writes on it, or they dismiss it (per list, kept in a cookie, so it works without JavaScript).
 */
export function GiveToAgent({ listId, listUrl, focus, connectedName }: { listId: string; listUrl: string; focus: boolean; connectedName: string | null }) {
  const { mcpUrl } = useRootData();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current?.focus();
  }, [focus]);
  const prompt = fillPrompt(AGENT_PROMPT_SIGN_IN, { mcpUrl, listUrl });
  const apps = LIVE_BRANDS.filter((b) => CHAT_APPS.includes(b.id));
  return (
    <section aria-labelledby="give-h" className="give-agent card grid gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 id="give-h" ref={heading} tabIndex={-1} className="text-[1.25rem] leading-tight font-semibold outline-none">
          Give this list to your agent
        </h2>
        <Form method="post" replace preventScrollReset>
          <input type="hidden" name="intent" value="dismiss-handoff" />
          <button className="btn btn-ghost btn-xs text-ink-3">
            Not now<span className="sr-only">: hide this step for this list</span>
          </button>
        </Form>
      </div>
      <p className="text-ink-2">
        {connectedName
          ? `${connectedName} is already connected to your account. Paste this into it to start on this list.`
          : "Paste this into the AI app you use. It connects and starts on your list."}
      </p>
      {/* Three lines and Copy; the whole text one click away (it's long, and people only need to paste it). */}
      <div className="grid gap-2">
        <details className="prompt-peek">
          <summary className="grid gap-1">
            <span className="codeblock prompt-peek-text text-[0.8rem]" aria-hidden="true">
              {prompt.split("\n").slice(0, 3).join("\n")}
            </span>
            <span className="add-link w-fit text-[0.85rem]">Show all</span>
          </summary>
          <pre className="codeblock text-[0.8rem]" tabIndex={0} role="region" aria-label="Prompt for your agent">
            {prompt}
          </pre>
        </details>
        <CopyButton text={prompt} label="Copy prompt" doneText="Copied" className="btn btn-want btn-sm w-fit" />
      </div>
      <div className="grid gap-2">
        <p className="text-[0.9rem] text-ink-2">Using a chat app? Follow its steps:</p>
        <ul className="flex flex-wrap gap-2">
          {apps.map((b) => (
            <li key={b.id}>
              <Link to={`/connect?list=${encodeURIComponent(listId)}#${b.id}`} aria-label={`Steps for ${b.name}`} className="btn btn-sm gap-2">
                <BrandLogo brand={b} scale={0.7} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[0.9rem]">
        <a
          href="#new-item"
          className="link"
          onClick={(e) => {
            const input = document.getElementById("new-item");
            if (input) {
              e.preventDefault();
              input.focus();
              input.scrollIntoView({ block: "center" });
            }
          }}
        >
          Or add what you want first
        </a>
      </p>
    </section>
  );
}
