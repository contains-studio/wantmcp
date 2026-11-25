import { data, Form, Link, redirect, useActionData, useFetcher, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/settings";
import { AgentPrompt } from "~/components/AgentPrompt";
import { CopyButton } from "~/components/CopyButton";
import { Time } from "~/components/Time";
import { api, apiOptional, formError, toRouteError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { moneyPlaceholder, useCurrency, useRootData } from "~/lib/hooks";
import { assertSameOrigin } from "~/lib/session.server";
import type { AgentInfo, ListDetail, ListFormat, ListSummary, ListVisibility, Member, ShareListResult } from "~/lib/types";
import { ThemeThumb } from "~/components/ThemeThumb";
import { occasionViews, resolveLook, templateViews } from "~/themes/catalogue.server";
import { sampleList } from "~/themes/sample.server";
import type { ThemeView } from "~/themes/view";
import { useState } from "react";
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
  const [members, agents] = await Promise.all([
    api<Member[]>(request, `/lists/${id}/members`).catch(() => [] as Member[]),
    // The owner sees every agent on the list, a member only their own. Older API servers
    // only have /me/agents, which lists the caller's own.
    apiOptional<AgentInfo[]>(request, `/lists/${id}/agents`).then(
      (all) => all ?? api<AgentInfo[]>(request, "/me/agents", { query: { list_id: params.id } }),
    ),
  ]);
  const { items: _items, ...summary } = list;
  // The owner's look picker: every template, and every occasion on the template being looked at
  // (?template= while choosing, else the list's own). Views are custom properties only.
  const owner = list.my_role === "owner";
  const current = resolveLook(summary.theme ?? formatInfo(summary).defaultTheme, formatOf(summary));
  const browsing = new URL(request.url).searchParams.get("template") ?? current.template.slug;
  const looks = owner
    ? {
        templates: templateViews(),
        // The list's own occasion stays choosable even when it is not offered right now.
        occasions: [
          ...occasionViews(resolveLook(browsing, formatOf(summary)).template.slug),
          ...(current.occasion && current.occasion.offered === false
            ? occasionViews(resolveLook(browsing, formatOf(summary)).template.slug, [current.occasion.slug]).map((v) => ({ ...v, caption: "Not offered right now" }))
            : []),
        ],
        browsing: resolveLook(browsing, formatOf(summary)).template.slug,
      }
    : null;
  const sample = owner ? sampleList(Date.now(), formatOf(summary)) : null;
  return data(
    {
      list: summary,
      role: list.my_role,
      members,
      agents,
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
  return `${parts.join(" · ")} can write this list.`;
}

type ActionData = { ok?: boolean; error?: string; intent?: string; key?: string; agent?: AgentInfo; devInvite?: string; sent?: boolean };

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
        const picked = resolveLook(s("theme"), format).slug;
        // The format's own default is stored as "no theme" so it follows the format; anything
        // else is stored explicitly.
        await api(request, `/lists/${id}`, { method: "PATCH", body: { theme: picked === resolveLook(formatInfo(current).defaultTheme, format).slug ? null : picked } });
        return { ok: true, intent } satisfies ActionData;
      }
      case "visibility":
        await api(request, `/lists/${id}`, { method: "PATCH", body: { visibility: s("visibility") === "private" ? "private" : "public" } });
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
      case "revoke-member":
        await api(request, `/lists/${id}/members/${encodeURIComponent(s("member_id"))}`, { method: "DELETE" });
        return { ok: true, intent } satisfies ActionData;
      case "create-key": {
        const res = await api<{ agent: AgentInfo; key: string }>(request, `/lists/${id}/keys`, { method: "POST", body: { agent_name: s("agent_name") } });
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
        if (s("confirm") !== list.title) return data({ error: "Type the list title exactly to confirm.", intent } satisfies ActionData, 400);
        await api(request, `/lists/${id}`, { method: "DELETE" });
        return redirect("/app");
      }
      default:
        return data({ error: "Unknown action" } satisfies ActionData, 400);
    }
  } catch (err) {
    return data({ ...formError(err), intent } satisfies ActionData, 400);
  }
}

function Section({ id, title, desc, children }: { id: string; title: string; desc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="card grid gap-4 p-5 sm:p-6">
      <div>
        <h2 id={id} className="text-xl font-semibold">{title}</h2>
        {desc && <p className="mt-1 text-[0.9rem] text-ink-3">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const currency = useCurrency();
  const { list, role, members, agents } = loaderData;
  const isOwner = role === "owner";
  const { user } = useRootData();
  const mine = agents.filter((a) => a.owner_handle === user?.handle);
  const others = agents.filter((a) => a.owner_handle !== user?.handle);
  const result = useActionData<typeof action>() as ActionData | undefined;
  const nav = useNavigation();
  const busy = (intent: string) => nav.state === "submitting" && nav.formData?.get("intent") === intent;
  const err = (intent: string) => (result?.intent === intent && result.error ? <p className="form-error" role="alert">{result.error}</p> : null);

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

      <Section
        id="keys-h"
        title="Agents and write keys"
        desc={
          <>
            Signed-in agents appear here. Command-line tools use a write key. <Link to={`/connect?list=${list.id}`} className="link">Setup guides</Link>
          </>
        }
      >
        {result?.intent === "create-key" && result.key ? (
          <NewKey keyValue={result.key} agentName={result.agent?.name ?? "agent"} listUrl={list.url} />
        ) : (
          <Form method="post" className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="intent" value="create-key" />
            <label className="field">
              <span className="label">Agent name</span>
              <input name="agent_name" required maxLength={60} placeholder="e.g. Codex on my laptop" className="input" />
            </label>
            <button className="btn" disabled={busy("create-key")}>
              {busy("create-key") ? "Creating…" : "Create write key"}
            </button>
            <div className="sm:col-span-2">{err("create-key")}</div>
          </Form>
        )}

        <h3 className="eyebrow mt-2">Your connected clients</h3>
        {mine.filter((a) => a.kind === "oauth").length === 0 ? (
          <p className="text-[0.9rem] text-ink-3">
            None yet. When you add the MCP server to ChatGPT, Claude or another app and sign in, it appears here.
          </p>
        ) : (
          <ul className="grid gap-2">
            {mine
              .filter((a) => a.kind === "oauth")
              .map((a) => (
                <AgentRow key={a.id} agent={a} own />
              ))}
          </ul>
        )}
        <h3 className="eyebrow mt-2">Your write keys</h3>
        {mine.filter((a) => a.kind === "key").length === 0 ? (
          <p className="text-[0.9rem] text-ink-3">No write keys for this list.</p>
        ) : (
          <ul className="grid gap-2">
            {mine
              .filter((a) => a.kind === "key")
              .map((a) => (
                <AgentRow key={a.id} agent={a} own />
              ))}
          </ul>
        )}
        {isOwner && others.length > 0 && (
          <>
            <h3 className="eyebrow mt-2">Members' agents</h3>
            <ul className="grid gap-2">
              {others.map((a) => (
                <AgentRow key={a.id} agent={a} own={false} />
              ))}
            </ul>
          </>
        )}
        {err("revoke-agent")}
      </Section>

      <Section id="members-h" title="People" desc={accessLine(list.access) ?? (isOwner ? "They can add, tick off and connect their own agents." : undefined)}>
        <ul className="grid gap-2">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.handle ?? m.invited_email ?? "Invited"}</p>
                <p className="text-[0.78rem] text-ink-3">
                  {m.role === "owner" ? "Owner" : m.status === "invited" ? "Invite sent" : "Member"} · <Time ts={m.created_at} />
                </p>
              </div>
              {isOwner && m.role !== "owner" && (
                <Form method="post" onSubmit={(e) => !confirm(`Remove ${m.handle ?? m.invited_email ?? "this person"}? Their agents lose access too.`) && e.preventDefault()}>
                  <input type="hidden" name="intent" value="revoke-member" />
                  <input type="hidden" name="member_id" value={m.id} />
                  <button className="btn btn-danger btn-xs">{m.status === "invited" ? "Cancel invite" : "Remove"}</button>
                </Form>
              )}
            </li>
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

      {isOwner && (
        <>
          <Section
            id="theme-h"
            title="Look"
            desc={
              <>
                <Link to="/themes" className="link">All layouts and occasions</Link>
              </>
            }
          >
            <ThemePicker
              looks={loaderData.looks!}
              sample={loaderData.sample!}
              current={loaderData.currentTheme}
              currentTemplate={loaderData.currentTemplate}
              currentOccasion={loaderData.currentOccasion}
              format={formatOf(list)}
            />
          </Section>

          <Section id="visibility-h" title="Who can see this list">
            <VisibilityControl visibility={visibilityOf(list)} />
          </Section>

          <Section id="format-h" title="Format">
            <FormatControl list={list} />
          </Section>

          {visibilityOf(list) === "public" ? (
            <Section id="outside-h" title="Outside suggestions" desc={`Hidden from visitors until a writer promotes one.`}>
              <OutsideToggle allow={list.allow_outside_suggestions} />
            </Section>
          ) : null}

          <Section id="note-h" title="Note for agents">
            <Form method="post" className="grid gap-3">
              <input type="hidden" name="intent" value="note" />
              <label className="field">
                <span className="label">What's true of this list only</span>
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
          </Section>

          <Section id="rename-h" title="Title and description">
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
          </Section>

          <section aria-labelledby="danger-h" className="grid gap-3 rounded-[1.1rem] border-2 border-dashed border-danger/40 p-5 sm:p-6">
            <h2 id="danger-h" className="text-xl font-semibold text-danger">Delete this list</h2>
            <p className="text-[0.9rem] text-ink-2">Deletes every item, product, price and comment, and disconnects its agents. This can't be undone.</p>
            <Form method="post" className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="intent" value="delete-list" />
              <label className="field">
                <span className="label">Type the title to confirm: <span className="font-mono font-normal">{list.title}</span></span>
                <input name="confirm" required autoComplete="off" className="input" />
              </label>
              <button className="btn btn-danger" disabled={busy("delete-list")}>
                Delete list
              </button>
              <div className="sm:col-span-2">{err("delete-list")}</div>
            </Form>
          </section>
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

function AgentRow({ agent: a, own }: { agent: AgentInfo; own: boolean }) {
  const fetcher = useFetcher<ActionData>();
  if (fetcher.state === "idle" && fetcher.data?.ok) return null;
  // Your own single-list agent is revoked outright. Otherwise only this list is removed from it.
  const listOnly = !own || a.list_ids.length > 1;
  const action = listOnly ? "Remove from list" : a.kind === "key" ? "Revoke" : "Disconnect";
  const question = !own
    ? `Remove ${a.name} (connected by ${a.owner_handle}) from this list?`
    : listOnly
      ? `Remove ${a.name} from this list? It keeps access to your other lists.`
      : `${a.kind === "key" ? "Revoke the key for" : "Disconnect"} ${a.name}?`;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{a.name}</p>
        <p className="text-[0.78rem] text-ink-3">
          {a.kind === "oauth" ? "Signed in" : <>Key <code>{a.key_prefix}…</code></>}
          {!own && <> · connected by {a.owner_handle}</>} · added <Time ts={a.created_at} /> ·{" "}
          {a.last_used_at ? <>last used <Time ts={a.last_used_at} /></> : "never used"}
          {own && a.list_ids.length > 1 && ` · can write ${a.list_ids.length} lists`}
        </p>
      </div>
      <fetcher.Form method="post" onSubmit={(e) => !confirm(question) && e.preventDefault()}>
        <input type="hidden" name="intent" value="revoke-agent" />
        <input type="hidden" name="agent_id" value={a.id} />
        {listOnly && <input type="hidden" name="scope" value="list" />}
        <button className="btn btn-danger btn-xs" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Removing…" : action}
          <span className="sr-only"> {a.name}</span>
        </button>
      </fetcher.Form>
      {fetcher.data?.error && (
        <p className="form-error w-full" role="alert">
          {fetcher.data.error}
        </p>
      )}
    </li>
  );
}

function NewKey({ keyValue, agentName, listUrl }: { keyValue: string; agentName: string; listUrl: string }) {
  const { mcpUrl } = useRootData();
  const slug = "wantmcp";
  const snippets: Array<[string, string]> = [
    ["Claude Code", `claude mcp add --transport http ${slug} ${mcpUrl} \\\n  --header "Authorization: Bearer ${keyValue}"`],
    [
      "Codex",
      `# ~/.codex/config.toml\n[mcp_servers.${slug}]\nurl = "${mcpUrl}"\nbearer_token_env_var = "WANTMCP_TOKEN"\n\n# then, in your shell profile:\nexport WANTMCP_TOKEN="${keyValue}"`,
    ],
    [
      "Cursor",
      `// ~/.cursor/mcp.json\n{\n  "mcpServers": {\n    "${slug}": {\n      "url": "${mcpUrl}",\n      "headers": { "Authorization": "Bearer ${keyValue}" }\n    }\n  }\n}`,
    ],
    ["Grok CLI", `grok mcp add --transport http ${slug} ${mcpUrl} \\\n  --header "Authorization: Bearer ${keyValue}"`],
    [
      "OpenClaw",
      `{\n  "mcp": {\n    "servers": {\n      "${slug}": {\n        "url": "${mcpUrl}",\n        "transport": "streamable-http",\n        "headers": { "Authorization": "Bearer ${keyValue}" }\n      }\n    }\n  }\n}`,
    ],
    ["Any MCP client", `URL:    ${mcpUrl}\nHeader: Authorization: Bearer ${keyValue}`],
  ];
  return (
    <div className="grid gap-4 rounded-[14px] bg-sunk p-4" role="status">
      <div>
        <p className="font-display text-lg font-semibold">Write key for “{agentName}”</p>
        <p className="text-[0.88rem] text-ink-2">
          Copy it now. It's shown once and we only keep a hash. Anyone with this key can post to this list as {agentName}.
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-2 rounded-md border border-line-strong bg-card p-3 sm:flex-row sm:items-center sm:p-2 sm:pl-3">
        <code className="min-w-0 flex-1 break-all text-[0.9rem] font-semibold" aria-label="Write key">
          {keyValue}
        </code>
        <CopyButton text={keyValue} label="Copy key" className="btn btn-sm" />
      </div>
      <div className="grid gap-2 rounded-md border border-line bg-card p-3">
        <AgentPrompt
          mcpUrl={mcpUrl}
          listUrl={listUrl}
          keyValue={keyValue}
          title="Or hand your agent this prompt: it sets itself up with this key and starts on the list"
        />
      </div>
      <div className="grid gap-2">
        <p className="label">Or set it up yourself</p>
        {snippets.map(([name, code], i) => (
          <details key={name} open={i === 0} className="rounded-md border border-line bg-card">
            <summary className="flex items-center justify-between px-3 py-2 font-semibold">
              {name} <span aria-hidden="true" className="text-ink-3">›</span>
            </summary>
            <div className="grid gap-2 px-3 pb-3">
              <pre className="codeblock">{code}</pre>
              <CopyButton text={code} label={`Copy ${name} setup`} />
            </div>
          </details>
        ))}
      </div>
      <Link to="." className="btn btn-ghost btn-sm w-fit" replace>
        Done, I've saved it
      </Link>
    </div>
  );
}

function ThemePicker({
  looks,
  sample,
  current,
  currentTemplate,
  currentOccasion,
  format,
}: {
  looks: { templates: ThemeView[]; occasions: ThemeView[]; browsing: string };
  sample: NonNullable<Route.ComponentProps["loaderData"]["sample"]>;
  current: string;
  currentTemplate: string;
  currentOccasion: string | null;
  format: ListFormat;
}) {
  const fi = FORMATS[format];
  const fetcher = useFetcher<ActionData>();
  const { origin } = useRootData();
  const [, setSearchParams] = useSearchParams();
  const [occasion, setOccasion] = useState<string | null>(currentOccasion);
  const template = looks.browsing;
  // The Sheet table compares prices: shopping lists only.
  const templates = looks.templates.filter((t) => format === "shopping" || t.layout !== "sheet");
  const slug = occasion ? `${template}--${occasion}` : template;
  const view =
    (occasion ? looks.occasions.find((o) => o.occasion === occasion) : templates.find((t) => t.template === template)) ?? templates[0];
  const defaultTemplate = fi.defaultTheme;
  const saving = fetcher.state !== "idle";
  const saved = fetcher.state === "idle" && fetcher.data?.ok && slug === current;
  const pickTemplate = (t: string) =>
    setSearchParams((p) => {
      p.set("template", t);
      return p;
    }, { replace: true, preventScrollReset: true });

  return (
    <fetcher.Form method="post" className="grid gap-5">
      <input type="hidden" name="intent" value="theme" />
      <input type="hidden" name="theme" value={slug} />
      <fieldset className="grid gap-2">
        <legend className="label mb-1">Layout</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((t) => (
            <LookOption
              key={t.slug}
              name="template-choice"
              checked={template === t.template}
              onChange={() => pickTemplate(t.template)}
              view={t}
              sample={sample}
              origin={origin}
              note={t.template === defaultTemplate ? "Default" : t.caption}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="label mb-1">Occasion</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <label className={`grid cursor-pointer place-items-center gap-2 rounded-md border-2 p-3 text-center ${occasion === null ? "border-ink-3" : "border-line"}`}>
            <span className="grid h-20 w-full place-items-center rounded-lg bg-sunk text-[0.85rem] text-ink-3" aria-hidden="true">
              No occasion
            </span>
            <span className="flex items-center gap-2">
              <input type="radio" name="occasion-choice" checked={occasion === null} onChange={() => setOccasion(null)} className="h-5 w-5 accent-[var(--ink)]" />
              <span className="font-semibold">None</span>
            </span>
          </label>
          {looks.occasions.map((o) => (
            <LookOption
              key={o.slug}
              name="occasion-choice"
              checked={occasion === o.occasion}
              onChange={() => setOccasion(o.occasion)}
              view={o}
              sample={sample}
              origin={origin}
              label={o.name.split(" · ").pop()!}
              note={o.caption}
              small
            />
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <p className="label" id="theme-preview-label">
          Preview: {view.name}
        </p>
        {/* A picture of the list in this look, scaled to the frame: nothing inside it scrolls. */}
        <div className="overflow-hidden rounded-[14px] border border-line">
          <ThemeThumb theme={view} sample={sample} origin={origin} items={3} className="thumb-half h-[18rem] sm:h-[24rem]" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <button className="btn btn-want" disabled={saving || slug === current}>
          {saving ? "Saving…" : "Save"}
        </button>
        {currentTemplate !== template || currentOccasion !== occasion ? (
          <span className="text-[0.85rem] text-ink-3">Not saved yet.</span>
        ) : null}
        {saved && <span className="text-[0.85rem] text-deal">Saved. Your list now uses this look.</span>}
        {fetcher.data?.error && <span className="form-error">{fetcher.data.error}</span>}
      </div>
    </fetcher.Form>
  );
}

function LookOption({
  name,
  checked,
  onChange,
  view,
  sample,
  origin,
  note,
  label,
  small = false,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  view: ThemeView;
  sample: NonNullable<Route.ComponentProps["loaderData"]["sample"]>;
  origin: string;
  note: string;
  label?: string;
  small?: boolean;
}) {
  // The label holds only the radio and its name, so the radio's accessible name is "Sheet Price table".
  // The miniature beside it is decorative; clicking it picks the same option.
  return (
    <div className={`grid overflow-hidden rounded-md border-2 ${checked ? "border-ink-3" : "border-line"}`}>
      <div onClick={onChange} className="cursor-pointer">
        <ThemeThumb theme={view} sample={sample} origin={origin} className={`${small ? "h-20" : "h-28"} border-b border-line`} />
      </div>
      <label className="flex cursor-pointer items-center gap-2 p-2.5">
        <input type="radio" name={name} checked={checked} onChange={onChange} className="h-5 w-5 shrink-0 accent-[var(--ink)]" />
        <span className="min-w-0">
          <span className="block text-[0.92rem] font-semibold leading-tight">{label ?? view.name}</span>
          {note && <span className="block text-[0.75rem] text-ink-3">{note}</span>}
        </span>
      </label>
    </div>
  );
}

function VisibilityControl({ visibility }: { visibility: ListVisibility }) {
  const fetcher = useFetcher<ActionData>();
  const pending = fetcher.formData?.get("visibility") as ListVisibility | undefined;
  const v = pending ?? visibility;
  const next = v === "public" ? "private" : "public";
  return (
    <fetcher.Form method="post" className="grid gap-3">
      <input type="hidden" name="intent" value="visibility" />
      <input type="hidden" name="visibility" value={next} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          role="switch"
          aria-checked={v === "private"}
          aria-label="Private list"
          className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition ${v === "private" ? "border-ink bg-ink" : "border-line-strong bg-sunk"}`}
          onClick={(e) => {
            if (next === "public" && !confirm("Make this list public? Anyone with the link will be able to read it, and search engines can find it.")) e.preventDefault();
          }}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-card transition-all ${v === "private" ? "left-[1.6rem]" : "left-0.5"}`} />
        </button>
        <span className="font-semibold">{v === "private" ? "Private" : "Public"}</span>
      </div>
      <p className="text-[0.9rem] text-ink-2">
        {v === "private"
          ? "Only you, people you invite and your agents. Not in search or the public feed."
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
