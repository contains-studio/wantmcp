import type { Route } from "./+types/sitemap";
import { api } from "~/lib/api.server";
import { siteOrigin } from "~/lib/config.server";
import { PERSONAS } from "~/lib/personas.server";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

export async function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request);
  const { lists } = await api<{ lists: Array<{ id: string; updated_at: string }> }>(request, "/sitemap", { anonymous: true });
  const urls = [
    `<url><loc>${origin}/</loc><changefreq>hourly</changefreq></url>`,
    `<url><loc>${origin}/connect</loc></url>`,
    `<url><loc>${origin}/themes</loc></url>`,
    `<url><loc>${origin}/for</loc></url>`,
    // Persona pages marked noindex stay out until the owner confirms them.
    ...PERSONAS.filter((p) => p.index).map((p) => `<url><loc>${esc(`${origin}/for/${p.slug}`)}</loc></url>`),
    ...lists.map((l) => `<url><loc>${esc(`${origin}/l/${encodeURIComponent(l.id)}`)}</loc><lastmod>${esc(l.updated_at)}</lastmod></url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=900" } });
}
