/**
 * /app/skills (SPEC 14.4): standing instructions a person writes once ("How I shop") that every agent they connect
 * follows, on every list. Only the person writes them, only their own agents read them. Never on a public page.
 *
 * The editor opens on this same page (?new=<starter> or ?edit=<id>), so everything works without JavaScript.
 */
import { afterChange } from "~/lib/prg.server";
import { useEffect, useRef, useState } from "react";
import { data, Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import type { Route } from "./+types/app-skills";
import { api, ApiError, formError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { orFallback, orUnavailable } from "~/lib/degrade.server";
import { assertSameOrigin } from "~/lib/session.server";
import type { AgentInfo, Skill, SkillList } from "~/lib/types";
import { ViewSwitch } from "./app";

export function meta() {
  return [{ title: "Skills · The Want MCP" }, { name: "robots", content: "noindex" }];
}

const MAX_SKILLS = 20;
const LIMITS = { title: 80, description: 300, body: 20_000 };

/** Sample text for a first skill: something a real shopper would write, short enough for one phone screen. */
const STARTERS: Record<string, { title: string; description: string; body: string }> = {
  shop: {
    title: "How I shop",
    description: "Whenever you shop for me",
    body: [
      "I live in Austin, TX 78704. Ship to my home address.",
      "",
      "Sizes: women's M tops, 8 in jeans, 7.5 in shoes.",
      "",
      "Stores I trust: Target, Costco, REI and the brand's own site. Skip marketplace sellers I can't return to.",
      "",
      "Never refurbished or open-box.",
      "",
      "Ask me before anything over $200.",
    ].join("\n"),
  },
  gifts: {
    title: "Gifts for my family",
    description: "When a list is for gifts",
    body: [
      "Mom: gardening and mystery novels. No more mugs.",
      "Dad: cooks and grills, likes good knives.",
      "My sister: vegan, runs half marathons.",
      "",
      "About $50 each. It has to arrive by December 20.",
      "Add a gift receipt when the store offers one.",
    ].join("\n"),
  },
  ask: {
    title: "How to ask me things",
    description: "Before you ask me anything",
    body: [
      "Ask one question at a time, with two or three answers I can tap.",
      "",
      "Don't ask about anything under $25: pick the best reviewed.",
      "",
      "If I haven't answered in a day, take the cheaper option and tell me which one you picked.",
    ].join("\n"),
  },
  blank: { title: "", description: "", body: "" },
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const [skills, agents] = await Promise.all([
    orUnavailable(api<SkillList>(request, "/me/skills"), "/app/skills"),
    // The person's own agents: is anyone there to read these yet?
    orFallback(api<AgentInfo[]>(request, "/me/agents"), [] as AgentInfo[], "/app/skills"),
  ]);
  const list = skills.value?.data ?? [];
  const editId = url.searchParams.get("edit");
  const starter = url.searchParams.get("new");
  const editing = editId ? (list.find((k) => k.id === editId) ?? null) : null;
  return data(
    {
      skills: list,
      unavailable: skills.unavailable,
      hasAgent: agents.length > 0,
      editor: editing
        ? { id: editing.id, title: editing.title, description: editing.description, body: editing.body, enabled: editing.enabled }
        : starter && STARTERS[starter] && list.length < MAX_SKILLS
          ? // A starter's text is an example, never someone else's details saved as yours (review D1): the box starts empty.
            { id: null, title: STARTERS[starter].title, description: STARTERS[starter].description, body: "", example: STARTERS[starter].body, enabled: true }
          : null,
      saved: url.searchParams.get("saved"),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function act({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = String(form.get("id") ?? "");
  const text = (k: string) => String(form.get(k) ?? "").trim();
  try {
    if (intent === "save") {
      const body = { title: text("title"), body: text("body"), description: text("description") };
      if (id) {
        await api<Skill>(request, `/me/skills/${encodeURIComponent(id)}`, { method: "PATCH", body });
        return redirect(`/app/skills?saved=edit`);
      }
      const first = text("first") === "1";
      await api<Skill>(request, "/me/skills", { method: "POST", body });
      return redirect(`/app/skills?saved=${first ? "first" : "new"}`);
    }
    if (intent === "toggle") {
      await api<Skill>(request, `/me/skills/${encodeURIComponent(id)}`, { method: "PATCH", body: { enabled: text("enabled") === "true" } });
      return { ok: true, intent };
    }
    if (intent === "delete") {
      await api(request, `/me/skills/${encodeURIComponent(id)}`, { method: "DELETE" });
      return redirect("/app/skills");
    }
    return data({ error: "Unknown action", intent }, 400);
  } catch (err) {
    // The cap answers rate_limited with its own sentence ("You have 20 skills. Delete one to add another."): say that.
    if (err instanceof ApiError && err.code === "rate_limited" && /skills?\b/i.test(err.message)) return data({ error: err.message, intent }, 429);
    const e = formError(err);
    const field = /\btitle\b/i.test(e.error) ? "title" : /\bbody\b/i.test(e.error) ? "body" : /\bdescription\b/i.test(e.error) ? "description" : null;
    return data({ ...e, intent, field }, 400);
  }
}

export default function Skills({ loaderData, actionData }: Route.ComponentProps) {
  const { skills, unavailable, hasAgent, editor, saved } = loaderData;
  const atCap = skills.length >= MAX_SKILLS;
  const error = actionData && "error" in actionData ? actionData.error : null;
  const field = actionData && "field" in actionData ? (actionData.field as string | null) : null;
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[47.5rem] gap-6 px-4 pt-8 pb-16 sm:pt-10">
        <header className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.4rem]">Skills</h1>
            {skills.length > 0 && !editor && !atCap && (
              <Link to="?new=blank" className="btn btn-want">
                New skill
              </Link>
            )}
          </div>
          <ViewSwitch current="skills" />
          {/* What it's for, in one line; who reads it, once on the page. Not while writing one: the person has decided,
              and the form starts higher on a phone. */}
          {!editor && (
            <p className="text-[1.02rem] text-ink-2">
              Tell your agents once how you like things done: your sizes, the stores you trust, when to ask first. They follow it on every list.{" "}
              <span className="text-ink-3">Only agents you connect read these.</span>
            </p>
          )}
        </header>

        {unavailable && (
          <p role="alert" className="card px-5 py-4 text-[0.95rem]">
            We couldn't load your skills just now.{" "}
            <a href="/app/skills" className="link">
              Try again
            </a>
            . Reference: <code className="font-semibold">{unavailable}</code>
          </p>
        )}

        {saved && !editor && <SavedNote first={saved === "first"} hasAgent={hasAgent} />}
        {error && !editor && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}

        {editor ? (
          <Editor key={editor.id ?? "new"} editor={editor} first={skills.length === 0} error={error} field={field} />
        ) : skills.length === 0 && !unavailable ? (
          <FirstRun />
        ) : (
          <>
            <ul className="grid gap-3">
              {skills.map((k) => (
                <SkillCard key={k.id} skill={k} />
              ))}
            </ul>
            {atCap && <p className="text-[0.92rem] text-ink-2">You have {MAX_SKILLS} skills. Delete one to add another.</p>}
          </>
        )}
      </div>
    </div>
  );
}

/** After a save: what happens next, and Connect when nobody is there to read it yet. */
function SavedNote({ first, hasAgent }: { first: boolean; hasAgent: boolean }) {
  return (
    <p role="status" className="card px-5 py-4 text-[0.95rem]">
      Saved. {first ? "Your agents get it the next time they start work." : "Your agents get the change the next time they start work."}
      {!hasAgent && (
        <>
          {" "}
          No agent is connected yet.{" "}
          <Link to="/connect" className="link font-medium">
            Connect one
          </Link>
          .
        </>
      )}
    </p>
  );
}

function FirstRun() {
  return (
    <section aria-labelledby="start-h" className="card grid gap-4 p-5 sm:p-6">
      <h2 id="start-h" className="text-[1.2rem] font-semibold">
        Start with one of these
      </h2>
      <ul className="grid gap-2">
        {(["shop", "gifts", "ask"] as const).map((key) => (
          <li key={key}>
            <Link to={`?new=${key}`} className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-line px-4 py-3 hover:bg-sunk">
              <span className="font-medium">{STARTERS[key].title}</span>
              <span aria-hidden="true" className="text-ink-3">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="?new=blank" className="link w-fit text-[0.92rem]">
        Or start from a blank page
      </Link>
    </section>
  );
}

/** One skill: its title, the first line of what it says, and an on/off switch. Off stays in the list, visibly off. */
function SkillCard({ skill }: { skill: Skill }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const pending = fetcher.formData?.get("enabled");
  const on = pending !== undefined && pending !== null ? pending === "true" : skill.enabled;
  const firstLine = skill.body.split("\n").find((l) => l.trim()) ?? "";
  return (
    <li className={`card relative grid gap-2 p-5 sm:p-6 ${on ? "" : "skill-off"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.15rem] leading-snug font-semibold">
            <Link to={`?edit=${skill.id}`} className="stretched-link">
              {skill.title}
            </Link>
          </h2>
          <p className="mt-1 truncate text-[0.92rem] text-ink-2">{firstLine}</p>
          {!on && <p className="mt-1 text-[0.88rem] font-medium text-ink-2">Off: agents don't get it</p>}
        </div>
        <fetcher.Form method="post" className="relative z-[2] flex-none">
          <input type="hidden" name="intent" value="toggle" />
          <input type="hidden" name="id" value={skill.id} />
          <input type="hidden" name="enabled" value={String(!on)} />
          <button
            role="switch"
            aria-checked={on}
            aria-label={`${skill.title}: ${on ? "on" : "off"}`}
            className={`relative h-8 w-14 rounded-full border-2 transition ${on ? "border-want bg-want" : "border-line-strong bg-sunk"}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-all ${on ? "left-[1.6rem]" : "left-0.5"}`} />
          </button>
        </fetcher.Form>
      </div>
      {fetcher.data?.error && (
        <p role="alert" className="form-error">
          {fetcher.data.error}
        </p>
      )}
    </li>
  );
}

/**
 * Three fields and one primary action. The instructions grow with the text (no box scrolling inside the page), and the
 * actions stay above the phone's keyboard (sticky to the bottom of the screen).
 */
function Editor({
  editor,
  first,
  error,
  field,
}: {
  editor: { id: string | null; title: string; description: string; body: string; enabled: boolean; example?: string };
  first: boolean;
  error: string | null;
  /** The field the server's validation sentence is about: shown beside it. */
  field: string | null;
}) {
  const nav = useNavigation();
  const busy = nav.state === "submitting" && nav.formData?.get("intent") === "save";
  const [title, setTitle] = useState(editor.title);
  const [body, setBody] = useState(editor.body);
  const [description, setDescription] = useState(editor.description);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // Browsers without field-sizing: grow the box to its text.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || CSS.supports?.("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [body]);
  const near = (value: string, max: number) => value.length >= max * 0.9;
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const example = editor.example ?? "";
  return (
    <section aria-labelledby="editor-h" className="card grid gap-4 p-5 sm:p-6">
      <h2 id="editor-h" className="text-[1.2rem] font-semibold">
        {editor.id ? "Edit skill" : "New skill"}
      </h2>
      <Form method="post" className="grid gap-4">
        <input type="hidden" name="intent" value="save" />
        {editor.id && <input type="hidden" name="id" value={editor.id} />}
        {first && <input type="hidden" name="first" value="1" />}
        <label className="field">
          <span className="label">Title</span>
          <input name="title" required maxLength={LIMITS.title} value={title} onChange={(e) => setTitle(e.target.value)} className="input" autoFocus={!editor.title} />
          {near(title, LIMITS.title) && <span className="hint">{LIMITS.title - title.length} characters left</span>}
          {field === "title" && error && <span className="form-error">{error}</span>}
        </label>
        <label className="field">
          <span className="label">Instructions</span>
          <textarea
            ref={bodyRef}
            name="body"
            required
            maxLength={LIMITS.body}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            // Tall enough for the whole example, wrapped at about a phone's width (36 characters a line).
            rows={example && !body ? `For example:\n${example}`.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 36)), 0) + 1 : 6}
className={`textarea skill-body ${example && !body ? "is-example" : ""}`}
            placeholder={example ? `For example:\n${example}` : "Your sizes, stores you trust, your budget, when to ask you first…"}
          />
          {example && !body && hydrated && (
            <button type="button" className="textlink-btn w-fit text-[0.85rem]" onClick={() => (setBody(example), requestAnimationFrame(() => bodyRef.current?.focus()))}>
              Start from the example
            </button>
          )}
          {near(body, LIMITS.body) && <span className="hint">{(LIMITS.body - body.length).toLocaleString("en-US")} characters left</span>}
          {field === "body" && error && <span className="form-error">{error}</span>}
        </label>
        <label className="field">
          <span className="label">When should agents use it? (optional)</span>
          <input
            name="description"
            maxLength={LIMITS.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            placeholder={`Whenever you work on a list for me: ${title.trim() || "this skill"}`}
          />
          {near(description, LIMITS.description) && <span className="hint">{LIMITS.description - description.length} characters left</span>}
          {field === "description" && error && <span className="form-error">{error}</span>}
        </label>
        {error && !field && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {/* Said once, at the moment of writing; outside the sticky Save row so that row stays one line on a phone. */}
        <p className="text-[0.85rem] text-ink-3">Only agents you connect read it.</p>
        <div className="editor-actions flex flex-wrap items-center gap-3">
          {/* Nothing to save until something is written (D1). */}
          <button className="btn btn-want" disabled={busy || (hydrated && !body.trim())}>
            {busy ? "Saving…" : "Save"}
          </button>
          <Link to="/app/skills" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </Form>
      {editor.id && (
        // Two steps, no typing: "Delete skill…", then the confirm that names it.
        <details className="border-t border-line pt-3">
          <summary className="textlink-btn inline-flex min-h-11 items-center text-[0.92rem] text-danger">Delete skill…</summary>
          <Form method="post" className="mt-2 grid gap-2">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={editor.id} />
            <p className="text-[0.92rem]">Delete “{editor.title}”? Your agents stop getting it.</p>
            <button className="btn btn-danger w-fit">Yes, delete it</button>
          </Form>
        </details>
      )}
    </section>
  );
}

/** Without JavaScript, a change that worked is answered with a redirect back here (prg.server.ts), never re-posted. */
export async function action(args: Route.ActionArgs) {
  return afterChange(args.request, await act(args));
}
