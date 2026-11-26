import { data, Form, Link, redirect, useActionData, useFetcher, useNavigation, useSearchParams } from "react-router";
import { orFallback } from "~/lib/degrade.server";
import type { Route } from "./+types/settings";
import { AgentPrompt } from "~/components/AgentPrompt";
import { CopyButton } from "~/components/CopyButton";
import { Time } from "~/components/Time";
import { api, ApiError, apiOptional, formError, toRouteError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { moneyPlaceholder, useCurrency, useRootData } from "~/lib/hooks";
import { assertSameOrigin, flashCookie } from "~/lib/session.server";
import type { ActorRef, AgentInfo, HandoverResult, ListAccess, ListDetail, ListFormat, ListSummary, ListVisibility, Member, ShareListResult } from "~/lib/types";
import { LookFrame } from "~/components/LookFrame";
import { AccessRow, AgentMark, PersonMark, RemoveInTwoSteps } from "~/components/AccessRow";
import { AgentPromptDone, ShareWithAgent } from "~/components/ShareWithAgent";
import { AGENT_PROMPT_WITH_KEY, fillPrompt } from "~/lib/agent-prompt";
import { occasionViews, resolveLook, templateViews } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";
import type { ThemeView } from "~/themes/view";
import { useDeferredValue, useEffect, useState } from "react";
import { PrivateBadge } from "~/components/ListView";
import { FORMATS, formatInfo, formatOf, visibilityOf, type FormatInfo } from "~/lib/formats";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Settings${loaderData ? ` · ${loaderData.list.title}` : ""} · The Want MCP` }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);
  const id = encodeURIComponent(params.id);
  let list: ListDetail;
  try {
    list = await api<ListDetail>(request, `/lists/${id}`);
  } catch (err) {
    toRouteError(err);
  }
  if (!list.my_role) throw new Response("Not found", { status: 404 });
  const [members, agents, access] = await Promise.all([
    api<Member[]>(request, `/lists/${id}/members`).catch(() => [] as Member[]),
    // The owner sees every agent on the list, a member only their own. Older API servers
    // only have /me/agents, which lists the caller's own.
    orFallback(
      apiOptional<AgentInfo[]>(request, `/lists/${id}/agents`).then((all) => all ?? api<AgentInfo[]>(request, "/me/agents", { query: { list_id: params.id } })),
      [] as AgentInfo[],
      "/app/lists/:id/settings",
    ),
    // SPEC 21.5: who sent each pending invitation (an agent sends at once), joined on the invitation's id. Owner only.
    list.my_role === "owner" ? apiOptional<ListAccess>(request, `/lists/${id}/access`).catch(() => null) : Promise.resolve(null),
  ]);
  const { items: _items, ...summary } = list;
  // The owner's look gallery: every layout this format offers, each drawn in every offered occasion (plus the list's
  // own occasion if it is no longer offered), so tapping an occasion re-dresses all of them at once. Views are custom
  // properties and stylesheet names only.
  const owner = list.my_role === "owner";
  const format = formatOf(summary);
  const current = resolveLook(summary.theme ?? formatInfo(summary).defaultTheme, format);
  const looks = owner
    ? (() => {
        // The Sheet compares prices: shopping lists only.
        const templates = templateViews().filter((t) => format === "shopping" || t.layout !== "sheet");
        const keep = current.occasion && current.occasion.offered === false ? [current.occasion.slug] : [];
        const views: Record<string, ThemeView> = {};
        for (const t of templates) {
          views[t.slug] = t;
          for (const o of [...occasionViews(t.template), ...(keep.length ? occasionViews(t.template, keep) : [])]) views[o.slug] = o;
        }
        const occasions = [...occasionViews("sheet"), ...(keep.length ? occasionViews("sheet", keep) : [])].map((o) => ({
          slug: o.occasion!,
          name: o.name.split(" · ").pop()!,
          swatch: o.swatch,
          offered: !keep.includes(o.occasion!),
        }));
        return { templates, occasions, views };
      })()
    : null;
  // The miniatures show this list's own wants when it has a few (it's the owner's page); otherwise the sample, so the
  // layouts still look different.
  const own = list.items.filter((i) => !i.pending_review);
  const sample = owner
    ? own.length >= 2
      ? // Notes left out: a long agent note would fill every miniature with the same paragraph.
        { list: summary, items: own.slice(0, 4).map((i) => ({ ...i, details: "" })), prices: {}, comments: [] }
      : sampleList(Date.now(), format)
    : null;
  return data(
    {
      list: summary,
      role: list.my_role,
      members,
      agents,
      invitedBy: Object.fromEntries((access?.pending_invites ?? []).filter((p) => p.invited_by).map((p) => [p.id, p.invited_by!])) as Record<string, ActorRef>,
      looks,
      sample,
      currentTheme: current.slug,
      currentTemplate: current.template.slug,
      currentOccasion: current.occasion?.slug ?? null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** "3 people · 2 agents · 1 invited": who can write the list, from ListSummary.access (writers only). */
function accessLine(a: ListSummary["access"]): string | null {
  if (!a) return null;
  const parts = [`${a.people} ${a.people === 1 ? "person" : "people"}`, `${a.agents} ${a.agents === 1 ? "agent" : "agents"}`];
  if (a.pending_invites) parts.push(`${a.pending_invites} invited`);
  return parts.join(" · ");
}

type ActionData = {
  ok?: boolean;
  error?: string;
  intent?: string;
  key?: string;
  agent?: AgentInfo;
  devInvite?: string;
  sent?: boolean;
  handover?: HandoverResult;
};

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = encodeURIComponent(params.id);
  const s = (k: string) => String(form.get(k) ?? "").trim();
  try {
    switch (intent) {
      case "note":
        // SPEC 12.2: what is true of this list only. Writers and their agents see it; never public.
        await api(request, `/lists/${id}`, { method: "PATCH", body: { note: s("note") } });
        return { ok: true, intent } satisfies ActionData;
      case "rename":
        await api(request, `/lists/${id}`, { method: "PATCH", body: { title: s("title"), description: s("description") } });
        return { ok: true, intent } satisfies ActionData;
      case "theme": {
        const current = await api<ListDetail>(request, `/lists/${id}`);
        const format = formatOf(current);
        // With JavaScript the page sends the look; without it, the two radio groups (layout and occasion).
        const occ = s("occasion");
        const picked = resolveLook(s("theme") || (occ ? `${s("template")}--${occ}` : s("template")), format).slug;
        // The format's own default is stored as "no theme" so it follows the format; anything
        // else is stored explicitly.
        await api(request, `/lists/${id}`, { method: "PATCH", body: { theme: picked === resolveLook(formatInfo(current).defaultTheme, format).slug ? null : picked } });
        return { ok: true, intent } satisfies ActionData;
      }
      case "visibility":
        await api(request, `/lists/${id}`, { method: "PATCH", body: { visibility: s("visibility") === "private" ? "private" : "public" } });
        // From the list's own Share menu: back to the list.
        if (s("return") === `/l/${params.id}`) return redirect(`/l/${params.id}`);
        return { ok: true, intent } satisfies ActionData;
      case "format":
        await api(request, `/lists/${id}`, { method: "PATCH", body: { format: s("format") } });
        return { ok: true, intent } satisfies ActionData;
      case "outside":
        await api(request, `/lists/${id}`, { method: "PATCH", body: { allow_outside_suggestions: s("allow") === "true" } });
        return { ok: true, intent } satisfies ActionData;
      case "invite": {
        let devInvite: string | undefined;
        // A local API server echoes the invite token. Only surfaced in development builds.
        const onHeaders = (h: Headers) => {
          if (import.meta.env.DEV) devInvite = h.get("x-dev-invite-token") ?? undefined;
        };
        const body = { email: s("email"), ...(s("note") ? { note: s("note") } : {}) };
        const res = await apiOptional<ShareListResult>(request, `/lists/${id}/invites`, { method: "POST", body, onHeaders });
        // Older API builds only have POST /members (always sends).
        if (!res) await api(request, `/lists/${id}/members`, { method: "POST", body: { email: s("email") }, onHeaders });
        return { ok: true, intent, devInvite, sent: res ? res.sent : true } satisfies ActionData;
      }
      case "handover": {
        // SPEC 13.6: a claim link for the person who should own the list. Shown once, in the page and the clipboard.
        const handover = await api<HandoverResult>(request, `/lists/${id}/handover`, { method: "POST" });
        return data({ ok: true, intent, handover } satisfies ActionData, { headers: { "Cache-Control": "no-store" } });
      }
      case "revoke-member":
        await api(request, `/lists/${id}/members/${encodeURIComponent(s("member_id"))}`, { method: "DELETE" });
        return { ok: true, intent } satisfies ActionData;
      case "create-key": {
        // From the Share step: a typed name (Other) wins over a chip.
        const res = await api<{ agent: AgentInfo; key: string }>(request, `/lists/${id}/keys`, { method: "POST", body: { agent_name: s("agent_name_other") || s("agent_name") } });
        return data({ ok: true, intent, key: res.key, agent: res.agent } satisfies ActionData, { headers: { "Cache-Control": "no-store" } });
      }
      case "revoke-agent":
        // scope=list removes this list from the agent; otherwise the agent is revoked everywhere.
        await api(request, `/agents/${encodeURIComponent(s("agent_id"))}`, {
          method: "DELETE",
          query: s("scope") === "list" ? { list_id: params.id } : undefined,
        });
        return { ok: true, intent } satisfies ActionData;
      case "delete-list": {
        const list = await api<ListDetail>(request, `/lists/${id}`);
        if (s("confirm") !== "yes") return data({ error: "Confirm to delete.", intent } satisfies ActionData, 400);
        await api(request, `/lists/${id}`, { method: "DELETE" });
        // "Deleted '…'" on /app, once (a cookie, not the URL: titles can be private).
        return redirect("/app", { headers: { "Set-Cookie": flashCookie(request, `Deleted “${list.title}”.`) } });
      }
      default:
        return data({ error: "Unknown action" } satisfies ActionData, 400);
    }
  } catch (err) {
    // The key limit is the server's own sentence ("You have too many active agents; revoke some first").
    if (err instanceof ApiError && err.code === "rate_limited" && intent === "create-key") return data({ error: err.message, intent } satisfies ActionData, 429);
    return data({ ...formError(err), intent } satisfies ActionData, 400);
  }
}

/**
 * One settings section: a collapsed row on a phone (title and what it holds, in a few words), open on desktop. It opens
 * when its own form was just used, when the address points at it, or (desktop) from the start.
 */
function Section({ id, title, desc, open = false, children }: { id: string; title: string; desc?: React.ReactNode; open?: boolean; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(open);
  useEffect(() => {
    if (open) setOpen(true);
  }, [open]);
  useEffect(() => {
    // Desktop: open from the start. Any width: open when the address points into this section.
    if (window.matchMedia("(min-width: 640px)").matches) setOpen(true);
    const openIfTarget = () => {
      const target = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
      if (target && target.closest(`[data-section="${id}"]`)) {
        setOpen(true);
        requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
      }
    };
    openIfTarget();
    window.addEventListener("hashchange", openIfTarget);
    return () => window.removeEventListener("hashchange", openIfTarget);
  }, [id]);
  return (
    <details className="settings-section card group" open={isOpen} onToggle={(e) => setOpen(e.currentTarget.open)} data-section={id}>
      <summary className="flex items-center gap-3 p-5 sm:p-6">
        <span className="min-w-0 flex-1">
          <h2 id={id} className="text-xl font-semibold">
            {title}
          </h2>
          {desc && <span className="mt-0.5 block text-[0.9rem] text-ink-3">{desc}</span>}
        </span>
        <span aria-hidden="true" className="text-ink-3 transition group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="grid gap-4 px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
    </details>
  );
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const currency = useCurrency();
  const { list, role, members, agents, invitedBy } = loaderData;
  const isOwner = role === "owner";
  const { user, origin: rootOrigin, mcpUrl: mcpUrlRoot } = useRootData();
  // What each may see (the loader asks the API: the owner gets every agent on the list, a member their own): theirs first.
  const listAgents = [...agents.filter((a) => a.owner_handle === user?.handle), ...agents.filter((a) => a.owner_handle !== user?.handle)];
  const keyNames = agents.filter((a) => a.kind === "key").map((a) => a.name);
  const agentsTotal = Math.max(list.access?.agents ?? 0, listAgents.length);
  const rootMcp = mcpUrlRoot;
  const result = useActionData<typeof action>() as ActionData | undefined;
  const nav = useNavigation();
  const busy = (intent: string) => nav.state === "submitting" && nav.formData?.get("intent") === intent;
  const err = (intent: string) => (result?.intent === intent && result.error ? <p className="form-error" role="alert">{result.error}</p> : null);
  const openFor = (intents: string[]) => !!result?.intent && intents.includes(result.intent);
  const [searchParams] = useSearchParams();
  const browsingLooks = false;
  const canChangeFormat = list.item_count === 0;
  const currentView = loaderData.looks?.views[loaderData.currentTheme];
  const currentLookName = currentView?.name ?? "";
  // Closed, the section shows the current look itself, small, with its name.
  const lookDesc = currentView ? (
    <span className="mt-1.5 flex items-center gap-3">
      <span className="look-mini" aria-hidden="true">
        <LookFrame view={currentView} sample={loaderData.sample!} origin={rootOrigin} className="h-full" />
      </span>
      <span>{currentLookName}</span>
    </span>
  ) : null;

  return (
    <div className="wrap grid max-w-3xl grid-cols-1 gap-6 py-8">
      <div>
        <Link to={`/l/${list.id}`} className="link text-[0.88rem] text-ink-3">
          ← Back to the list
        </Link>
        <p className="eyebrow mt-4">List settings</p>
        <h1 className="mt-1 text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[2rem]">{list.title}</h1>
        {(visibilityOf(list) === "private" || !isOwner) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[0.88rem] text-ink-3">
            {visibilityOf(list) === "private" && <PrivateBadge bare />}
            {visibilityOf(list) === "private" && !isOwner && <span aria-hidden="true">·</span>}
            {!isOwner && <span>You're a member</span>}
          </p>
        )}
      </div>

      {/* The page's own menu (desktop): sections in the order people use them. */}
      <nav aria-label="Settings sections" className="hidden flex-wrap gap-x-5 gap-y-1 text-[0.9rem] sm:flex">
        {isOwner && <a href="#details-h" className="link">Details</a>}
        <a href="#sharing-h" className="link">Sharing</a>
        <a href="#keys-h" className="link">Agents</a>
        {isOwner && <a href="#theme-h" className="link">Look</a>}
        {isOwner && canChangeFormat && <a href="#format-h" className="link">Format</a>}
        {isOwner && <a href="#danger-h" className="link">Give away or delete</a>}
      </nav>

      {isOwner && (
        <Section id="details-h" title="Details" desc="Title, description, note for agents" open={openFor(["rename", "note"])}>
        <Form method="post" className="grid gap-3">
          <input type="hidden" name="intent" value="rename" />
          <label className="field">
            <span className="label">Title</span>
            <input name="title" required maxLength={140} defaultValue={list.title} className="input" />
          </label>
          <label className="field">
            <span className="label">Description</span>
            <textarea name="description" maxLength={500} defaultValue={list.description} className="textarea" />
          </label>
          <div aria-live="polite">
            {err("rename")}
            {result?.intent === "rename" && result.ok && <p className="form-ok">Saved.</p>}
          </div>
          <button className="btn w-fit" disabled={busy("rename")}>
            {busy("rename") ? "Saving…" : "Save"}
          </button>
        </Form>
          <div className="border-t border-line pt-4">
        <Form method="post" className="grid gap-3">
          <input type="hidden" name="intent" value="note" />
          <label className="field">
            <span className="label">Note for agents</span>
            <textarea name="note" maxLength={600} defaultValue={list.note ?? ""} className="textarea min-h-20" placeholder={moneyPlaceholder("Gifts for Dad, about {50} each, ship to Denver", currency)} />
            <span className="hint">Writers and their agents see it. Never public.</span>
          </label>
          <div aria-live="polite">
            {err("note")}
            {result?.intent === "note" && result.ok && <p className="form-ok">Saved.</p>}
          </div>
          <button className="btn w-fit" disabled={busy("note")}>
            {busy("note") ? "Saving…" : "Save"}
          </button>
        </Form>
          </div>
        </Section>
      )}

      <Section id="sharing-h" title="Sharing" desc={accessLine(list.access) ?? "Who can see it, and people"} open={openFor(["visibility", "outside", "invite", "revoke-member"])}>
        {isOwner && (
          <>
            <VisibilityControl visibility={visibilityOf(list)} />
            {visibilityOf(list) === "public" && (
              <div className="grid gap-2 border-t border-line pt-4">
                <p className="label">Outside suggestions</p>
                <p className="hint">Hidden from visitors until a writer promotes one.</p>
                <OutsideToggle allow={list.allow_outside_suggestions} />
              </div>
            )}
          </>
        )}
        <ul className="grid gap-2">
          {members.map((m) => (
            // The same row as an agent's (AccessRow): people and agents read as two kinds of the same thing.
            <AccessRow
              key={m.id}
              mark={<PersonMark />}
              // The owner sees a person by the email they invited, not only a generated handle (review I1); the API gives
              // invited_email to the owner alone.
              name={m.handle && m.handle === user?.handle ? "You" : (m.invited_email ?? m.handle ?? "Invited")}
              meta={
                <>
                  {/* SPEC 21.5: an agent's invitation goes out at once; the owner sees which agent sent it, and can cancel it. */}
                  {m.role === "owner"
                    ? "Owner"
                    : m.status === "invited"
                      ? invitedBy[m.id]?.kind === "agent"
                        ? `${(invitedBy[m.id] as Extract<ActorRef, { kind: "agent" }>).name} invited them · pending`
                        : "Invite sent"
                      : "Member"}
                  {m.invited_email && m.handle && m.handle !== user?.handle ? ` · ${m.handle}` : ""} · <Time ts={m.created_at} />
                </>
              }
              action={
                isOwner && m.role !== "owner" ? (
                  <RemoveInTwoSteps
                    who={m.handle ?? m.invited_email ?? "this person"}
                    label={m.status === "invited" ? "Cancel invite" : "Remove"}
                    confirm={m.status === "invited" ? "Yes, cancel it" : "Yes, remove"}
                    question={m.status === "invited" ? "Cancel this invite?" : `Remove ${m.handle ?? "this person"}? Their agents lose access too.`}
                    fields={{ intent: "revoke-member", member_id: m.id }}
                  />
                ) : undefined
              }
            />
          ))}
        </ul>
        {err("revoke-member")}
        {isOwner && (
          <Form method="post" className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" key={result?.intent === "invite" && result.ok ? "sent" : "form"}>
            <input type="hidden" name="intent" value="invite" />
            <label className="field">
              <span className="label">Invite by email</span>
              <input name="email" type="email" required autoComplete="off" className="input" />
            </label>
            <button className="btn" disabled={busy("invite")}>
              {busy("invite") ? "Sending…" : "Send invite"}
            </button>
            <div className="sm:col-span-2" aria-live="polite">
              {err("invite")}
              {result?.intent === "invite" && result.ok && (
                <p className="form-ok">
                  {result.sent === false ? "Already invited today. We didn't send another email." : "Invite sent."}
                  {result.devInvite && (
                    <>
                      {" "}Local dev: <Link to={`/invite/${result.devInvite}`} className="link">/invite/{result.devInvite}</Link>
                    </>
                  )}
                </p>
              )}
            </div>
          </Form>
        )}
      </Section>

      <Section id="keys-h" title="Agents" desc={agentsLine(agentsTotal, isOwner ? null : listAgents.length)} open={openFor(["create-key", "revoke-agent"])}>
        {/* Who is on the list first (the step below them); with nobody yet, the step is the obvious next thing. */}
        {listAgents.length > 0 ? (
          <ul className="grid gap-2">
            {listAgents.map((a) => (
              <AgentRow key={a.id} agent={a} own={a.owner_handle === user?.handle} />
            ))}
          </ul>
        ) : (
          <p className="text-ink-2">Pick your agent, then paste the prompt into it.</p>
        )}
        {/* A member sees only their own agents (the API's rule): say the rest exist, once. */}
        {!isOwner && agentsTotal > listAgents.length && (
          <p className="text-[0.85rem] text-ink-3">
            {agentsTotal - listAgents.length === 1 ? "The other agent belongs to someone else on the list." : `The other ${agentsTotal - listAgents.length} belong to other people on the list.`}
          </p>
        )}
        {err("revoke-agent")}
        {result?.intent === "create-key" && result.key && result.agent ? (
          // Without JavaScript the step posts here: the same done state.
          <AgentPromptDone prompt={fillPrompt(AGENT_PROMPT_WITH_KEY, { mcpUrl: rootMcp, listUrl: list.url, key: result.key })} who={result.agent.name} listId={list.id} copied={false} />
        ) : (
          // One element either way, so making the first agent doesn't remount the step (its done state stays put):
          // with agents it is "Add another agent", folded; with none it is open and its summary hidden.
          <AddAgent open={listAgents.length === 0} hideSummary={listAgents.length === 0}>
            <ShareWithAgent listId={list.id} listUrl={list.url} existing={keyNames} />
          </AddAgent>
        )}
        {result?.intent === "create-key" && !result.key && err("create-key")}
        {/* Not in the summary: a link inside the row that opens the section would be a control inside a control. */}
        <Link to={`/connect?list=${list.id}`} className="link -my-2.5 inline-flex min-h-11 w-fit items-center text-[0.85rem] text-ink-3">
          How agents connect
        </Link>
      </Section>

      {isOwner && (
        <>
          <Section id="theme-h" title="Look" desc={lookDesc} open={openFor(["theme"]) || browsingLooks}>
            <ThemePicker
              looks={loaderData.looks!}
              sample={loaderData.sample!}
              current={loaderData.currentTheme}
              currentTemplate={loaderData.currentTemplate}
              currentOccasion={loaderData.currentOccasion}
              format={formatOf(list)}
              listId={list.id}
            />
          </Section>

          {/* The format can only change while the list is empty: hidden afterwards, not explained. */}
          {canChangeFormat && (
            <Section id="format-h" title="Format" desc="Shopping, tasks or research" open={openFor(["format"])}>
            <FormatControl list={list} />
            </Section>
          )}

          {/* The rare, final things together: giving the list away, and deleting it (review I2: hand-over sat with everyday sharing). */}
          <Section id="danger-h" title="Give away or delete" desc="Hand this list to someone, or delete it" open={openFor(["delete-list", "handover"])}>
            <Handover result={result} busy={busy("handover")} />
            <div className="grid gap-2 border-t border-line pt-4">
            <p className="label">Delete this list</p>
            <p className="text-[0.9rem] text-ink-2">Deletes every item, product, price and comment, and disconnects its agents. This can't be undone.</p>
            {/* Two steps, no typing: "Delete list…", then the confirm that names what goes. Works without JavaScript. */}
            <details className="group">
              <summary className="textlink-btn inline-flex min-h-11 w-fit items-center text-[0.95rem] text-danger">Delete list…</summary>
              <Form method="post" className="mt-3 grid gap-2">
                <input type="hidden" name="intent" value="delete-list" />
                <input type="hidden" name="confirm" value="yes" />
                <p className="text-[0.9rem]">
                  Delete “{list.title}” and its {list.item_count} {list.item_count === 1 ? formatInfo(list).item : formatInfo(list).items}?
                </p>
                <button className="btn btn-danger w-fit" disabled={busy("delete-list")}>
                  {busy("delete-list") ? "Deleting…" : "Yes, delete it"}
                </button>
                {err("delete-list")}
              </Form>
            </details>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function OutsideToggle({ allow }: { allow: boolean }) {
  const fetcher = useFetcher<ActionData>();
  const optimistic = fetcher.formData ? fetcher.formData.get("allow") === "true" : allow;
  return (
    <fetcher.Form method="post" className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="intent" value="outside" />
      <input type="hidden" name="allow" value={String(!optimistic)} />
      <button
        role="switch"
        aria-checked={optimistic}
        aria-label="Accept suggestions from outside agents"
        className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition ${optimistic ? "border-ink bg-ink" : "border-line-strong bg-sunk"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-card transition-all ${optimistic ? "left-[1.6rem]" : "left-0.5"}`} />
      </button>
      <span className="font-semibold">{optimistic ? "Accepting outside suggestions" : "Outside suggestions are off"}</span>
      {fetcher.data?.error && <p className="form-error w-full">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}

/** The step's holder in settings › Agents: open while it was opened (or while the list had no agent), whatever the
 *  page's data does after a key is made. */
function AddAgent({ open, hideSummary, children }: { open: boolean; hideSummary: boolean; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(open);
  const [summaryHidden] = useState(hideSummary);
  return (
    <details className="add-agent" open={isOpen} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={`add-link text-[0.95rem] ${summaryHidden ? "hidden" : ""}`}>
        <span aria-hidden="true">+ </span>Add another agent
      </summary>
      <div className={summaryHidden ? "" : "mt-2"}>{children}</div>
    </details>
  );
}

/** "2 agents can work on this list" / "No agent yet": the section's summary, from the list's access counts. */
function agentsLine(n: number, yours: number | null): string {
  const all = n === 0 ? "No agent yet" : n === 1 ? "1 agent can work on this list" : `${n} agents can work on this list`;
  return yours === null || n === 0 ? all : `${all} (${yours} yours)`;
}

/**
 * One agent on the list, shaped like a person's row: its mark, its name, how it is connected and when it last did
 * something, and Remove (two steps). The owner can remove anyone's agent from the list; a member only their own (the
 * API's rule), and the list here is already what each may see.
 */
function AgentRow({ agent: a, own }: { agent: AgentInfo; own: boolean }) {
  const how = a.kind === "oauth" ? "Signed in through its app" : a.kind === "account" ? "Its own account" : "With a key";
  const listOnly = !own || a.list_ids.length > 1;
  return (
    <AccessRow
      mark={<AgentMark name={a.name} />}
      name={a.name}
      meta={
        <>
          {how}
          {!own && <> · added by {a.owner_handle}</>} · {a.last_used_at ? <>active <Time ts={a.last_used_at} /></> : "never used yet"}
        </>
      }
      action={
        <RemoveInTwoSteps
          who={a.name}
          question={!own ? `Remove ${a.name} (added by ${a.owner_handle}) from this list?` : listOnly ? `Remove ${a.name} from this list? It keeps your other lists.` : `Remove ${a.name}? Its key stops working.`}
          fields={{ intent: "revoke-agent", agent_id: a.id, ...(listOnly ? { scope: "list" } : {}) }}
        />
      }
    />
  );
}


type LookGallery = NonNullable<Route.ComponentProps["loaderData"]["looks"]>;

/**
 * The look gallery (owner, 25 Nov 2026: "completely visual"): one row of occasion chips, then every layout as a
 * miniature of this list, all drawn in the chosen occasion. A tap selects; Save commits, so trying looks never changes
 * what everyone else sees. Radios underneath: works without JavaScript, arrow keys move within each group.
 */
function ThemePicker({
  looks,
  sample,
  current,
  currentTemplate,
  currentOccasion,
  format,
  listId,
}: {
  listId: string;
  looks: LookGallery;
  sample: NonNullable<Route.ComponentProps["loaderData"]["sample"]>;
  current: string;
  currentTemplate: string;
  currentOccasion: string | null;
  format: ListFormat;
}) {
  const fi = FORMATS[format];
  const fetcher = useFetcher<ActionData>();
  const { origin } = useRootData();
  const [template, setTemplate] = useState(currentTemplate);
  const [occasion, setOccasion] = useState<string | null>(currentOccasion);
  // The chip answers the tap at once; the seven miniatures re-dress as deferred work, so a tap never waits on them.
  const shown = useDeferredValue(occasion);
  const slugFor = (t: string, o: string | null) => (o ? `${t}--${o}` : t);
  const slug = slugFor(template, occasion);
  const saving = fetcher.state !== "idle";
  const saved = fetcher.state === "idle" && fetcher.data?.ok && slug === current;
  const changed = currentTemplate !== template || currentOccasion !== occasion;

  return (
    <fetcher.Form method="post" className="grid gap-4">
      <input type="hidden" name="intent" value="theme" />
      <fieldset className="grid min-w-0 gap-2">
        <legend className="label mb-1">Occasion</legend>
        {/* One row: it swipes sideways on a phone rather than wrapping into a wall of chips. */}
        <div className="look-occasions">
          {[{ slug: null, name: "None", swatch: null, offered: true }, ...looks.occasions].map((o) => (
            <label key={o.slug ?? "none"} className={`swatch-option flex-none ${occasion === o.slug ? "is-on" : ""}`}>
              <input type="radio" name="occasion" value={o.slug ?? ""} checked={occasion === o.slug} onChange={() => setOccasion(o.slug)} className="swatch-input" />
              <span className="swatch-chip" aria-hidden="true" style={o.swatch ? { background: o.swatch.paper } : undefined}>
                {o.swatch && <span style={{ background: o.swatch.want }} />}
              </span>
              {o.name}
              {!o.offered && <span className="sr-only"> (not offered right now)</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid min-w-0 gap-2">
        <legend className="label mb-1">Layout</legend>
        <div className="look-gallery">
          {looks.templates.map((t) => {
            const view = looks.views[slugFor(t.template, shown)] ?? t;
            const on = template === t.template;
            return (
              <label key={t.slug} className={`look-choice ${on ? "is-on" : ""}`}>
                <input type="radio" name="template" value={t.template} checked={on} onChange={() => setTemplate(t.template)} className="sr-only" />
                <span className="look-choice-frame">
                  <LookFrame view={view} sample={sample} origin={origin} className="h-36 sm:h-40" />
                  {on && (
                    <span className="look-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </span>
                <span className="grid gap-0.5 px-0.5">
                  <span className="look-name">{t.name}</span>
                  <span className="look-note">{t.template === fi.defaultTheme ? `${t.caption} · default` : t.caption}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
        {/* Never disabled before JavaScript runs: without it, this button is how the radios are saved. */}
        <button className="btn btn-want" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {changed ? <span className="text-[0.85rem] text-ink-3">Not saved yet.</span> : null}
        {saved && <span className="text-[0.85rem] text-deal">Saved. Your list now uses this look.</span>}
        {/* Once saved, the next step is the list itself, not a demo of the look (review I5). */}
        {saved ? (
          <Link to={`/l/${listId}`} className="link text-[0.85rem] font-medium text-ink">
            View your list
          </Link>
        ) : (
          <Link to={`/themes/${slug}`} className="link text-[0.85rem] text-ink-2">
            See it full size
          </Link>
        )}
        {fetcher.data?.error && <span className="form-error">{fetcher.data.error}</span>}
      </div>
    </fetcher.Form>
  );
}

/** Who can see the list: two plain choices, the current one marked; going public asks once. Works without JavaScript. */
function VisibilityControl({ visibility }: { visibility: ListVisibility }) {
  const fetcher = useFetcher<ActionData>();
  const pending = fetcher.formData?.get("visibility") as ListVisibility | undefined;
  const v = pending ?? visibility;
  return (
    <fetcher.Form method="post" className="grid gap-3">
      <input type="hidden" name="intent" value="visibility" />
      <div role="group" aria-label="Who can see this list" className="view-switch w-fit">
        {(["private", "public"] as const).map((choice) => (
          <button
            key={choice}
            name="visibility"
            value={choice}
            aria-pressed={v === choice}
            className={`view-tab ${v === choice ? "is-on" : ""}`}
            onClick={(e) => {
              if (choice === v) return e.preventDefault();
              if (choice === "public" && !confirm("Make this list public? Anyone with the link will be able to read it, and search engines can find it.")) e.preventDefault();
            }}
          >
            {choice === "private" ? "Private" : "Public"}
          </button>
        ))}
      </div>
      <p className="text-[0.9rem] text-ink-2">
        {v === "private"
          ? "Only you, people you invite and your agents can see it."
          : "Anyone with the link can read it, and search engines can find it. Only invited people can write."}
      </p>
      {fetcher.data?.error && <p className="form-error">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}

function FormatControl({ list }: { list: Pick<ListSummary, "format" | "item_count"> }) {
  const fetcher = useFetcher<ActionData>();
  const current = formatOf(list);
  if (list.item_count > 0) {
    return (
      <p className="text-[0.9rem] text-ink-2">
        <strong>{FORMATS[current].label}</strong>. Fixed once a list has items.
      </p>
    );
  }
  return (
    <fetcher.Form method="post" className="grid gap-2">
      <input type="hidden" name="intent" value="format" />
      <p className="text-[0.9rem] text-ink-2">You can change the format until the first item is added.</p>
      {(Object.values(FORMATS) as FormatInfo[]).map((f) => (
        <label key={f.format} className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-md border p-3 ${current === f.format ? "border-ink-3 bg-sunk" : "border-line"}`}>
          <input type="radio" name="format" value={f.format} defaultChecked={current === f.format} className="mt-1 accent-[var(--ink)]" />
          <span>
            <span className="block font-semibold">{f.label}</span>
            <span className="block text-[0.82rem] text-ink-2">{f.blurb}</span>
          </span>
        </label>
      ))}
      <button className="btn btn-sm w-fit" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving…" : "Save format"}
      </button>
      {fetcher.data?.error && <p className="form-error">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}

/** "Hand this list to someone": a claim link that makes them the owner; you stay on as a member. */
function Handover({ result, busy }: { result: ActionData | undefined; busy: boolean }) {
  const made = result?.intent === "handover" && result.ok ? result.handover : undefined;
  return (
    <div className="grid gap-2">
      <p className="label">Hand this list to someone</p>
      <p className="hint">They keep it with their own email and become its owner. You stay on the list and your agents keep working.</p>
      {made ? (
        <div className="grid gap-2">
          <code className="input flex items-center break-all font-mono text-[0.8rem]">{made.claim_url}</code>
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton text={made.claim_url} label="Copy link" className="btn btn-sm" />
            <span className="text-[0.85rem] text-ink-3">
              Works until <Time ts={made.expires_at} />. Making a new link stops this one.
            </span>
          </div>
        </div>
      ) : (
        <Form method="post">
          <input type="hidden" name="intent" value="handover" />
          <button className="btn btn-sm" disabled={busy}>
            {busy ? "Making the link…" : "Make a hand-over link"}
          </button>
        </Form>
      )}
      {result?.intent === "handover" && result.error && <p className="form-error">{result.error}</p>}
    </div>
  );
}

