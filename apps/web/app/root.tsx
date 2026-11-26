import { useEffect, useState } from "react";
import { useRememberRef } from "~/lib/ref";
import {
  data,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useLocation,
  useMatches,
  useNavigation,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { Wordmark } from "./components/Logo";
import { STYLESHEET_GUARD, useNonce } from "./lib/nonce";
import { feedbackAbout } from "./lib/feedback";
import { getUser } from "./lib/auth.server";
import { mcpUrl, siteOrigin, sourceUrl, webAnalyticsToken } from "./lib/config.server";
import { BUILD_ID, forgetTarget, installBuildGuard, isHydrated, markHydrated, rememberTarget, takeLastErrorRef } from "./lib/build";
import { newRef } from "./lib/telemetry";
import { currentTrace } from "./lib/trace.server";
import { useRootData } from "./lib/hooks";
import { clearSessionCookie, getSessionToken, readCookie } from "./lib/session.server";

export const links: Route.LinksFunction = () => [
  // The .ico first for browsers that ask for it; the SVG (with its dark-mode colours) for those that take it.
  { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  // The home-screen icon (iOS): opaque, 180px.
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  const t = readCookie(request, "wm_theme");
  const theme = t === "light" || t === "dark" ? t : "system";
  // The cookie names a session the API no longer knows: drop it.
  const headers = !user && getSessionToken(request) ? { "set-cookie": clearSessionCookie(request) } : undefined;
  // ref: this request's reference, shown if the page turns out to be an error page.
  return data(
    { user, now: Date.now(), theme, mcpUrl: mcpUrl(), origin: siteOrigin(request), sourceUrl: sourceUrl(), ref: currentTrace()?.ref ?? null, analytics: webAnalyticsToken() },
    { headers },
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const root = useRouteLoaderData<typeof loader>("root");
  const theme = root?.theme ?? "system";
  const nonce = useNonce();
  return (
    <html lang="en-US" data-theme={theme === "system" ? undefined : theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#fbfbfd" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        {/* Before the stylesheets (an inline script after a pending stylesheet would run only once it had failed): reload
            once if one of ours is missing (a deploy's in-between moment). Rendered on both sides so <head> hydrates in
            order; the nonce exists on the server only, where the script runs. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: STYLESHEET_GUARD }} />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
        <AnalyticsBeacon token={root?.analytics ?? null} />
      </body>
    </html>
  );
}


/** `minimal` (sign-in): the wordmark only, so the one thing on the page is the email field. */
function Header({ minimal = false }: { minimal?: boolean }) {
  const { user } = useRootData();
  const nav = useNavigation();
  // "Lists" is current where the Lists tab is: the lists page and a list's own pages. On Activity, Skills and Account
  // their own tab or link says where you are, so the header doesn't claim a second "you are here".
  const { pathname } = useLocation();
  const listsOn = pathname === "/app" || pathname === "/app/" || pathname.startsWith("/app/new") || pathname.startsWith("/app/lists/");
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap px-1.5 py-2.5 text-[0.92rem] font-medium sm:px-3 ${isActive ? "text-ink underline decoration-1 underline-offset-[6px]" : "text-ink-2 hover:text-ink"}`;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 origin-left bg-want transition-transform duration-500 ${nav.state === "idle" ? "scale-x-0" : "scale-x-75"}`}
      />
      <div className="wrap flex h-16 items-center gap-1 sm:gap-2">
        {/* `flex`, not an inline box: an inline box leaves room for descenders under the mark and
            lifts it 3px above the links beside it. */}
        <Link to="/" className="mr-auto flex flex-none items-center rounded-md py-1" aria-label="The Want MCP, home">
          {/* Very narrow screens: the mark alone, so the links keep one row. */}
          <Wordmark textClass={user ? "max-[339px]:sr-only" : ""} />
        </Link>
        {!minimal && (
        <>
        <nav aria-label="Main" className="flex flex-none items-center gap-0.5 sm:gap-1">
          <NavLink to="/connect" className={navCls}>
            Connect
          </NavLink>
          {user ? (
            <>
              <Link to="/app" className={navCls({ isActive: listsOn })} aria-current={listsOn ? "page" : undefined}>
                Lists
              </Link>
              <NavLink to="/app/account" className={navCls}>
                Account
              </NavLink>
            </>
          ) : (
            <NavLink to="/login" className={navCls}>
              Sign in
            </NavLink>
          )}
        </nav>
        {!user && (
          // From 640px up; on phones the page's own "Start a list" is the primary.
          <Link to="/login?next=/app/new" className="ml-1 hidden flex-none whitespace-nowrap rounded-full bg-want px-4 py-2 text-[0.88rem] font-semibold text-want-ink sm:inline-flex">
            Start a list
          </Link>
        )}
        </>
        )}
      </div>
    </header>
  );
}

function Footer() {
  const { sourceUrl } = useRootData();
  // The page the person was on, as a page name only (feedbackAbout drops tokens, ids and query strings).
  const about = feedbackAbout(useLocation().pathname);
  return (
    <footer className="mt-16 flex-1 border-t border-line bg-sunk">
      <div className="wrap flex flex-col gap-4 py-10 text-[0.88rem] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        {/* One wrapping row of short links on a phone; the trademark line small beneath. */}
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-3.5 gap-y-0 sm:gap-x-6">
          <Link to="/connect" className="link footer-link">Connect</Link>
          <Link to="/for" className="link footer-link">Ideas</Link>
          <Link to="/privacy" className="link footer-link">Privacy</Link>
          <Link to="/terms" className="link footer-link">Terms</Link>
          <Link to={about && about !== "/feedback" ? `/feedback?from=${encodeURIComponent(about)}` : "/feedback"} className="link footer-link">Feedback</Link>
        </nav>
      </div>
      {/* Five links keep one row on a 360px phone with any system font; the source link sits with the small print. */}
      <p className="wrap -mt-4 pb-8 text-[0.72rem] text-ink-3">
        {sourceUrl && (
          <>
            <a href={sourceUrl} className="link">
              Source code
            </a>{" "}
            (MIT).{" "}
          </>
        )}
        Logos are their owners' trademarks; The Want MCP isn't affiliated with them.
      </p>
    </footer>
  );
}

/**
 * Cloudflare Web Analytics: counts page views without cookies. Loaded only when the token is set
 * and only on pages that opt in with `handle.analytics` (never /app, sign-in, settings, private
 * lists or anything with a key on screen). `spa: false` because the script keeps hooking history after
 * the tag is removed, which would count client-side navigations onto those pages.
 */
function AnalyticsBeacon({ token }: { token: string | null }) {
  const matches = useMatches();
  const leaf = matches.at(-1);
  const opt = (leaf?.handle as { analytics?: boolean | ((data: unknown) => boolean) } | undefined)?.analytics;
  const allowed = typeof opt === "function" ? opt(leaf?.loaderData) : opt === true;
  if (!token || !allowed) return null;
  return <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token, spa: false })} />;
}

/** See app/lib/build.ts: keeps a tab that was open across a deploy off the error page. */
function BuildGuard() {
  const navigation = useNavigation();
  useEffect(() => {
    installBuildGuard();
    markHydrated();
  }, []);
  useEffect(() => {
    const to = navigation.location;
    if (navigation.state === "loading" && to) rememberTarget(to.pathname + to.search + to.hash);
    else if (navigation.state === "idle") forgetTarget();
  }, [navigation.state, navigation.location]);
  return null;
}

export default function App() {
  useRememberRef();
  // Sign-in shows no navigation or footer: nothing to do there but sign in.
  const minimal = useMatches().at(-1)?.id === "routes/login";
  return (
    <>
      <Header minimal={minimal} />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      {!minimal && <Footer />}
      <BuildGuard />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let status = 500;
  let title = "Something went wrong";
  let details = "Try again in a moment.";
  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = "Nothing here";
      details = "This page doesn't exist, or it isn't shared with you.";
    } else if (status === 503) {
      title = "We can't reach the API";
      details = typeof error.data === "string" ? error.data : details;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }
  const ref = useErrorRef(status, error);
  const signedIn = !!useRouteLoaderData<typeof loader>("root")?.user;
  const here = useLocation().pathname;
  return (
    <>
      <title>{`${title} · The Want MCP`}</title>
      <meta name="robots" content="noindex" />
      <Header />
      <main id="main" className="wrap py-24">
        <p className="eyebrow">Error {status}</p>
        <h1 className="serif mt-2 text-[2.5rem] leading-tight sm:text-[3rem]">{title}</h1>
        <p className="mt-4 max-w-prose text-ink-2">{details}</p>
        {status >= 500 && ref && (
          <p className="mt-3 text-[0.9rem] text-ink-3">
            Reference: <code className="font-semibold text-ink">{ref}</code>
          </p>
        )}
        {/* Full page loads, not client-side route changes: after a deploy the open tab may hold an old build. */}
        {status === 404 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={signedIn ? "/app/new" : "/login?next=/app/new"} className="btn btn-want">
              Start a list
            </a>
            {signedIn ? (
              <a href="/app" className="btn">
                Your lists
              </a>
            ) : (
              // A private list someone was sent looks like this page: signing in may be all it takes.
              <a href={`/login?next=${encodeURIComponent(here)}`} className="btn">
                Sign in
              </a>
            )}
          </div>
        ) : (
          <a href="/" className="btn mt-8">
            Go home
          </a>
        )}
      </main>
      <Footer />
      <RecoverOnce active={status >= 500} />
    </>
  );
}

/**
 * The reference shown on an error page, so a screenshot can be matched to a log line.
 * - The server's error page: the reference of the request that rendered it (the Worker logged it).
 * - A failed data load during navigation: the reference of that response (the Worker logged it).
 * - An error that only happened in the browser: a new reference, reported once to /telemetry/error.
 */
function useErrorRef(status: number, error: unknown): string | null {
  const root = useRouteLoaderData<typeof loader>("root");
  const matches = useMatches();
  const [ref, setRef] = useState<string | null>(root?.ref ?? null);
  useEffect(() => {
    if (!isHydrated()) return; // the server rendered this error page and logged it
    if (status < 500) return; // 4xx is a routine answer, not a fault
    const fromServer = takeLastErrorRef();
    if (fromServer) {
      setRef(fromServer);
      return;
    }
    const r = newRef();
    setRef(r);
    const body = JSON.stringify({
      ref: r,
      route: location.pathname,
      status,
      name: error instanceof Error ? error.name : isRouteErrorResponse(error) ? "RouteErrorResponse" : "Error",
      build: BUILD_ID,
    });
    try {
      navigator.sendBeacon?.("/telemetry/error", new Blob([body], { type: "application/json" })) ||
        fetch("/telemetry/error", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    } catch {
      // Reporting is best effort.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.at(-1)?.id]);
  return ref;
}

/**
 * A tab that was open across a deploy can fail on its next client-side navigation or background refresh,
 * because the build it loaded no longer matches the server. Reload the document once to pick up the
 * current build. Guarded by a timestamp so a real server error cannot cause a reload loop.
 */
function RecoverOnce({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    try {
      const key = "wm_recovered_at";
      const last = Number(window.sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last > 60_000) {
        window.sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // sessionStorage unavailable: leave the error page as it is.
    }
  }, [active]);
  return null;
}
