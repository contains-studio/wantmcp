/**
 * /connect/key?app=<name>[&list=<id>] (SPEC 24.2): one focused step an app can open, so its person can make a key
 * for one list and paste it back into the app. Signed out, sign-in comes back here. `app` is only a label.
 *
 * The key is never sent anywhere by this page: no return address, no redirect carrying it. It is shown once, in the
 * page and (with JavaScript) the clipboard. An app that wants to be handed access automatically uses sign-in.
 */
import { useState } from "react";
import { data, Form, Link, redirect, useActionData, useFetcher, useNavigation, type FetcherWithComponents } from "react-router";
import type { Route } from "./+types/connect-key";
import { AppKeyDone, useCopyOnPress } from "~/components/ShareWithAgent";
import { AGENT_PROMPT_WITH_KEY, fillPrompt } from "~/lib/agent-prompt";
import { api, formError } from "~/lib/api.server";
import { getUser } from "~/lib/auth.server";
import { agentMark, clientKind, markStyle } from "~/lib/brands";
import { appLabel, connectKeyPath, listParam } from "~/lib/connect-key";
import { useRootData } from "~/lib/hooks";
import { assertSameOrigin, clearSessionCookie, getSessionToken } from "~/lib/session.server";
import type { AgentInfo, ListSummary, Page } from "~/lib/types";

// same-origin, not no-referrer: no-referrer makes a form post send `Origin: null`, which React Router refuses.
const HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "same-origin", "X-Robots-Tag": "noindex" };

/** The page and every answer to its form carry these (React Router sends a route's own headers from here only). */
export function headers() {
  return HEADERS;
}

export function meta({ loaderData: d }: Route.MetaArgs) {
  const app = d && "app" in d ? d.app : null;
  return [{ title: `Connect ${app ?? "an app"} · The Want MCP` }, { name: "robots", content: "noindex" }, { name: "referrer", content: "same-origin" }];
}

type Row = Pick<ListSummary, "id" | "title" | "url">;

async function myLists(request: Request): Promise<Row[]> {
  const res = await api<ListSummary[] | Page<ListSummary>>(request, "/me/lists");
  const rows = Array.isArray(res) ? res : (res?.data ?? []);
  return rows.map((l) => ({ id: l.id, title: l.title, url: l.url }));
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const app = appLabel(url.searchParams.get("app"));
  const asked = listParam(url.searchParams.get("list"));
  const user = await getUser(request);
  if (!user) {
    // Back here after sign-in, rebuilt from the cleaned values only.
    const headers = getSessionToken(request) ? { "set-cookie": clearSessionCookie(request) } : undefined;
    throw redirect(`/login?next=${encodeURIComponent(connectKeyPath(app, asked))}`, { headers });
  }
  const lists = await myLists(request);
  // A list id that isn't one of theirs is ignored: the picker shows instead.
  const list = asked ? (lists.find((l) => l.id === asked) ?? null) : null;
  return data({ app, list, lists, asked: !!asked && !list }, { headers: HEADERS });
}

type ActionResult = { intent: "create-key"; key?: string; agent?: { id: string; name: string }; list?: Row; error?: string } | { intent: "new-list"; error?: string };

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const url = new URL(request.url);
  const app = appLabel(url.searchParams.get("app"));
  const form = await request.formData();
  const s = (k: string) => String(form.get(k) ?? "").trim();
  if (s("intent") === "new-list") {
    const title = s("title");
    if (!title) return data({ intent: "new-list", error: "Give the list a title" } satisfies ActionResult, { status: 400, headers: HEADERS });
    try {
      const made = await api<ListSummary>(request, "/lists", { method: "POST", body: { title, format: "shopping", visibility: "private" } });
      // Back to this step with the new list picked: the address carries the app's label and the list, never a key.
      return redirect(connectKeyPath(app, made.id), { headers: HEADERS });
    } catch (err) {
      return data({ intent: "new-list", ...formError(err) } satisfies ActionResult, { status: 400, headers: HEADERS });
    }
  }
  // The name is the page's label; for "this app", the one the person typed.
  const name = app ?? appLabel(s("app_name"));
  if (!name) return data({ intent: "create-key", error: "Give the app a name: letters, digits, spaces, dots, dashes" } satisfies ActionResult, { status: 400, headers: HEADERS });
  const listId = listParam(s("list_id"));
  const list = listId ? (await myLists(request)).find((l) => l.id === listId) : undefined;
  if (!list) return data({ intent: "create-key", error: "Pick a list" } satisfies ActionResult, { status: 400, headers: HEADERS });
  try {
    const res = await api<{ agent: AgentInfo; key: string }>(request, `/lists/${list.id}/keys`, { method: "POST", body: { agent_name: name } });
    return data({ intent: "create-key", key: res.key, agent: { id: res.agent.id, name: res.agent.name }, list } satisfies ActionResult, { headers: HEADERS });
  } catch (err) {
    return data({ intent: "create-key", ...formError(err) } satisfies ActionResult, { status: 400, headers: HEADERS });
  }
}

export default function ConnectKey({ loaderData }: Route.ComponentProps) {
  const { app, list, lists, asked } = loaderData;
  const who = app ?? "this app";
  const mark = app ? agentMark(app) : null;
  return (
    <div className="bg-sunk">
      <div className="mx-auto grid w-full max-w-[36rem] gap-4 px-4 pt-8 pb-16 sm:pt-12">
        <section aria-labelledby="ck-h" className="card grid gap-4 p-5 sm:p-7">
          <header className="grid gap-2">
            <h1 id="ck-h" className="flex items-center gap-2.5 text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] sm:text-[1.9rem]">
              {mark && (
                <span className="ck-mark" aria-hidden="true">
                  <img src={mark.light} alt="" width={28} height={28} className={mark.dark ? "brand-logo-light" : ""} style={markStyle(mark)} />
                  {mark.dark && <img src={mark.dark} alt="" width={28} height={28} className="brand-logo-dark" style={markStyle(mark)} />}
                </span>
              )}
              <span className="min-w-0 break-words">Connect {who} to a list</span>
            </h1>
            <p className="text-[0.95rem] text-ink-2">
              You'll get a key that lets {who} add to one list. Paste it into {who}; nothing is sent from here.
            </p>
          </header>
          {lists.length === 0 ? <NewList /> : <MakeKey app={app} who={who} list={list} lists={lists} asked={asked} />}
        </section>
        <p className="text-center text-[0.85rem] text-ink-3">
          <Link to="/connect" className="link">
            Other ways to connect
          </Link>
        </p>
      </div>
    </div>
  );
}

/** No lists yet: start one here (private), and come back to this step with it picked. */
function NewList() {
  const nav = useNavigation();
  const busy = nav.state !== "idle" && nav.formData?.get("intent") === "new-list";
  const result = useActionData<ActionResult>();
  const error = result?.intent === "new-list" ? result.error : undefined;
  return (
    <Form method="post" className="grid gap-3">
      <input type="hidden" name="intent" value="new-list" />
      <p className="text-[0.95rem] text-ink-2">You don't have a list yet. Start one here: it is private until you share it.</p>
      <label className="field">
        <span className="label">List name</span>
        <input name="title" className="input" required maxLength={120} defaultValue="Wants" autoComplete="off" />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-want w-full sm:w-fit" disabled={busy}>
        {busy ? "Starting…" : "Start a new list"}
      </button>
    </Form>
  );
}

function MakeKey({ app, who, list, lists, asked }: { app: string | null; who: string; list: Row | null; lists: Row[]; asked: boolean }) {
  const { mcpUrl } = useRootData();
  const fetcher = useFetcher<ActionResult>({ key: "connect-key" });
  // Without JavaScript the form posts as a page: its answer is the page's action data.
  const posted = useActionData<ActionResult>();
  const answer = fetcher.data ?? posted;
  const result = answer?.intent === "create-key" ? answer : undefined;
  const [picked, setPicked] = useState(list?.id ?? lists[0]?.id ?? "");
  const [typed, setTyped] = useState("");
  const { copied, start } = useCopyOnPress(fetcher as FetcherWithComponents<unknown>, result?.key ?? null);
  const busy = fetcher.state !== "idle";

  if (result?.key && result.agent && result.list) {
    const prompt = fillPrompt(AGENT_PROMPT_WITH_KEY, { mcpUrl, listUrl: result.list.url, key: result.key });
    return <AppKeyDone who={result.agent.name} keyText={result.key} prompt={prompt} pasteInto={clientKind(result.agent.name).pasteInto} listId={result.list.id} listTitle={result.list.title} copied={copied} scroll={false} />;
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    start();
    fetcher.submit(e.currentTarget);
  };

  return (
    <fetcher.Form method="post" onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="intent" value="create-key" />
      {list ? (
        <div className="grid gap-1">
          <input type="hidden" name="list_id" value={list.id} />
          <p className="label">List</p>
          <p className="text-[1.05rem] font-medium break-words">{list.title}</p>
          {lists.length > 1 && (
            <Link to={connectKeyPath(app, null)} replace className="link w-fit text-[0.88rem]">
              Choose another list
            </Link>
          )}
        </div>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="label mb-1">Which list?</legend>
          {asked && <p className="text-[0.88rem] text-ink-3">That list isn't one of yours, so pick one here.</p>}
          <div className="grid gap-1.5">
            {lists.map((l) => (
              <label key={l.id} className={`ck-list ${picked === l.id ? "is-on" : ""}`}>
                <input type="radio" name="list_id" value={l.id} checked={picked === l.id} onChange={() => setPicked(l.id)} className="ck-radio" />
                <span className="min-w-0 break-words">{l.title}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!app && (
        <label className="field">
          <span className="label">The app's name</span>
          <input name="app_name" className="input" required maxLength={40} pattern="[A-Za-z0-9 ._\-]{1,40}" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e.g. My shopping app" autoComplete="off" />
        </label>
      )}
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
      <button className="btn btn-want w-full sm:w-fit" disabled={busy}>
        {busy ? "Creating…" : "Create key"}
      </button>
      <p className="text-[0.82rem] text-ink-3">The key is shown once. You can remove it any time in the list's Settings › Agents.</p>
    </fetcher.Form>
  );
}
