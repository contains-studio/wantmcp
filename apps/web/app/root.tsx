import { useEffect, useState } from "react";
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
import { getUser } from "./lib/auth.server";
import { mcpUrl, siteOrigin, sourceUrl, webAnalyticsToken } from "./lib/config.server";
import { BUILD_ID, forgetTarget, installBuildGuard, isHydrated, markHydrated, rememberTarget, takeLastErrorRef } from "./lib/build";
import { newRef } from "./lib/telemetry";
import { currentTrace } from "./lib/trace.server";
import { useRootData } from "./lib/hooks";
import { clearSessionCookie, getSessionToken, readCookie } from "./lib/session.server";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
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
  return (
    <html lang="en-GB" data-theme={theme === "system" ? undefined : theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f7f2ea" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#15110f" media="(prefers-color-scheme: dark)" />
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

function ThemeToggle() {
  const { theme } = useRootData();
  const fetcher = useFetcher();
  const pending = fetcher.formData?.get("theme") as string | undefined;
  const current = pending ?? theme;
  const next = current === "system" ? "dark" : current === "dark" ? "light" : "system";
  const label = current === "system" ? "Appearance: system" : current === "dark" ? "Appearance: dark" : "Appearance: light";

  if (typeof document !== "undefined" && pending) {
    if (pending === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", pending);
  }

  return (
    <fetcher.Form method="post" action="/theme">
      <input type="hidden" name="theme" value={next} />
      <button
        className="grid h-10 w-10 place-items-center rounded border border-transparent text-ink-2 hover:border-line hover:text-ink"
        aria-label={`${label}. Switch to ${next}.`}
        title={label}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          {current === "dark" ? (
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
          ) : current === "light" ? (
            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </g>
          ) : (
            <g>
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
            </g>
          )}
        </svg>
      </button>
    </fetcher.Form>
  );
}

/** "My lists", with how many questions wait on the person (SPEC 12.1). Loaded after the page so it never slows it. */
function MyListsLink({ className }: { className: (s: { isActive: boolean }) => string }) {
  const fetcher = useFetcher<{ count: number }>();
  const location = useLocation();
  useEffect(() => {
    fetcher.load("/waiting");
    // Reload on navigation: answering a question changes the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);
  const count = fetcher.data?.count ?? 0;
  return (
    <NavLink to="/app" className={className} end={false}>
      My lists
      {count > 0 && (
        <>
          <span className="sr-only">,</span>
          <span className="ml-1.5 inline-grid min-w-5 place-items-center rounded-[3px] bg-ink px-1 text-[0.72rem] font-semibold text-paper">{count}</span>
          <span className="sr-only"> waiting on you</span>
        </>
      )}
    </NavLink>
  );
}

function Header() {
  const { user } = useRootData();
  const nav = useNavigation();
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap px-2 py-2.5 text-[0.92rem] font-medium sm:px-3 ${isActive ? "text-ink underline decoration-1 underline-offset-[6px]" : "text-ink-2 hover:text-ink"}`;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 origin-left bg-want transition-transform duration-500 ${nav.state === "idle" ? "scale-x-0" : "scale-x-75"}`}
      />
      <div className="wrap flex h-16 items-center gap-1 sm:gap-2">
        <Link to="/" className="mr-auto rounded-md py-1" aria-label="The Want MCP, home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1">
          <NavLink to="/connect" className={navCls}>
            Connect
          </NavLink>
          {user ? (
            <MyListsLink className={navCls} />
          ) : (
            <NavLink to="/login" className={navCls}>
              Sign in
            </NavLink>
          )}
        </nav>
        <ThemeToggle />
        {!user && (
          // The one small pill on the site.
          <Link to="/login" className="ml-1 hidden rounded-full bg-want px-4 py-2 text-[0.88rem] font-semibold text-want-ink sm:inline-flex">
            Start a list
          </Link>
        )}
      </div>
    </header>
  );
}

function Footer() {
  const { sourceUrl } = useRootData();
  return (
    <footer className="mt-24 border-t border-line bg-sunk">
      <div className="wrap grid gap-6 py-12 text-[0.88rem] text-ink-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-3">
          <Wordmark />
          <p className="max-w-md">Free, no affiliate links. Posted by people and their agents: check the source before you rely on it.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap content-start gap-x-6 gap-y-2">
          <Link to="/connect" className="link">Connect an agent</Link>
          <Link to="/privacy" className="link">Privacy</Link>
          <Link to="/terms" className="link">Terms</Link>
          {sourceUrl && (
            <a href={sourceUrl} className="link">
              Source (MIT)
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}

/**
 * Cloudflare Web Analytics: counts page views without cookies. Loaded only when the token is set
 * and only on pages that opt in with `handle.analytics` (never /app, sign-in, settings, private
 * lists or anything with a key on screen).
 */
function AnalyticsBeacon({ token }: { token: string | null }) {
  const matches = useMatches();
  const leaf = matches.at(-1);
  const opt = (leaf?.handle as { analytics?: boolean | ((data: unknown) => boolean) } | undefined)?.analytics;
  const allowed = typeof opt === "function" ? opt(leaf?.loaderData) : opt === true;
  if (!token || !allowed) return null;
  return <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token })} />;
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
  return (
    <>
      <Header />
      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
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
  return (
    <>
      <title>{`${title} · The Want MCP`}</title>
      <meta name="robots" content="noindex" />
      <Header />
      <main id="main" className="wrap flex-1 py-24">
        <p className="eyebrow">Error {status}</p>
        <h1 className="mt-2 text-5xl font-extrabold">{title}</h1>
        <p className="mt-4 max-w-prose text-ink-2">{details}</p>
        {status >= 500 && ref && (
          <p className="mt-3 text-[0.9rem] text-ink-3">
            Reference: <code className="font-semibold text-ink">{ref}</code>
          </p>
        )}
        {/* A full page load, not a client-side route change: after a deploy the open tab may hold an old build. */}
        <a href="/" className="btn mt-8">
          Go home
        </a>
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
