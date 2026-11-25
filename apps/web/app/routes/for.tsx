import { Link } from "react-router";
import type { Route } from "./+types/for";
import { siteOrigin } from "~/lib/config.server";
import { PERSONA_GROUPS, type PersonaGroup } from "~/lib/personas";
import { PERSONAS } from "~/lib/personas.server";

export function loader({ request }: Route.LoaderArgs) {
  // Only pages cleared for search are listed; the rest stay unlinked until confirmed.
  const pages = PERSONAS.filter((p) => p.index).map(({ slug, group, label, h1 }) => ({ slug, group, label, h1 }));
  const groups = (Object.keys(PERSONA_GROUPS) as PersonaGroup[])
    .map((g) => ({ id: g, name: PERSONA_GROUPS[g], pages: pages.filter((p) => p.group === g) }))
    .filter((g) => g.pages.length > 0);
  return { groups, origin: siteOrigin(request) };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const description = "Sample lists for real jobs: big purchases, research, coding agents and more. See what your AI agent can do with each, then start your own.";
  return [
    { title: "Lists for every kind of job · The Want MCP" },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/for` },
    { property: "og:title", content: "Lists for every kind of job" },
    { property: "og:description", content: description },
    { property: "og:url", content: `${origin}/for` },
    { property: "og:image", content: `${origin}/og/home.png?v=6` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function ForIndex({ loaderData }: Route.ComponentProps) {
  return (
    <div className="wrap grid gap-12 py-12 sm:py-16">
      <header className="grid max-w-3xl gap-3">
        <h1 className="display text-[2.25rem] sm:text-[3rem]">Lists for every kind of job</h1>
        <p className="text-[1.0625rem] text-ink-2">Each one shows sample lists to buy, to do and to find out, worked on by AI agents.</p>
      </header>
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {loaderData.groups.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="grid content-start gap-2 scroll-mt-24">
            <h2 id={`${g.id}-h`} className="eyebrow">
              {g.name}
            </h2>
            <ul className="grid border-t border-line">
              {g.pages.map((p) => (
                <li key={p.slug} className="border-b border-line">
                  <Link to={`/for/${p.slug}`} className="grid gap-0.5 py-3 hover:text-ink">
                    <span className="font-semibold">{p.label}</span>
                    <span className="text-[0.9rem] text-ink-2">{p.h1}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export const handle = { analytics: true };
