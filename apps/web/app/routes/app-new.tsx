/**
 * /app/new: make a list (format, title, who can see it). After it is made, the list opens with the
 * one next step: give it to your agent (?new=1 on the list page).
 */
import { resolveLook } from "~/themes/catalogue.server";
import { cleanRef, RefField } from "~/lib/ref";
import { useState } from "react";
import { data, Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/app-new";
import { api, formError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { FORMATS, type FormatInfo } from "~/lib/formats";
import { moneyPlaceholder, useCurrency } from "~/lib/hooks";
import { assertSameOrigin } from "~/lib/session.server";
import type { ListFormat, ListSummary, ListVisibility } from "~/lib/types";

export function meta() {
  return [{ title: "New list · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const lists = await api<ListSummary[]>(request, "/me/lists").catch(() => [] as ListSummary[]);
  return data({ first: lists.length === 0 }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return data({ error: "Give the list a title" }, 400);
  try {
    const list = await api<ListSummary>(request, "/lists", {
      method: "POST",
      body: {
        title,
        description: String(form.get("description") ?? "").trim() || undefined,
        format: ["shopping", "tasks", "research"].includes(String(form.get("format"))) ? form.get("format") : "shopping",
        // Always explicit; anything but a deliberate "public" is private.
        visibility: form.get("visibility") === "public" ? "public" : "private",
        note: String(form.get("note") ?? "").trim() || undefined,
      },
      ref: cleanRef(form.get("ref")),
    });
    // Started from a look's preview (?look=): dress the new list in it.
    const look = String(form.get("look") ?? "");
    if (/^[a-z0-9-]{1,60}$/.test(look)) await api(request, `/lists/${list.id}`, { method: "PATCH", body: { theme: resolveLook(look, list.format ?? "shopping").slug } }).catch(() => null);
    return redirect(`/l/${list.id}?new=1`);
  } catch (err) {
    return data(formError(err), 400);
  }
}

export default function NewList({ loaderData }: Route.ComponentProps) {
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[47.5rem] gap-4 px-4 pt-8 pb-16 sm:pt-10">
        <Link to="/app" className="link w-fit text-[0.9rem] text-ink-3">
          ← Your lists
        </Link>
        <CreateList first={loaderData.first} />
      </div>
    </div>
  );
}

function CreateList({ first }: { first: boolean }) {
  const currency = useCurrency();
  const nav = useNavigation();
  const result = useActionData<typeof action>() as { error?: string } | undefined;
  const busy = nav.state === "submitting" && nav.formData?.get("intent") === "create-list";
  // ?format= from a "Start a … list" button picks the format; the person can still change it.
  const [params] = useSearchParams();
  const asked = params.get("format");
  const [format, setFormat] = useState<ListFormat>(asked === "tasks" || asked === "research" ? asked : "shopping");
  // An explicit choice, private until the person picks public.
  const [vis, setVisibility] = useState<ListVisibility>("private");
  const fi = FORMATS[format];
  return (
    <section aria-labelledby="new-h" className="card grid gap-4 p-5 sm:p-7">
      <h1 id="new-h" className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">
        New list
      </h1>
      {/* Title first and focused; the rest fits on one phone screen with Create; extras one tap away. */}
      <Form method="post" className="grid gap-4">
        <input type="hidden" name="intent" value="create-list" />
        <RefField />
        {params.get("look") && <input type="hidden" name="look" value={params.get("look")!} />}
        <label className="field">
          <span className="label">Title</span>
          <input
            name="title"
            required
            autoFocus
            maxLength={140}
            placeholder={format === "shopping" ? "Christmas gifts" : format === "tasks" ? "Moving day" : "Heat pump questions"}
            className="input"
          />
        </label>
        <fieldset className="grid gap-1.5">
          <legend className="label mb-1">What is it for?</legend>
          {(Object.values(FORMATS) as FormatInfo[]).map((f) => (
            <label key={f.format} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 ${format === f.format ? "border-ink-3 bg-sunk" : "border-line"}`}>
              <input type="radio" name="format" value={f.format} checked={format === f.format} onChange={() => setFormat(f.format)} className="h-5 w-5 flex-none accent-[var(--ink)]" />
              <span className="min-w-0">
                <span className="font-semibold">{f.label}</span>
                <span className="text-[0.85rem] text-ink-3"> · {f.format === "shopping" ? "things to buy" : f.format === "tasks" ? "things to get done" : "questions to answer"}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-1.5">
          <legend className="label mb-1">Who can see it?</legend>
          {(["private", "public"] as const).map((v) => (
            <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.88rem]">
              {/* A fixed size that never shrinks: a long line beside it used to squeeze the radio. */}
              <input type="radio" name="visibility" value={v} checked={vis === v} onChange={() => setVisibility(v)} className="h-5 w-5 flex-none accent-[var(--ink)]" />
              <span>
                <span className="font-semibold">{v === "public" ? "Public" : "Private"}</span>
                <span className="text-ink-3">
                  {v === "public" ? ": anyone with the link, and it can appear on the home page and in search." : ": only you and people you invite."}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        {result?.error && (
          <p className="form-error" role="alert">
            {result.error}
          </p>
        )}
        <button className="btn btn-want w-full sm:w-fit" disabled={busy}>
          {busy ? "Creating…" : `Create ${fi.label.toLowerCase()} list`}
        </button>
        <details className="group">
          <summary className="textlink-btn inline-flex min-h-11 items-center text-[0.9rem]">
            Add a description or a note for agents <span aria-hidden="true" className="ml-1 inline-block transition group-open:rotate-90">›</span>
          </summary>
          <div className="mt-2 grid gap-4">
            <label className="field">
              <span className="label">Description (optional)</span>
              <textarea name="description" maxLength={500} className="textarea" placeholder={fi.detailsPlaceholder} />
            </label>
            <label className="field">
              <span className="label">Note for agents (optional)</span>
              <textarea name="note" maxLength={600} className="textarea min-h-16" placeholder={moneyPlaceholder("Gifts for Dad, about {50} each, ship to Denver", currency)} />
              <span className="hint">Everyone who can write this list, and their agents, can see it. Never public.</span>
            </label>
          </div>
        </details>
      </Form>
    </section>
  );
}
