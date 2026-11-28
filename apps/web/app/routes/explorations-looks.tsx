import { useEffect, useRef, useState } from "react";
import { Form, Link } from "react-router";
import type { Route } from "./+types/explorations-looks";
import { CHAPTERS, ESSAY, SCORES } from "~/explorations/looks-essay";
import { siteOrigin } from "~/lib/config.server";
import { ESSAY_PATH, framePath, type Appearance, type FrameVersion } from "~/lib/exhibits";
import { FORMATS } from "~/lib/formats";
import type { ListFormat } from "~/lib/types";
import { OFFERED_OCCASIONS, TEMPLATES } from "~/themes/catalogue.server";

type Width = "phone" | "desktop";
interface View {
  format: ListFormat | null;
  mode: Appearance | null;
  width: Width;
  occasion: string | null;
}

/**
 * /explorations/redesigning-the-looks: an interactive essay. The words and the exhibits are one thing: each look's
 * section has the real look beside it, before and after, live in a frame. One bar sets what every exhibit shows (kind
 * of list, light or dark, phone or desktop width, an occasion) and keeps it in the address, so a link shares the view.
 *
 * Without JavaScript it reads start to finish: the bar is links and one plain form, a pair's Before / After switch is
 * two radio buttons, and each side has a link that opens it on its own. With JavaScript, frames far from the screen
 * are let go and come back as the reader returns.
 */
export function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams;
  const f = q.get("format");
  const m = q.get("mode");
  const view: View = {
    format: f === "shopping" || f === "tasks" || f === "research" ? f : null,
    mode: m === "light" || m === "dark" ? m : null,
    width: q.get("width") === "desktop" ? "desktop" : "phone",
    occasion: OFFERED_OCCASIONS.find((o) => o.slug === q.get("occasion"))?.slug ?? null,
  };
  return {
    view,
    occasions: OFFERED_OCCASIONS.map((o) => ({ slug: o.slug, name: o.name })),
    looks: TEMPLATES.map((t) => ({ slug: t.slug, name: t.name, natural: (t.natural ?? "shopping") as ListFormat })),
    origin: siteOrigin(request),
  };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300, s-maxage=3600" };
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "https://wantmcp.com";
  const url = `${origin}${ESSAY_PATH}`;
  const title = `${ESSAY.title}: an interactive essay`;
  return [
    { title: `${title} · The Want MCP` },
    { name: "description", content: ESSAY.description },
    { tagName: "link", rel: "canonical", href: url },
    // One page to index: the views a reader can set are the same essay.
    ...(location.search ? [{ name: "robots", content: "noindex, follow" }] : []),
    { property: "og:type", content: "article" },
    { property: "og:title", content: title },
    { property: "og:description", content: ESSAY.description },
    { property: "og:url", content: url },
    { property: "og:image", content: `${origin}/og/explorations/redesigning-the-looks.png?v=1` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: `${ESSAY.kicker}: ${ESSAY.title}` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: "/theme-css/explorations/essay.css" }];

/** Cloudflare Web Analytics may count views of this page (root.tsx, AnalyticsBeacon). */
export const handle = { analytics: true };

const KIND: Record<ListFormat, string> = { shopping: "Shopping", tasks: "Tasks", research: "Research" };

function hrefFor(view: View, over: Partial<View>, hash = ""): string {
  const next = { ...view, ...over };
  const p = new URLSearchParams();
  if (next.format) p.set("format", next.format);
  if (next.mode) p.set("mode", next.mode);
  if (next.width === "desktop") p.set("width", "desktop");
  if (next.occasion) p.set("occasion", next.occasion);
  const s = p.toString();
  return `${s ? `?${s}` : ESSAY_PATH}${hash}`;
}

export default function LooksEssay({ loaderData }: Route.ComponentProps) {
  const { view, occasions, looks } = loaderData;
  const bySlug = new Map(looks.map((l) => [l.slug, l]));
  const slugOf = (template: string) => (view.occasion ? `${template}--${view.occasion}` : template);
  const src = (version: FrameVersion, template: string, format?: ListFormat) =>
    framePath(version, slugOf(template), { format: format ?? view.format ?? bySlug.get(template)!.natural, mode: view.mode });
  const occasionName = occasions.find((o) => o.slug === view.occasion)?.name ?? null;
  const showing = [view.format ? KIND[view.format] : "Usual lists", view.mode === "dark" ? "Dark" : view.mode === "light" ? "Light" : "Auto", view.width === "desktop" ? "Desktop" : "Phone", ...(occasionName ? [occasionName] : [])];

  return (
    <article className="essay">
      <header className="wrap essay-top">
        <p className="essay-kicker">
          <Link to="/explorations" className="link">
            Explorations
          </Link>{" "}
          · {ESSAY.kicker} · {ESSAY.published}
        </p>
        <h1 className="essay-h1">{ESSAY.title}</h1>
        <p className="essay-standfirst">{ESSAY.standfirst}</p>
        <p className="essay-credit">
          {ESSAY.credit[0]}
          <a href={ESSAY.creditHref} className="link">
            {ESSAY.credit[1]}
          </a>
          {ESSAY.credit[2]}
        </p>
      </header>

      <ViewBar view={view} occasions={occasions} showing={showing} />

      <div className="wrap essay-body">
        <section aria-labelledby="rule-h" className="essay-section">
          <h2 id="rule-h" className="essay-h2">The rule: its own at a glance</h2>
          <p>
            A person picks a look to make a list theirs, so each look must be unmistakably its own at a glance, and the glance is the top of the page. Here are the eight
            tops, all showing the same list. Switch to Before.
          </p>
          <Exhibit
            id="glance"
            label="The eight headers"
            width="phone"
            pick={1}
            grid
            sides={(["before", "after"] as const).map((version) => ({
              key: version,
              name: version === "before" ? "Before" : "After",
              frames: looks.map((l) => ({ title: `${l.name} header, ${version}`, caption: l.name, src: framePath(version, slugOf(l.slug), { format: view.format ?? "tasks", mode: view.mode, head: true }) })),
            }))}
          />
          <p>
            In the old set a reviewer who did not know which was which found four pairs that could be swapped without anyone noticing: Heat and Gallery, Tracker and
            Sections, Tracker and Sheet, Checklist and Tracker. Where the old tops did differ, it was mostly by ornament: a stripe, a tile, a gradient. In the new set the
            reviewer found one such pair, Board and Sections, and Board's band was made navy afterwards to separate them.
          </p>
          <p>
            The bar that follows you sets what every example on this page shows: the kind of list, light or dark, phone or desktop width, and an occasion. Usual lists gives
            each look the kind of list it is most used for. The address keeps your choices, so a link shares exactly what you see.
          </p>
        </section>

        <section aria-labelledby="how-h" className="essay-section">
          <h2 id="how-h" className="essay-h2">How it was made and reviewed</h2>
          <p>
            The looks had grown one request at a time. Several wore their idea like a costume, and on a phone some of them broke. The redrawing was done by an AI coding
            agent, and the owner of the site decided what to keep. The method credited at the top has three parts, and we used all three.
          </p>
          <ul className="essay-list">
            <li>
              <strong>Its guidance for working screens.</strong> A look may lend a page its type, its density and one move of its own. It may not supply decoration, or print
              anything that is not real.
            </li>
            <li>
              <strong>Its detector,</strong> a program that scans a page for common faults. It ran on our own machine, reporting nothing back, over both versions of every
              look at phone and desktop size. It flagged Board's gradient, cards inside cards on Tracker, a Lowest tag drawn at 9.6 pixels and initials too faint to read on
              some avatars.
            </li>
            <li>
              <strong>Its critique, which we ran blind.</strong> A second AI agent, started fresh, was given screenshots labelled only A and B, or P and Q. It was not told
              which was new. It scored each on six questions about ease of use, 0 to 4, so 24 at most.
            </li>
          </ul>
          <p>
            There were three rounds, and the redrawn looks changed after each. In the first, the redrawn version won seven looks and the old Doc won the eighth; the reviewer
            also said the redrawn Checklist, Doc and Tracker read as one system in three skins. We pushed those three apart. In the third round, run on WebKit, the engine
            iPhones use, the redrawn versions won, and were judged not mistakable for one another.
          </p>
          <div className="essay-table-wrap">
            <table className="essay-table">
              <caption>Blind review, out of 24</caption>
              <thead>
                <tr>
                  <th scope="col">Look</th>
                  <th scope="col">Before</th>
                  <th scope="col">Redrawn</th>
                  <th scope="col">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {SCORES.map(([look, before, after, outcome]) => (
                  <tr key={look}>
                    <th scope="row">{look}</th>
                    <td>{before}</td>
                    <td>{after}</td>
                    <td>{outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Two points separate most pairs, and the judge was a machine reading pictures. We take the scores as a direction, not a measurement.</p>
        </section>

        <section aria-labelledby="bug-h" className="essay-section">
          <h2 id="bug-h" className="essay-h2">The bug the blind review missed</h2>
          <div className="essay-look">
            <div className="essay-look-words">
              <p>
                After the second round we took a column out of the redrawn Sections. The rule that set the widths of the columns that were left was meant for the wide table.
                Written without its condition, it also applied on a phone, where each row is stacked, and left a title 52 pixels of a row 376 wide.
              </p>
              <p>
                The reviewers never saw it: their screenshots were taken before the change. A person looking at a phone found it the same day. Switch this example to As
                first drawn.
              </p>
              <p>
                What it taught us: a review is of the pictures it was given, not of what ships. A test now loads every redrawn look with every kind of list at phone width,
                in WebKit as well as Chrome, and fails if any title has less than 60% of its row.
              </p>
            </div>
            <Exhibit
              id="bug"
              label="Sections on a phone"
              width="phone"
              pick={1}
              sides={[
                { key: "first-drawn", name: "As first drawn", frames: [{ title: "Sections, as first drawn", src: framePath("first-drawn", "sections", { format: "shopping", mode: view.mode }) }] },
                { key: "after", name: "Fixed", frames: [{ title: "Sections, fixed", src: framePath("after", "sections", { format: "shopping", mode: view.mode }) }] },
              ]}
              note="Always at phone width with a shopping list, where the bug was."
            />
          </div>
        </section>

        {CHAPTERS.map((c) => {
          const look = bySlug.get(c.slug);
          if (!look) return null;
          const kept = c.decision === "kept";
          // An adopted look: before and after. A kept one is the same page before and after, so the pair worth looking at
          // is the page that was kept beside the one that was proposed.
          const sides = kept
            ? [
                { key: "after", name: "Kept", frames: [{ title: `${look.name}, kept`, src: src("after", c.slug) }] },
                { key: "proposed", name: "Proposed", frames: [{ title: `${look.name}, as proposed`, src: src("proposed", c.slug) }] },
              ]
            : [
                { key: "before", name: "Before", frames: [{ title: `${look.name}, before`, src: src("before", c.slug) }] },
                { key: "after", name: "After", frames: [{ title: `${look.name}, after`, src: src("after", c.slug) }] },
              ];
          return (
            <section key={c.slug} id={`look-${c.slug}`} aria-labelledby={`look-${c.slug}-h`} className="essay-section">
              <h2 id={`look-${c.slug}-h`} className="essay-h2">
                {look.name} <span className={`essay-tag is-${c.decision}`}>{kept ? "Kept as it was" : "Adopted"}</span>
              </h2>
              <div className="essay-look">
                <div className="essay-look-words">
                  <p>{c.lead}</p>
                  {c.paras.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  <p className="essay-try">
                    <strong>Try it.</strong>{" "}
                    {c.tryView && (
                      <>
                        <Link to={hrefFor(view, c.tryView, `#look-${c.slug}`)} replace preventScrollReset className="link">
                          {c.tryLabel}
                        </Link>{c.tryIt.startsWith("With") ? ". " : " "}
                      </>
                    )}
                    {c.tryIt}
                  </p>
                </div>
                <Exhibit id={c.slug} label={look.name} width={view.width} pick={kept ? 0 : 1} sides={sides} extra={kept ? [{ name: "Before", href: src("before", c.slug) }] : undefined} />
              </div>
            </section>
          );
        })}

        <section aria-labelledby="decided-h" className="essay-section">
          <h2 id="decided-h" className="essay-h2">What we decided</h2>
          <p>
            The owner looked at every pair on this page, on a phone. Six looks were adopted as redrawn: Sheet, Checklist, Board, Sections, Tracker and Gallery. They are what
            a list uses now.
          </p>
          <p>
            Doc and Heat were kept as they were. The blind reviews had scored the redrawn ones a little higher. The owner liked the old ones better, and said so. The looks
            are theirs to decide, and 16 against 14 from a machine is not an argument against a person's eye.
          </p>
          <p>
            Before is the old styling on today's page. Three faults in parts every look shares were fixed for all of them, so they show as fixed in Before too: a bought want
            in Gallery now shows what was paid, not the cheapest offer; a status and the line under it write a length of time the same way; and a line about where a price
            was seen no longer starts with a dot.
          </p>
        </section>

        <section aria-labelledby="untested-h" className="essay-section">
          <h2 id="untested-h" className="essay-h2">What we did not test</h2>
          <ul className="essay-list">
            <li>A real iPhone. Everything ran in WebKit under automation at 390 by 844 pixels, with touch, dark mode and Reduce Motion, which is close but is not the device.</li>
            <li>People. The reviewers were AI agents, and the only person who has judged these is the owner.</li>
            <li>Every occasion on every look by eye. Contrast is computed for all of them; a few were looked at.</li>
            <li>Empty lists, very long titles, and lists with dozens of items.</li>
            <li>Firefox, and screens between a phone and a laptop.</li>
          </ul>
        </section>

        <p className="essay-end">
          Pick a look for a list of your own in{" "}
          <Link to="/themes" className="link">
            Looks
          </Link>
          , or read{" "}
          <Link to="/explorations" className="link">
            other explorations
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

/**
 * The controls that travel with the reader. On a small screen: one line saying what is showing, which opens the
 * choices. On a wide one: the choices in a row. Every choice is a link (the occasion a plain form).
 */
function ViewBar({ view, occasions, showing }: { view: View; occasions: Array<{ slug: string; name: string }>; showing: string[] }) {
  const groups = (uid: string) => (
    <>
      <Group label="Kind of list">
        <Choice to={hrefFor(view, { format: null })} on={view.format === null}>
          Usual lists
        </Choice>
        {Object.values(FORMATS).map((f) => (
          <Choice key={f.format} to={hrefFor(view, { format: f.format })} on={view.format === f.format}>
            {f.label}
          </Choice>
        ))}
      </Group>
      <Group label="Appearance">
        <Choice to={hrefFor(view, { mode: null })} on={view.mode === null}>
          Auto
        </Choice>
        <Choice to={hrefFor(view, { mode: "light" })} on={view.mode === "light"}>
          Light
        </Choice>
        <Choice to={hrefFor(view, { mode: "dark" })} on={view.mode === "dark"}>
          Dark
        </Choice>
      </Group>
      <Group label="Width">
        <Choice to={hrefFor(view, { width: "phone" })} on={view.width === "phone"}>
          Phone
        </Choice>
        <Choice to={hrefFor(view, { width: "desktop" })} on={view.width === "desktop"}>
          Desktop
        </Choice>
      </Group>
      <Form method="get" className="vb-group" preventScrollReset replace>
        {view.format && <input type="hidden" name="format" value={view.format} />}
        {view.mode && <input type="hidden" name="mode" value={view.mode} />}
        {view.width === "desktop" && <input type="hidden" name="width" value="desktop" />}
        <label className="vb-label" htmlFor={`${uid}-occasion`}>
          Occasion
        </label>
        <span className="vb-occasion">
          <select id={`${uid}-occasion`} name="occasion" defaultValue={view.occasion ?? ""} key={view.occasion ?? "none"} className="select vb-select">
            <option value="">None</option>
            {occasions.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
          <button className="btn btn-sm">Show</button>
        </span>
      </Form>
    </>
  );
  return (
    <nav aria-label="What every example shows" className="vb">
      <div className="wrap">
        {/* Remounted when the view changes, so it closes after a choice. */}
        <details className="vb-small" key={showing.join()}>
          <summary className="vb-summary">
            <span className="vb-summary-label">Showing</span>
            <span className="vb-summary-values">{showing.join(" · ")}</span>
            <span className="vb-summary-change">Change</span>
          </summary>
          <div className="vb-row">{groups("vbs")}</div>
        </details>
        <div className="vb-wide vb-row">{groups("vbw")}</div>
      </div>
    </nav>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="vb-group">
      <span className="vb-label" aria-hidden="true">
        {label}
      </span>
      <span className="vb-choices">{children}</span>
    </div>
  );
}

function Choice({ to, on, children }: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link to={to} replace preventScrollReset aria-current={on ? "true" : undefined} className={`vb-choice ${on ? "is-on" : ""}`}>
      {children}
    </Link>
  );
}

interface Side {
  key: string;
  name: string;
  frames: Array<{ title: string; src: string; caption?: string }>;
}

/**
 * A live example with a switch between its versions. The switch is a group of radio buttons and the stylesheet shows
 * the side that is chosen, so it works before any script runs. On a wide screen a pair at phone width shows both sides
 * at once and needs no switch. `grid` lays a side's frames out as a grid of small tops (the eight headers).
 */
function Exhibit({ id, label, sides, width, pick, grid = false, note, extra }: { id: string; label: string; sides: Side[]; width: Width; pick: number; grid?: boolean; note?: string; extra?: Array<{ name: string; href: string }> }) {
  const open = [...(extra ?? []), ...sides.map((s) => ({ name: s.name, href: s.frames[0]!.src }))];
  return (
    <div role="group" aria-label={`${label}: example`} className={`ex ${grid ? "is-grid" : `is-${width} is-pair`}`}>
      {sides.map((s, i) => (
        <input key={s.key} type="radio" name={`ex-${id}`} id={`ex-${id}-${s.key}`} defaultChecked={i === pick} className={`ex-radio ex-r${i}`} aria-label={`${label}: ${s.name}`} />
      ))}
      <div className="ex-switch" aria-hidden="true">
        {sides.map((s) => (
          <label key={s.key} htmlFor={`ex-${id}-${s.key}`} className="ex-switch-label">
            {s.name}
          </label>
        ))}
      </div>
      <div className="ex-stage">
        {sides.map((s, i) => (
          <div key={s.key} className={`ex-side ex-s${i}`}>
            <p className="ex-side-name">{s.name}</p>
            <div className={grid ? "ex-grid" : "ex-single"}>
              {s.frames.map((f) => (
                <figure key={f.src} className="ex-figure">
                  {/* The name over its frame: under it, a name read as the heading of the frame below. */}
                  {f.caption && <figcaption className="ex-caption">{f.caption}</figcaption>}
                  <div className="ex-device">
                    <LiveFrame src={f.src} title={f.title} still={grid} />
                  </div>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="ex-note">
        {note ?? "A sample list. Nothing is saved."}
        {!grid && (
          <>
            {" "}
            Open full page:{" "}
            {open.map((o, i) => (
              <span key={o.name}>
                {i > 0 && " · "}
                <a href={o.href} className="link ex-open">
                  {o.name}
                  <span className="sr-only"> ({label})</span>
                </a>
              </span>
            ))}
          </>
        )}
      </p>
    </div>
  );
}

/** How long a frame may stay undrawn before the reader is offered a plain link to it. */
const SLOW_MS = 8000;

/**
 * One frame. The server sends its address and the browser's own lazy loading waits until it is near. Once scripts run,
 * a frame far from the screen (or on the side not showing) is let go, and comes back when the reader does, so a phone
 * holds a few live pages at a time, not thirty.
 *
 * Until a frame has drawn, its box says so in words (no spinner: nothing moves on this page), and if it still has not
 * after eight seconds it offers a plain link to the example on its own. Without scripts the words sit behind the frame
 * and the page it loads covers them.
 */
function LiveFrame({ src, title, still }: { src: string; title: string; still: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [near, setNear] = useState(true);
  // null until scripts run (the server cannot know); then whether the page in the frame has drawn.
  const [drawn, setDrawn] = useState<boolean | null>(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const box = ref.current?.parentElement;
    if (!box || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => setNear(entries.some((e) => e.isIntersecting)), { rootMargin: "120% 100% 120% 100%" });
    io.observe(box);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    // A frame the server sent may have loaded before scripts ran, so its load event is gone: look at the frame itself.
    const frame = ref.current;
    let done = false;
    try {
      const doc = frame?.contentDocument;
      done = !!near && !!doc && doc.readyState === "complete" && doc.location.href !== "about:blank";
    } catch {
      // Not ours to read: wait for its load event.
    }
    setDrawn(done);
    setSlow(false);
    if (!near || done) return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [near, src]);
  return (
    <>
      {drawn !== true && (
        <p className="ex-wait" data-wait>
          <span>Loading the example…</span>
          {slow && !still && (
            <a href={src} className="link">
              Open it on its own
              <span className="sr-only"> ({title})</span>
            </a>
          )}
        </p>
      )}
      <iframe
        ref={ref}
        src={near ? src : "about:blank"}
        title={title}
        loading="lazy"
        className="ex-iframe"
        data-live={near ? "" : undefined}
        data-drawing={drawn === false ? "" : undefined}
        onLoad={() => near && setDrawn(true)}
        scrolling={still ? "no" : undefined}
        inert={still}
      />
    </>
  );
}
