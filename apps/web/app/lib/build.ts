/**
 * Keeping an open tab working across a deploy.
 *
 * Every response from the Worker carries `X-Build-Id`. When a same-origin response names a
 * different build, this tab's JavaScript is out of date: its route chunks may no longer exist on
 * the server. From then on:
 *   - internal link clicks become full page loads (not client-side navigations),
 *   - the live poller stops revalidating, and
 *   - the page reloads quietly the next time the tab is focused, unless a form holds unsaved text.
 *
 * React Router also reloads the page itself when a route module fails to import, but it reloads
 * the page you are on, not the one you clicked. `rememberTarget` records where a navigation was
 * going so that reload can carry on to it.
 */
export const BUILD_ID: string = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";
export const BUILD_HEADER = "X-Build-Id";

let stale = false;
let hydrated = false;
let lastErrorRef: string | null = null;

/** Set once the app has mounted; an error boundary rendered before that is the server's error page. */
export function markHydrated() {
  hydrated = true;
}
export function isHydrated() {
  return hydrated;
}
/** The reference of the last same-origin response that failed with a 5xx (the server logged it). */
export function takeLastErrorRef(): string | null {
  const r = lastErrorRef;
  lastErrorRef = null;
  return r;
}
const listeners = new Set<() => void>();

export function isStale() {
  return stale;
}

export function onStale(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function markStale() {
  if (stale) return;
  stale = true;
  for (const fn of listeners) fn();
}

/** Looks at a response from our own server; marks the tab stale if it came from another build. */
export function checkBuild(res: Response) {
  const id = res.headers.get(BUILD_HEADER);
  if (id && id !== BUILD_ID) markStale();
}

const PENDING = "wm_pending_nav";

export function rememberTarget(href: string) {
  try {
    sessionStorage.setItem(PENDING, JSON.stringify({ href, at: Date.now() }));
  } catch {
    // Private mode or storage disabled: nothing to resume.
  }
}

export function forgetTarget() {
  try {
    sessionStorage.removeItem(PENDING);
  } catch {
    // ignore
  }
}

function hasUnsavedInput() {
  for (const el of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio])")) {
    if (el.value !== el.defaultValue) return true;
  }
  return false;
}

let installed = false;

/** Installs the guards once, on hydration. */
export function installBuildGuard() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // A reload React Router did after a failed route import: continue to where the click was going.
  try {
    const raw = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (raw && nav?.type === "reload") {
      const { href, at } = JSON.parse(raw) as { href: string; at: number };
      const target = new URL(href, location.href);
      if (Date.now() - at < 15_000 && target.origin === location.origin && target.href !== location.href) {
        location.replace(target.href);
        return;
      }
    }
  } catch {
    // ignore
  }

  // Watch our own responses (data loads, route discovery, the live poll) for a new build.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await nativeFetch(input, init);
    try {
      const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
      if (url.origin === location.origin) {
        checkBuild(res);
        if (res.status >= 500) lastErrorRef = res.headers.get("X-Request-Ref");
      }
    } catch {
      // ignore
    }
    return res;
  };

  // Once stale, internal links load the whole page. Capture phase on window runs before React's
  // listener on the root, and stopping propagation there leaves the browser's default navigation.
  window.addEventListener(
    "click",
    (e) => {
      if (!stale || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      e.stopPropagation();
    },
    true,
  );

  // A lazily imported chunk that has gone: load the page fresh instead of throwing.
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    markStale();
    location.reload();
  });

  const reloadIfQuiet = () => {
    if (stale && document.visibilityState === "visible" && !hasUnsavedInput()) location.reload();
  };
  onStale(() => {
    // Wait for the next time the tab is brought back rather than reloading under the reader.
    document.addEventListener("visibilitychange", reloadIfQuiet);
    window.addEventListener("focus", reloadIfQuiet);
  });
}
