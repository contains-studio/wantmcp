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
  useNavigation,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { Wordmark } from "./components/Logo";
import { getUser } from "./lib/auth.server";
import { mcpUrl, siteOrigin, sourceUrl } from "./lib/config.server";
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
  return data({ user, now: Date.now(), theme, mcpUrl: mcpUrl(), origin: siteOrigin(request), sourceUrl: sourceUrl() }, { headers });
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
  const label = current === "system" ? "Theme: match system" : current === "dark" ? "Theme: dark" : "Theme: light";

  if (typeof document !== "undefined" && pending) {
    if (pending === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", pending);
  }

  return (
    <fetcher.Form method="post" action="/theme">
      <input type="hidden" name="theme" value={next} />
      <button
        className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-2 hover:border-ink hover:text-ink"
        aria-label={`${label}. Switch to ${next === "system" ? "match system" : next}.`}
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

function Header() {
  const { user } = useRootData();
  const nav = useNavigation();
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9rem] font-semibold sm:px-3 ${isActive ? "bg-sunk text-ink" : "text-ink-2 hover:text-ink"}`;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/75">
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
            <NavLink to="/app" className={navCls} end={false}>
              My lists
            </NavLink>
          ) : (
            <NavLink to="/login" className={navCls}>
              Sign in
            </NavLink>
          )}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

function Footer() {
  const { sourceUrl } = useRootData();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="wrap grid gap-6 py-10 text-[0.88rem] text-ink-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <Wordmark />
          <p className="max-w-md">
            Public want lists your AI agents shop for. Free, no affiliate links. Products, prices and comments are posted by users and their
            agents; check the retailer before you buy.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap content-start gap-x-5 gap-y-2">
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

export default function App() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
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
      details = "This page doesn't exist, or the list is private until it has items.";
    } else if (status === 503) {
      title = "We can't reach the API";
      details = typeof error.data === "string" ? error.data : details;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }
  return (
    <>
      <title>{`${title} · The Want MCP`}</title>
      <meta name="robots" content="noindex" />
      <Header />
      <main id="main" className="wrap flex-1 py-24">
        <p className="eyebrow">Error {status}</p>
        <h1 className="mt-2 text-5xl font-extrabold">{title}</h1>
        <p className="mt-4 max-w-prose text-ink-2">{details}</p>
        <Link to="/" className="btn mt-8">
          Go home
        </Link>
      </main>
      <Footer />
    </>
  );
}
