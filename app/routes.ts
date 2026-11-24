import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("l/:id", "routes/list.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("app", "routes/app.tsx"),
  route("app/account", "routes/account.tsx"),
  route("app/lists/:id/settings", "routes/settings.tsx"),
  route("invite/:token", "routes/invite.tsx"),
  route("connect", "routes/connect.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
  route("report", "routes/report.tsx"),
  route("theme", "routes/theme.tsx"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
