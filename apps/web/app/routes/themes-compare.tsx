import { Form, Link } from "react-router";
import type { Route } from "./+types/themes-compare";
import { framePath, type Appearance } from "~/lib/compare";
import { LOOK_NOTES, SUMMARY, type Better } from "~/lib/compare-notes";
import { FORMATS } from "~/lib/formats";
import type { ListFormat } from "~/lib/types";
import { OFFERED_OCCASIONS, TEMPLATES } from "~/themes/catalogue.server";

type Width = "phone" | "desktop";

/**
 * /themes/compare (branch looks-impeccable): each of the eight looks as it is today beside a redesign, on the same
 * sample list, with the review under each pair. Every control is a link (or a plain form), so the page works without
 * JavaScript. Not linked from anywhere, not in the sitemap, never indexed.
 */
export function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams;
  const f = q.get("format");
  const format: ListFormat | null = f === "shopping" || f === "tasks" || f === "research" ? f : null;
  const m = q.get("mode");
  const mode: Appearance | null = m === "light" || m === "dark" ? m : null;
  const width: Width = q.get("width") === "desktop" ? "desktop" : "phone";
  const occasion = OFFERED_OCCASIONS.find((o) => o.slug === q.get("occasion"))?.slug ?? null;
  return {
    format,
    mode,
    width,
    occasion,
    occasions: OFFERED_OCCASIONS.map((o) => ({ slug: o.slug, name: o.name })),
    looks: TEMPLATES.map((t) => ({ slug: t.slug, name: t.name, natural: t.natural ?? "shopping" })),
  };
}

export function headers() {
  return { "X-Robots-Tag": "noindex", "Cache-Control": "private, no-store" };
}

export function meta() {
  return [{ title: "Looks, side by side · The Want MCP" }, { name: "robots", content: "noindex" }];
}

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: "/theme-css/next/compare.css" }];

const BETTER: Record<Better, string> = { next: "Redesigned", current: "Current", even: "Even" };

export default function Compare({ loaderData }: Route.ComponentProps) {
  const { format, mode, width, occasion, occasions, looks } = loaderData;
  const href = (over: { format?: ListFormat | null; mode?: Appearance | null; width?: Width; occasion?: string | null }) => {
    const next = { format, mode, width, occasion, ...over };
    const p = new URLSearchParams();
    if (next.format) p.set("format", next.format);
    if (next.mode) p.set("mode", next.mode);
    if (next.width === "desktop") p.set("width", "desktop");
    if (next.occasion) p.set("occasion", next.occasion);
    const s = p.toString();
    return s ? `?${s}` : "/themes/compare";
  };
  const notes = new Map(LOOK_NOTES.map((n) => [n.slug, n]));
  return (
    <div className="cmp">
      <div className="wrap cmp-top">
        <h1 className="cmp-h1">The looks, side by side</h1>
        <p className="cmp-lede">Each look as it is today, beside a redesign of it. Both show the same sample list.</p>

        {LOOK_NOTES.length > 0 && (
          <section aria-labelledby="cmp-verdict-h" className="cmp-summary">
            <h2 id="cmp-verdict-h" className="cmp-h2">Which is better</h2>
            <p className="cmp-rec">{SUMMARY.recommendation}</p>
            <p className="cmp-rec">{SUMMARY.caveat}</p>
            <table className="cmp-table">
              <thead>
                <tr>
                  <th scope="col">Look</th>
                  <th scope="col">Better</th>
                  <th scope="col">Why</th>
                </tr>
              </thead>
              <tbody>
                {looks.map((l) => {
                  const n = notes.get(l.slug);
                  if (!n) return null;
                  return (
                    <tr key={l.slug}>
                      <th scope="row">
                        <a href={`#look-${l.slug}`} className="link">
                          {l.name}
                        </a>
                      </th>
                      <td>
                        <span className={`cmp-better is-${n.better}`}>{BETTER[n.better]}</span>
                      </td>
                      <td>{n.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>

      <nav aria-label="What the frames show" className="cmp-controls">
        <div className="wrap cmp-controls-row">
          <Group label="Kind of list">
            <Choice to={href({ format: null })} on={format === null}>
              Best fit
            </Choice>
            {Object.values(FORMATS).map((f) => (
              <Choice key={f.format} to={href({ format: f.format })} on={format === f.format}>
                {f.label}
              </Choice>
            ))}
          </Group>
          <Group label="Appearance">
            <Choice to={href({ mode: null })} on={mode === null}>
              Device
            </Choice>
            <Choice to={href({ mode: "light" })} on={mode === "light"}>
              Light
            </Choice>
            <Choice to={href({ mode: "dark" })} on={mode === "dark"}>
              Dark
            </Choice>
          </Group>
          <Group label="Width">
            <Choice to={href({ width: "phone" })} on={width === "phone"}>
              Phone
            </Choice>
            <Choice to={href({ width: "desktop" })} on={width === "desktop"}>
              Desktop
            </Choice>
          </Group>
          {/* A plain form: the choice applies with its button, with or without JavaScript. */}
          <Form method="get" className="cmp-group" preventScrollReset replace>
            {format && <input type="hidden" name="format" value={format} />}
            {mode && <input type="hidden" name="mode" value={mode} />}
            {width === "desktop" && <input type="hidden" name="width" value="desktop" />}
            <label className="cmp-group-label" htmlFor="cmp-occasion">
              Occasion
            </label>
            <span className="cmp-occasion">
              <select id="cmp-occasion" name="occasion" defaultValue={occasion ?? ""} key={occasion ?? "none"} className="select cmp-select">
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
        </div>
      </nav>

      <div className="wrap cmp-pairs">
        {looks.map((l) => {
          const n = notes.get(l.slug);
          const slug = occasion ? `${l.slug}--${occasion}` : l.slug;
          const kind = format ?? l.natural;
          const src = (version: "current" | "next") => framePath(version, slug, { format: kind, mode });
          return (
            <section key={l.slug} id={`look-${l.slug}`} aria-labelledby={`look-${l.slug}-h`} className="cmp-pair">
              <header className="cmp-pair-head">
                <h2 id={`look-${l.slug}-h`} className="cmp-h2">
                  {l.name}
                </h2>
                {n && <p className="cmp-caption">{n.caption}</p>}
              </header>
              <div className={`cmp-frames is-${width}`}>
                {(["current", "next"] as const).map((version) => {
                  const label = version === "current" ? "Current" : "Redesigned";
                  return (
                    <figure key={version} className="cmp-side">
                      <figcaption className="cmp-side-head">
                        <span className="cmp-side-name">{label}</span>
                        <a href={src(version)} className="link cmp-open">
                          Open<span className="sr-only"> {l.name}, {label.toLowerCase()}, on its own</span>
                        </a>
                      </figcaption>
                      <div className="cmp-device">
                        <iframe key={src(version)} src={src(version)} title={`${l.name}, ${label.toLowerCase()}`} loading="lazy" className="cmp-iframe" />
                      </div>
                    </figure>
                  );
                })}
              </div>
              {n && (
                <div className="cmp-review">
                  <p className="cmp-verdict">
                    <span className={`cmp-better is-${n.better}`}>{n.better === "even" ? "Even" : `${BETTER[n.better]} is better`}</span> {n.reason}
                  </p>
                  <div className="cmp-findings">
                    <div>
                      <h3 className="cmp-h3">
                        Design critique <span className="cmp-score">{n.score[0]} → {n.score[1]} of 24</span>
                      </h3>
                      <ul className="cmp-list">
                        {n.critique.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="cmp-h3">The seven questions</h3>
                      <ul className="cmp-list">
                        {n.questions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })}

        {LOOK_NOTES.length > 0 && (
          <section aria-labelledby="cmp-ship-h" className="cmp-end">
            <h2 id="cmp-ship-h" className="cmp-h2">What it would take to ship</h2>
            <ul className="cmp-list">
              {SUMMARY.ship.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <h3 className="cmp-h3">Not tested</h3>
            <ul className="cmp-list">
              {SUMMARY.untested.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <p className="cmp-credit">
              The redesign and the critique follow the method of{" "}
              <a href="https://github.com/pbakaus/impeccable" className="link">
                Impeccable
              </a>{" "}
              (Apache 2.0), a design skill for coding agents. None of its files are in this site.
            </p>
          </section>
        )}
        <p className="cmp-back">
          <Link to="/themes" className="link">
            All looks
          </Link>
        </p>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="cmp-group">
      <span className="cmp-group-label" aria-hidden="true">
        {label}
      </span>
      <span className="cmp-choices">{children}</span>
    </div>
  );
}

function Choice({ to, on, children }: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link to={to} replace preventScrollReset aria-current={on ? "true" : undefined} className={`cmp-choice ${on ? "is-on" : ""}`}>
      {children}
    </Link>
  );
}
