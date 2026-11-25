import { redirect } from "react-router";
import type { Route } from "./+types/redirects";

/** Addresses people type by hand: /account and /settings live under /app. */
const TO: Record<string, string> = { "/account": "/app/account", "/settings": "/app/account" };

export function loader({ request }: Route.LoaderArgs) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  throw redirect(TO[path] ?? "/app", 301);
}
