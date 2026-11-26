import { data, Form, Link, redirect, useNavigation } from "react-router";
import { cleanRef, RefField } from "~/lib/ref";
import type { Route } from "./+types/for-persona";
import { ListView } from "~/components/ListView";
import { HeadingBase } from "~/components/preview";
import { api } from "~/lib/api.server";
import { siteOrigin } from "~/lib/config.server";
import { PERSONA_GROUPS } from "~/lib/personas";
import { PERSONAS, personaBySlug } from "~/lib/personas.server";
import { buildSample, DEFAULT_LOOK } from "~/lib/samples";
import { useRootData } from "~/lib/hooks";
import { assertSameOrigin, getSessionToken } from "~/lib/session.server";
import type { ListFormat, ListSummary } from "~/lib/types";
import { getThemeView, resolveLook } from "~/themes/catalogue.server";

const ORDER: ListFormat[] = ["shopping", "tasks", "research"];
const LIST_NAME: Record<ListFormat, string> = { shopping: "Shopping list", tasks: "Task list", research: "Research list" };

export function loader({ request, params }: Route.LoaderArgs) {
  const persona = personaBySlug(params.slug);
  if (!persona) throw new Response("Not found", { status: 404 });
  const origin = siteOrigin(request);
  const now = Date.now();
  // One sample at a time (?list=, real links): by default the kind the page's headline is about.
  const asked = new URL(request.url).searchParams.get("list");
  const shown: ListFormat = ORDER.includes(asked as ListFormat) ? (asked as ListFormat) : (persona.opens ?? "shopping");
  const lists = [shown].map((format) => {
    const spec = persona.lists[format];
    const theme = getThemeView(spec.look ?? DEFAULT_LOOK[format], format);
    return { format, theme, sample: buildSample(spec, { id: `s-${format}`, now, url: `${origin}/for/${persona.slug}` }) };
  });
  const { lists: _specs, ...page } = persona;
  // Three related pages: the same group first, then neighbours, indexed pages only.
  const others = PERSONAS.filter((p) => p.slug !== persona.slug && p.index);
  const related = [...others.filter((p) => p.group === persona.group), ...others.filter((p) => p.group !== persona.group)]
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.title }));
  return { persona: page, lists, origin, related, shown };
}

export function headers() {
  // Static content: the same for everyone, so shared caches may keep it.
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Not found · The Want MCP" }, { name: "robots", content: "noindex" }];
  const { persona: p, origin } = loaderData;
  const url = `${origin}/for/${p.slug}`;
  return [
    { title: `${p.title} · The Want MCP` },
    { name: "description", content: p.description },
    { tagName: "link", rel: "canonical", href: url },
    ...(p.index ? [] : [{ name: "robots", content: "noindex" }]),
    { property: "og:title", content: p.title },
    { property: "og:description", content: p.description },
    { property: "og:url", content: url },
    { property: "og:image", content: `${origin}/og/for/${p.slug}.png?v=1` },
    { property: "og:image:alt", content: p.h1 },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

/** "Start with this list": a private copy of the sample's wants (no products or answers), after sign-in. */
export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const persona = personaBySlug(params.slug);
  if (!persona) throw new Response("Not found", { status: 404 });
  const form = await request.formData();
  const format = String(form.get("format")) as ListFormat;
  if (!ORDER.includes(format)) return data({ error: "Pick a list" }, 400);
  if (!getSessionToken(request)) throw redirect(`/login?next=${encodeURIComponent(`/for/${persona.slug}?list=${format}#start-${format}`)}`);
  const spec = persona.lists[format];
  try {
    const list = await api<ListSummary>(request, "/lists", { method: "POST", body: { title: spec.title, format, visibility: "private" }, ref: cleanRef(form.get("ref")) });
    const look = resolveLook(spec.look ?? DEFAULT_LOOK[format], format).slug;
    if (look !== resolveLook(DEFAULT_LOOK[format], format).slug) await api(request, `/lists/${list.id}`, { method: "PATCH", body: { theme: look } }).catch(() => null);
    for (const item of spec.items) {
      await api(request, `/lists/${encodeURIComponent(list.id)}/items`, { method: "POST", body: { text: item.want, ...(item.details ? { details: item.details } : {}) } });
    }
    return redirect(`/l/${list.id}?new=1`);
  } catch {
    return data({ error: "That didn't work. Try again in a moment." }, 502);
  }
}

export default function ForPersona({ loaderData, actionData }: Route.ComponentProps) {
  const { persona: p, lists, origin, related, shown } = loaderData;
  const nav = useNavigation();
  const { user } = useRootData();
  const starting = nav.state !== "idle" ? nav.formData?.get("format") : null;
  return (
    <div>
      <header className="wrap grid max-w-4xl gap-3 pt-12 pb-10 sm:pt-16">
        <Link to={`/for#${p.group}`} className="eyebrow w-fit hover:text-ink">
          {PERSONA_GROUPS[p.group]}
        </Link>
        <h1 className="display text-[2.25rem] sm:text-[3rem]">{p.h1}</h1>
        <p className="max-w-[60ch] text-[1.0625rem] text-ink-2">{p.intro}</p>
      </header>

      {/* Three samples, one shown at a time: real links, so each has an address and it works without JavaScript. */}
      <nav aria-label="Sample lists" className="wrap">
        <div className="view-switch">
          {ORDER.map((f) => (
            <Link key={f} to={`?list=${f}#start-${f}`} preventScrollReset replace aria-current={f === shown ? "page" : undefined} className={`view-tab ${f === shown ? "is-on" : ""}`}>
              {f === "shopping" ? "Shopping" : f === "tasks" ? "Tasks" : "Research"}
            </Link>
          ))}
        </div>
      </nav>

      {lists.map(({ format, theme, sample }) => (
        <section key={format} id={`start-${format}`} aria-labelledby={`${format}-h`} className="scroll-mt-20">
          <div className="wrap grid gap-4 py-6 sm:py-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id={`${format}-h`} className="serif text-[1.6rem] sm:text-[1.9rem]">
                {LIST_NAME[format]}
              </h2>
              <Form method="post" className="flex items-center gap-2">
                <input type="hidden" name="format" value={format} />
                <RefField />
                <button className="btn btn-want" disabled={starting === format}>
                  {starting === format ? "Creating…" : "Start with this list"}
                </button>
              </Form>
            </div>
            {actionData && "error" in actionData && starting === null && <p className="form-error">{actionData.error}</p>}
            <div className="overflow-hidden rounded-[18px] bg-paper shadow-[var(--shadow)]">
              <HeadingBase.Provider value={3}>
                <ListView
                  list={sample.list}
                  items={sample.items}
                  suggestions={[]}
                  comments={[]}
                  commentsCursor={null}
                  prices={sample.prices}
                  isWriter={false}
                  role={null}
                  origin={origin}
                  theme={theme}
                  preview
                  sample
                />
              </HeadingBase.Provider>
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="next-h" className="wrap grid justify-items-center gap-5 py-16 text-center">
        <h2 id="next-h" className="serif text-[1.75rem] sm:text-[2.1rem]">
          Make one for yourself
        </h2>
        <p className="max-w-[52ch] text-ink-2">Write what you want in your own words, then connect the AI app you already use.</p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link to={user ? "/app/new" : "/login?next=/app/new"} className="btn btn-want btn-lg">
            Start a list
          </Link>
          <Link to="/connect" className="btn btn-lg">
            Connect an agent
          </Link>
        </div>
      </section>

      <nav aria-labelledby="related-h" className="wrap grid gap-3 border-t border-line py-10">
        <h2 id="related-h" className="text-[1rem] font-semibold">
          Related
        </h2>
        <ul className="grid gap-2 sm:grid-cols-3 sm:gap-6">
          {related.map((r) => (
            <li key={r.slug}>
              <Link to={`/for/${r.slug}`} className="link">
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap gap-x-6 gap-y-2 text-[0.9rem]">
          <Link to="/connect" className="link">
            Connect your AI app
          </Link>
          <Link to="/for" className="link text-ink-3">
            Lists for other jobs
          </Link>
        </p>
      </nav>
    </div>
  );
}

/** Cloudflare Web Analytics may count views of this page (root.tsx, AnalyticsBeacon). */
export const handle = { analytics: true };
