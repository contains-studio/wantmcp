/**
 * /developers (SPEC 24.3): "Build with The Want MCP", the guide the MCP layer keeps in the server repo and checks against
 * the live server, copied in as app/content/developers.md (pnpm developers:build). Nothing here is retyped: the page
 * lays the same text out — the three ways in as cards, a contents list, code with a copy button and one tab per
 * language — and /developers.md serves it as it is for a coding agent.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/developers";
import source from "~/content/developers.md?raw";
import { CopyButton } from "~/components/CopyButton";
import { siteOrigin } from "~/lib/config.server";
import { readGuide, parseInline, type Block, type CodeGroup, type Inline } from "~/lib/developers";

const guide = readGuide(source);

export function loader({ request }: Route.LoaderArgs) {
  return { origin: siteOrigin(request) };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const description = "Put The Want MCP into your app, website or tool: three ways in, the endpoints, and code in curl, TypeScript and Swift.";
  return [
    { title: `${guide.title} · The Want MCP` },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${origin}/developers` },
    { tagName: "link", rel: "alternate", type: "text/markdown", href: `${origin}/developers.md` },
    { property: "og:title", content: guide.title },
    { property: "og:description", content: description },
    { property: "og:url", content: `${origin}/developers` },
    { property: "og:image", content: `${origin}/og/home.png?v=13` },
  ];
}

export const handle = { analytics: true };

/** Code that has been type-checked but not run end to end says so beside it, as the guide does. */
const UNRUN = new Set(["Swift"]);

export default function Developers({ loaderData }: Route.ComponentProps) {
  const [lead, ...restIntro] = guide.intro;
  const contents = [...guide.sections.map((s) => s.heading), ...(guide.code ? [guide.code.heading] : [])];
  const mdUrl = `${loaderData.origin}/developers.md`;
  // The long reference parts start folded on a phone; from 900px they open (owner, 27 Nov 2026). Folded in the HTML,
  // so a phone never jumps; on a wide screen they open after load, below the fold, and a #section link is re-found.
  useEffect(() => {
    if (!window.matchMedia("(min-width: 900px)").matches) return;
    for (const d of document.querySelectorAll<HTMLDetailsElement>("details[data-fold]")) d.open = true;
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return (
    <div className="wrap grid gap-10 py-10 sm:py-14">
      <header className="grid max-w-3xl gap-5">
        <p className="label">For developers</p>
        <h1 className="display text-[2.25rem] sm:text-[2.75rem]">{guide.title}</h1>
        {lead && <Blocks blocks={[lead]} />}
        <Blocks blocks={restIntro} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href="/developers.md" className="btn">
            Give this to your coding agent
          </a>
          <CopyButton text={mdUrl} label="Copy its link" ariaLabel="Copy its link: developers.md" className="textlink-btn text-[0.9rem]" />
        </div>
      </header>

      {guide.ways.length > 0 && (
        <section aria-labelledby="ways-h" className="grid gap-4">
          <h2 id="ways-h" className="text-[1.35rem] font-semibold tracking-[-0.01em]">
            Three ways in, in this order
          </h2>
          <ol className="dev-ways">
            {guide.ways.map((w, i) => (
              <li key={w.title} className="card grid content-start gap-2 p-5">
                <span className="dev-way-n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="text-[1.05rem] font-semibold">{w.title}</h3>
                <p className="text-[0.92rem] text-ink-2">
                  <Text s={w.text} />
                </p>
                {w.href && (
                  <a href={w.href} className="link mt-auto w-fit text-[0.9rem]">
                    How it works<span className="sr-only">: {w.title}</span>
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="dev-layout">
        <nav aria-label="On this page" className="dev-toc">
          {/* A fold on a phone, a list beside the text from 1024px. */}
          <details className="dev-toc-fold" id="contents">
            <summary className="add-link">On this page</summary>
            <Contents items={contents} />
          </details>
          <div className="dev-toc-side">
            <p className="label mb-2">On this page</p>
            <Contents items={contents} />
          </div>
        </nav>
        <div className="dev-body grid min-w-0 gap-12">
          {guide.sections.map((s) => (
            <section key={s.heading.id} aria-labelledby={s.heading.id} className="grid min-w-0 gap-4">
              <h2 id={s.heading.id} className="dev-h2">
                <Text s={s.heading.text} />
              </h2>
              <Blocks blocks={s.blocks} />
              <BackToContents />
            </section>
          ))}
          {guide.code && <CodeSection heading={guide.code.heading} groups={guide.code.groups} />}
          <p className="text-[0.9rem] text-ink-3">
            Building an app and want it listed? See <a href="#being-listed-on-connect" className="link">Being listed on /connect</a>. People connect their apps at{" "}
            <Link to="/connect" className="link">
              /connect
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

/** On a phone, where the contents aren't beside the text: back to them, opened. */
function BackToContents() {
  return (
    <a
      href="#contents"
      className="dev-back link w-fit text-[0.88rem] text-ink-3"
      onClick={() => {
        const fold = document.getElementById("contents");
        if (fold instanceof HTMLDetailsElement) fold.open = true;
      }}
    >
      Back to contents
    </a>
  );
}

/** A long part, folded on a phone (open from 900px): a clear Show, and Hide once open. */
function Fold({ what, children }: { what: string; children: ReactNode }) {
  return (
    <details className="dev-fold" data-fold>
      <summary className="dev-fold-btn">
        <span className="dev-fold-show">Show {what}</span>
        <span className="dev-fold-hide">Hide {what}</span>
      </summary>
      {children}
    </details>
  );
}

function Contents({ items }: { items: Array<{ id: string; text: string }> }) {
  return (
    <ol className="grid gap-0.5 text-[0.9rem]">
      {items.map((h) => (
        <li key={h.id}>
          <a href={`#${h.id}`} className="dev-toc-link">
            {h.text.replace(/`/g, "")}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** The code, one card per thing it does, with a tab per language. The language picked stays picked on every card. */
function CodeSection({ heading, groups }: { heading: { id: string; text: string }; groups: CodeGroup[] }) {
  const [lang, setLang] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return (
    <section aria-labelledby={heading.id} className="grid min-w-0 gap-6">
      <h2 id={heading.id} className="dev-h2">
        {heading.text}
      </h2>
      {groups.map((g, gi) => {
        const on = g.variants.find((v) => v.lang === lang) ?? g.variants[0];
        return (
          <section key={g.id} aria-labelledby={g.id} className="grid min-w-0 gap-3">
            <h3 id={g.id} className="text-[1.1rem] font-semibold">
              {g.topic.charAt(0).toUpperCase() + g.topic.slice(1)}
            </h3>
            {/* Without JavaScript every language shows, one after another; with it, one at a time. */}
            {hydrated && g.variants.length > 1 && (
              <div role="tablist" aria-label={`${g.topic}: language`} className="view-switch w-fit">
                {g.variants.map((v) => (
                  <button
                    key={v.lang}
                    type="button"
                    role="tab"
                    id={`${g.id}-${v.lang}-tab`}
                    aria-selected={v === on}
                    aria-controls={`${g.id}-${v.lang}`}
                    tabIndex={v === on ? 0 : -1}
                    className={`view-tab ${v === on ? "is-on" : ""}`}
                    onClick={() => setLang(v.lang)}
                    onKeyDown={(e) => {
                      const at = g.variants.indexOf(v);
                      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                      if (!step) return;
                      const next = g.variants[(at + step + g.variants.length) % g.variants.length];
                      setLang(next.lang);
                      document.getElementById(`${g.id}-${next.lang}-tab`)?.focus();
                    }}
                  >
                    {v.lang}
                  </button>
                ))}
              </div>
            )}
            {g.variants.map((v) => (
              <div
                key={v.lang}
                id={`${g.id}-${v.lang}`}
                role={hydrated && g.variants.length > 1 ? "tabpanel" : undefined}
                aria-labelledby={hydrated && g.variants.length > 1 ? `${g.id}-${v.lang}-tab` : undefined}
                hidden={hydrated && v !== on}
                className="grid min-w-0 gap-3"
              >
                {(v.detail || UNRUN.has(v.lang)) && (
                  <p className="flex flex-wrap items-center gap-2 text-[0.88rem] text-ink-3">
                    {v.detail && <span>{v.detail}</span>}
                    {/* The guide's own words (server 7f3473c): type-checked under Swift 6, the sign-in sheet not run end to end. */}
                  {UNRUN.has(v.lang) && <span className="chip chip-warn">Type-checked; not run end to end</span>}
                  </p>
                )}
                {/* The first example stays open; the rest fold on a phone. */}
                <Blocks blocks={v.blocks} fold={gi > 0} />
              </div>
            ))}
          </section>
        );
      })}
      <BackToContents />
    </section>
  );
}

function Blocks({ blocks, fold = false }: { blocks: Block[]; fold?: boolean }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} fold={fold} />
      ))}
    </>
  );
}

/** Tables longer than this fold on a phone (the REST calls). */
const LONG_TABLE = 8;

function BlockView({ b, fold }: { b: Block; fold: boolean }) {
  switch (b.kind) {
    case "heading":
      return b.level === 3 ? (
        <h3 id={b.id} className="dev-h3">
          <Text s={b.text} />
        </h3>
      ) : (
        <h2 id={b.id} className="dev-h2">
          <Text s={b.text} />
        </h2>
      );
    case "para":
      return (
        <p className="dev-p">
          <Text s={b.text} />
        </p>
      );
    case "list": {
      const items = b.items.map((it, i) => (
        <li key={i}>
          <Text s={it} />
        </li>
      ));
      return b.ordered ? <ol className="dev-list list-decimal">{items}</ol> : <ul className="dev-list list-disc">{items}</ul>;
    }
    case "table": {
      const table = (
        <div className="dev-table">
          <table>
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i} scope="col">
                    <Text s={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    // On a phone each row stacks; the column's name goes before each value.
                    <td key={j} data-label={j > 0 && c ? b.head[j]?.replace(/`/g, "") : undefined}>
                      <Text s={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      return b.rows.length > LONG_TABLE ? <Fold what={`the table (${b.rows.length} rows)`}>{table}</Fold> : table;
    }
    case "code":
      return <Code lang={b.lang} text={b.text} fold={fold} />;
  }
}

const LANG_NAME: Record<string, string> = { bash: "Shell", ts: "TypeScript", swift: "Swift", json: "JSON", "": "HTTP" };

function Code({ lang, text, fold }: { lang: string; text: string; fold: boolean }) {
  const pre = (
    <pre tabIndex={0}>
      <code>{text}</code>
    </pre>
  );
  const lines = text.split("\n").length;
  return (
    <figure className="dev-code">
      <figcaption className="dev-code-bar">
        <span>{LANG_NAME[lang] ?? lang}</span>
        <CopyButton text={text} label="Copy" ariaLabel={`Copy this ${LANG_NAME[lang] ?? lang}`} className="btn btn-ghost btn-xs" />
      </figcaption>
      {/* Copy works folded or not. */}
      {fold ? <Fold what={`the code (${lines} lines)`}>{pre}</Fold> : pre}
    </figure>
  );
}

function Text({ s }: { s: string }) {
  return <>{parseInline(s).map(renderInline)}</>;
}

function renderInline(n: Inline, i: number): ReactNode {
  if (n.kind === "code") return <code key={i} className="dev-ic">{n.text}</code>;
  if (n.kind === "bold") return <strong key={i}>{n.parts.map(renderInline)}</strong>;
  return n.text;
}
