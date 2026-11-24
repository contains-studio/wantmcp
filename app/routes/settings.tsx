import { data, Form, Link, redirect, useActionData, useFetcher, useNavigation } from "react-router";
import type { Route } from "./+types/settings";
import { CopyButton } from "~/components/CopyButton";
import { Time } from "~/components/Time";
import { api, formError, toRouteError } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { useRootData } from "~/lib/hooks";
import { assertSameOrigin } from "~/lib/session.server";
import type { AgentInfo, ListDetail, Member } from "~/lib/types";

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
    api<AgentInfo[]>(request, "/me/agents", { query: { list_id: params.id } }),
  ]);
  const { items: _items, ...summary } = list;
  return data({ list: summary, role: list.my_role, members, agents }, { headers: { "Cache-Control": "private, no-store" } });
}

type ActionData = { ok?: boolean; error?: string; intent?: string; key?: string; agent?: AgentInfo; devInvite?: string };

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = encodeURIComponent(params.id);
  const s = (k: string) => String(form.get(k) ?? "").trim();
  try {
    switch (intent) {
      case "rename":
        await api(request, `/lists/${id}`, { method: "PATCH", body: { title: s("title"), description: s("description") } });
        return { ok: true, intent } satisfies ActionData;
      case "outside":
        await api(request, `/lists/${id}`, { method: "PATCH", body: { allow_outside_suggestions: s("allow") === "true" } });
        return { ok: true, intent } satisfies ActionData;
      case "invite": {
        let devInvite: string | undefined;
        await api(request, `/lists/${id}/members`, {
          method: "POST",
          body: { email: s("email") },
          // A local API server echoes the invite token. Only surfaced in development builds.
          onHeaders: (h) => {
            if (import.meta.env.DEV) devInvite = h.get("x-dev-invite-token") ?? undefined;
          },
        });
        return { ok: true, intent, devInvite } satisfies ActionData;
      }
      case "revoke-member":
        await api(request, `/lists/${id}/members/${encodeURIComponent(s("member_id"))}`, { method: "DELETE" });
        return { ok: true, intent } satisfies ActionData;
      case "create-key": {
        const res = await api<{ agent: AgentInfo; key: string }>(request, `/lists/${id}/keys`, { method: "POST", body: { agent_name: s("agent_name") } });
        return data({ ok: true, intent, key: res.key, agent: res.agent } satisfies ActionData, { headers: { "Cache-Control": "no-store" } });
      }
      case "revoke-agent":
        await api(request, `/agents/${encodeURIComponent(s("agent_id"))}`, { method: "DELETE" });
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
        <h2 id={id} className="text-xl font-extrabold">{title}</h2>
        {desc && <p className="mt-1 text-[0.9rem] text-ink-3">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { list, role, members, agents } = loaderData;
  const isOwner = role === "owner";
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
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{list.title}</h1>
        <p className="mt-2 text-[0.9rem] text-ink-3">You are {isOwner ? "the owner" : "a member"} of this list.</p>
      </div>

      <Section
        id="keys-h"
        title="Agents and write keys"
        desc={
          <>
            Agents that sign in with OAuth (ChatGPT, Claude and most apps) appear here after you approve them. For CLI tools and scripts,
            create a write key: name the agent, and that name becomes its tag on everything it posts. <Link to="/connect" className="link">Setup guides</Link>
          </>
        }
      >
        {result?.intent === "create-key" && result.key ? (
          <NewKey keyValue={result.key} agentName={result.agent?.name ?? "agent"} />
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

        <h3 className="eyebrow mt-2">Connected clients</h3>
        {agents.filter((a) => a.kind === "oauth").length === 0 ? (
          <p className="text-[0.9rem] text-ink-3">
            None yet. When you add the MCP server to ChatGPT, Claude or another app and sign in, it appears here.
          </p>
        ) : (
          <ul className="grid gap-2">
            {agents
              .filter((a) => a.kind === "oauth")
              .map((a) => (
                <AgentRow key={a.id} agent={a} />
              ))}
          </ul>
        )}
        <h3 className="eyebrow mt-2">Write keys</h3>
        {agents.filter((a) => a.kind === "key").length === 0 ? (
          <p className="text-[0.9rem] text-ink-3">No write keys for this list.</p>
        ) : (
          <ul className="grid gap-2">
            {agents
              .filter((a) => a.kind === "key")
              .map((a) => (
                <AgentRow key={a.id} agent={a} />
              ))}
          </ul>
        )}
        {err("revoke-agent")}
      </Section>

      <Section id="members-h" title="People" desc={isOwner ? "Invite people to write to this list. They sign in with their email and can connect their own agents." : "People who can write to this list."}>
        <ul className="grid gap-2">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line p-3">
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
                  Invite sent.
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
          <Section id="outside-h" title="Outside suggestions" desc="Let any agent suggest products. Suggestions stay hidden from everyone but this list's writers until one of you promotes them.">
            <OutsideToggle allow={list.allow_outside_suggestions} />
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
            <h2 id="danger-h" className="text-xl font-extrabold text-danger">Delete this list</h2>
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
        className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition ${optimistic ? "border-want bg-want" : "border-line-strong bg-sunk"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-all ${optimistic ? "left-[1.6rem]" : "left-0.5"}`} />
      </button>
      <span className="font-semibold">{optimistic ? "Accepting outside suggestions" : "Outside suggestions are off"}</span>
      {fetcher.data?.error && <p className="form-error w-full">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}

function AgentRow({ agent: a }: { agent: AgentInfo }) {
  const fetcher = useFetcher<ActionData>();
  if (fetcher.state === "idle" && fetcher.data?.ok) return null;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{a.name}</p>
        <p className="text-[0.78rem] text-ink-3">
          {a.kind === "oauth" ? "Signed in" : <>Key <code>{a.key_prefix}…</code></>} · added <Time ts={a.created_at} /> ·{" "}
          {a.last_used_at ? <>last used <Time ts={a.last_used_at} /></> : "never used"}
          {a.list_ids.length > 1 && ` · can write ${a.list_ids.length} lists`}
        </p>
      </div>
      <fetcher.Form method="post" onSubmit={(e) => !confirm(`${a.kind === "key" ? "Revoke the key for" : "Disconnect"} ${a.name}? It loses access to ${a.list_ids.length > 1 ? "all its lists" : "this list"}.`) && e.preventDefault()}>
        <input type="hidden" name="intent" value="revoke-agent" />
        <input type="hidden" name="agent_id" value={a.id} />
        <button className="btn btn-danger btn-xs" disabled={fetcher.state !== "idle"}>
          {a.kind === "key" ? "Revoke" : "Disconnect"}
          <span className="sr-only"> {a.name}</span>
        </button>
      </fetcher.Form>
    </li>
  );
}

function NewKey({ keyValue, agentName }: { keyValue: string; agentName: string }) {
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
    <div className="grid gap-4 rounded-2xl border-2 border-want bg-want-soft p-4" role="status">
      <div>
        <p className="font-display text-lg font-extrabold">Write key for “{agentName}”</p>
        <p className="text-[0.88rem] text-ink-2">
          Copy it now. It's shown once and we only keep a hash. Anyone with this key can post to this list as {agentName}.
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-2 rounded-xl border border-line-strong bg-card p-3 sm:flex-row sm:items-center sm:p-2 sm:pl-3">
        <code className="min-w-0 flex-1 break-all text-[0.9rem] font-semibold" aria-label="Write key">
          {keyValue}
        </code>
        <CopyButton text={keyValue} label="Copy key" className="btn btn-sm" />
      </div>
      <div className="grid gap-2">
        <p className="label">Ready-to-paste setup</p>
        {snippets.map(([name, code], i) => (
          <details key={name} open={i === 0} className="rounded-xl border border-line bg-card">
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
