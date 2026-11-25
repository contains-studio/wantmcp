/**
 * SPEC 16.5: feedback from anyone, signed in or not. It becomes a task on our own feedback list. No email field, no
 * promise of a reply. `about` is the page the person came from (the footer link passes it), never a token or id.
 */
import { useEffect, useRef, useState } from "react";
import { data, Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/feedback";
import { api, ApiError, formError } from "~/lib/api.server";
import { FEEDBACK_KINDS, FEEDBACK_LIMITS, feedbackAbout } from "~/lib/feedback";
import { assertSameOrigin } from "~/lib/session.server";
import type { FeedbackInput, FeedbackKind, FeedbackResult } from "~/lib/types";

export function meta() {
  return [{ title: "Feedback · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return { about: feedbackAbout(url.searchParams.get("from")) ?? null, sent: url.searchParams.get("sent") === "1" };
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const kind = String(form.get("kind") ?? "") as FeedbackKind;
  const text = String(form.get("text") ?? "").trim();
  const expected = kind === "request" ? "" : String(form.get("expected") ?? "").trim();
  const about = feedbackAbout(String(form.get("about") ?? ""));
  if (!FEEDBACK_KINDS.some((k) => k.kind === kind)) return data({ error: "Pick one of the three." }, 400);
  if (!text) return data({ error: kind === "request" ? "Say what you'd like it to do." : "Say what happened." }, 400);
  const body: FeedbackInput = { kind, text, ...(expected ? { expected } : {}), ...(about ? { about } : {}) };
  try {
    await api<FeedbackResult>(request, "/feedback", { method: "POST", body });
  } catch (err) {
    // The limit is the server's own sentence (SPEC 16.3), as are its validation messages.
    if (err instanceof ApiError && err.code === "rate_limited") return data({ error: err.message }, 429);
    return data(formError(err), err instanceof ApiError ? err.status : 503);
  }
  throw redirect("/feedback?sent=1");
}

export default function Feedback({ loaderData, actionData }: Route.ComponentProps) {
  const { about, sent } = loaderData;
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [text, setText] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Browsers without field-sizing: grow the box to its text.
  useEffect(() => {
    const el = textRef.current;
    if (!el || CSS.supports?.("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);
  const error = actionData && "error" in actionData ? actionData.error : null;

  if (sent) {
    return (
      <div role="status" className="wrap grid max-w-xl gap-3 py-10 sm:py-14">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em]">
          Thanks. It's on our list.
        </h1>
      </div>
    );
  }

  return (
    <div className="wrap grid max-w-xl gap-6 py-8 sm:py-14">
      <header className="grid gap-2">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2.4rem]">Feedback</h1>
        <p className="text-ink-2">It goes on the list we work from.</p>
      </header>
      <Form method="post" className="grid gap-5">
        {about && <input type="hidden" name="about" value={about} />}
        <fieldset className="grid gap-2">
          <legend className="sr-only">What kind of feedback?</legend>
          {FEEDBACK_KINDS.map((k) => (
            <label
              key={k.kind}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-3 text-[1.02rem] font-medium ${kind === k.kind ? "border-ink-3 bg-sunk" : "border-line"}`}
            >
              <input type="radio" name="kind" value={k.kind} required checked={kind === k.kind} onChange={() => setKind(k.kind)} className="h-5 w-5 flex-none accent-[var(--ink)]" />
              {k.label}
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span className="label">{kind === "request" ? "What should it do?" : "What happened?"}</span>
          <textarea
            ref={textRef}
            name="text"
            required
            maxLength={FEEDBACK_LIMITS.text}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="textarea feedback-text"
          />
          {text.length >= FEEDBACK_LIMITS.text * 0.9 && <span className="hint">{FEEDBACK_LIMITS.text - text.length} characters left</span>}
        </label>
        {kind !== "request" && (
          <label className="field">
            <span className="label">
              What did you expect? <span className="font-normal text-ink-3">(optional)</span>
            </span>
            <textarea name="expected" maxLength={FEEDBACK_LIMITS.expected} rows={2} className="textarea feedback-text feedback-short" />
          </label>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="btn btn-want w-full sm:w-fit" disabled={busy}>
          {busy ? "Sending…" : "Send"}
        </button>
      </Form>
    </div>
  );
}
