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
import { BIO_PLACEHOLDER } from "~/lib/locales";
import { assertSameOrigin } from "~/lib/session.server";
import type { ListFormat, ListSummary, ListVisibility } from "~/lib/types";

export function meta() {
  return [{ title: "New list · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const lists = await api<ListSummary[]>(request, "/me/lists").catch(() => [] as ListSummary[]);
  return data({ first: lists.length === 0, hasBio: !!user.bio }, { headers: { "Cache-Control": "private, no-store" } });
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
    // Offered once, with the first list: the bio for the person's own agents (SPEC 12.2).
    const bio = String(form.get("bio") ?? "").trim();
    if (bio) await api(request, "/me", { method: "PATCH", body: { bio } }).catch(() => null);
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
        <CreateList first={loaderData.first} hasBio={loaderData.hasBio} />
      </div>
    </div>
  );
}

function CreateList({ first, hasBio }: { first: boolean; hasBio: boolean }) {
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
      <Form method="post" className="grid gap-4">
        <input type="hidden" name="intent" value="create-list" />
        <RefField />
        {params.get("look") && <input type="hidden" name="look" value={params.get("look")!} />}
        <fieldset className="grid gap-2">
          <legend className="label mb-1">What is this list for?</legend>
          {(Object.values(FORMATS) as FormatInfo[]).map((f) => (
            <label
              key={f.format}
              className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-md border p-3 ${format === f.format ? "border-ink-3 bg-sunk" : "border-line"}`}
            >
              <input
                type="radio"
                name="format"
                value={f.format}
                checked={format === f.format}
                onChange={() => setFormat(f.format)}
                className="mt-1 accent-[var(--ink)]"
              />
              <span>
                <span className="block font-semibold">{f.label}</span>
                <span className="block text-[0.82rem] text-ink-2">{f.blurb}</span>
                <span className="mt-0.5 block text-[0.76rem] text-ink-3">e.g. {f.examples}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span className="label">Title</span>
          <input
            name="title"
            required
            maxLength={140}
            placeholder={format === "shopping" ? "Black Friday 2026" : format === "tasks" ? "Moving day" : "Heat pump questions"}
            className="input"
          />
        </label>
        <label className="field">
          <span className="label">Description (optional)</span>
          <textarea name="description" maxLength={500} className="textarea" placeholder={fi.detailsPlaceholder} />
        </label>
        <details className="group">
          <summary className="textlink-btn text-[0.85rem]">
            Note for agents{" "}
            <span aria-hidden="true" className="inline-block transition group-open:rotate-90">
              ›
            </span>
          </summary>
          <label className="field mt-2">
            <span className="label">Note for agents (optional)</span>
            <textarea
              name="note"
              maxLength={600}
              className="textarea min-h-16"
              placeholder={moneyPlaceholder("Gifts for Dad, about {50} each, ship to Denver", currency)}
            />
            <span className="hint">Everyone who can write this list, and their agents, can see it. Never public.</span>
          </label>
        </details>
        {first && !hasBio && (
          <label className="field">
            <span className="label">Tell your agents about you (optional)</span>
            <textarea name="bio" maxLength={600} className="textarea min-h-16" placeholder={BIO_PLACEHOLDER} />
            <span className="hint">Only your own agents see this. Change it any time in Account.</span>
          </label>
        )}
        <fieldset className="grid gap-2">
          <legend className="label mb-1">Who can see it?</legend>
          {(["private", "public"] as const).map((v) => (
            <label key={v} className="flex cursor-pointer items-start gap-2 text-[0.88rem]">
              <input type="radio" name="visibility" value={v} checked={vis === v} onChange={() => setVisibility(v)} className="mt-1 accent-[var(--ink)]" />
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
        <button className="btn btn-want w-fit" disabled={busy}>
          {busy ? "Creating…" : `Create ${fi.label.toLowerCase()} list`}
        </button>
      </Form>
    </section>
  );
}
