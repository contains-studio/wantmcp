/**
 * Open Graph share images, rendered on the Worker with Satori + resvg (WASM) via @cf-wasm/og.
 * No headless browser. 1200x630 PNG in the site's identity.
 *
 *   /og/home.png       the home page card
 *   /og/l/{id}.png     a list card: title, owner, item count, cheapest current price
 *
 * Responses are cached in the Workers Cache API. Any error falls back to the static
 * /og.png (a saved render of the home card).
 */
import { cache, CustomFont, ImageResponse } from "@cf-wasm/og/workerd";
import inter300 from "@fontsource/inter/files/inter-latin-300-normal.woff?inline";
import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff?inline";
import inter500 from "@fontsource/inter/files/inter-latin-500-normal.woff?inline";
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff?inline";
import { api } from "../app/lib/api.server";
import { formatMoney } from "../app/lib/format";
import type { ListDetail } from "../app/lib/types";
import { resolveLook } from "../app/themes/catalogue.server";
import { lookColors } from "../app/themes/view";
import { SITE } from "../app/themes/site";

/** The site's light palette (app/themes/site.ts): soft neutrals, near-black ink, the one accent for the mark. */
const C = SITE.light;

const TAG_SVG =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h9.36a2.5 2.5 0 0 1 1.77.73l10.6 10.6a2.5 2.5 0 0 1 0 3.54l-9.36 9.36a2.5 2.5 0 0 1-3.54 0L4.73 17.63A2.5 2.5 0 0 1 4 15.86Z" fill="${C.want}"/><path d="M10.4 8.2c.9 0 1.6.6 1.9 1.3.3-.7 1-1.3 1.9-1.3 1.2 0 2 .9 2 2.1 0 1.9-2.4 3.3-3.9 4.4-1.5-1.1-3.9-2.5-3.9-4.4 0-1.2.8-2.1 2-2.1Z" fill="#fff"/></svg>`,
  );

function dataUrlToBuffer(dataUrl: string): ArrayBuffer {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

const fonts = () => [
  new CustomFont("Inter", dataUrlToBuffer(inter300), { weight: 300 }),
  new CustomFont("Inter", dataUrlToBuffer(inter400), { weight: 400 }),
  new CustomFont("Inter", dataUrlToBuffer(inter500), { weight: 500 }),
  new CustomFont("Inter", dataUrlToBuffer(inter600), { weight: 600 }),
];

type Colors = typeof C;

/** The share card takes the look's palette (light, unless the look is always dark) and the occasion's art. */
function themeColors(slug: string | null | undefined): { colors: Colors; motif: string | null } {
  const { template, occasion } = resolveLook(slug);
  if (template.slug === "default" && !occasion) return { colors: C, motif: null };
  const p = lookColors(template, occasion, "light").palette;
  const colors: Colors = p;
  const motif = occasion?.art ? "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(occasion.art))) : null;
  return { colors, motif };
}

function Frame({ children, colors = C, motif = null }: { children: React.ReactNode; colors?: Colors; motif?: string | null }) {
  const C = colors;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: C.paper,
        padding: "64px 72px",
        fontFamily: "Inter",
        color: C.ink,
        position: "relative",
      }}
    >
      {/* the occasion's motif, if the look has one; no glows or washes */}
      {motif && <img src={motif} width={560} height={420} style={{ position: "absolute", right: 0, top: 10 }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img src={TAG_SVG} width={48} height={48} />
        <div style={{ display: "flex", fontSize: 32, fontWeight: 600, letterSpacing: -0.6 }}>The Want MCP</div>
      </div>
      {children}
    </div>
  );
}

function HomeCard() {
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 64, maxWidth: 1056 }}>
        <div style={{ display: "flex", fontSize: 78, fontWeight: 600, lineHeight: 1.06, letterSpacing: -2.2 }}>An MCP server for getting what you want.</div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 30, color: C.ink2, fontWeight: 400 }}>
          Things to buy, to get done, to find out. Your agents work on them.
        </div>
      </div>
      <div style={{ display: "flex", marginTop: "auto", alignItems: "center", gap: 16, fontSize: 24, color: C.ink3, fontWeight: 500 }}>
        <span>wantmcp.com</span>
        <span>·</span>
        <span>Free, no affiliate links</span>
      </div>
    </Frame>
  );
}

function ListCard({ list }: { list: ListDetail }) {
  const { colors: C, motif } = themeColors(list.theme);
  const listed = list.items.flatMap((it) => (it.purchase ? [] : it.entries.filter((e) => e.status === "listed")));
  const priced = listed.filter((e) => e.current_price);
  const currency = priced[0]?.current_price?.currency;
  const sameCurrency = priced.filter((e) => e.current_price!.currency === currency);
  const cheapest = sameCurrency.length
    ? sameCurrency.reduce((a, b) => (Number(b.current_price!.price) < Number(a.current_price!.price) ? b : a))
    : null;
  const wanted = list.items.filter((i) => !i.purchase).length;
  const title = list.title.length > 70 ? list.title.slice(0, 69) + "…" : list.title;
  const titleSize = title.length > 40 ? 64 : 84;

  return (
    <Frame colors={C} motif={motif}>
      <div style={{ display: "flex", marginTop: 56, fontSize: 22, color: C.ink3, fontWeight: 500, letterSpacing: 2 }}>
        A WANT LIST BY {list.owner_handle.toUpperCase()}
      </div>
      <div style={{ display: "flex", marginTop: 16, fontSize: titleSize, fontWeight: 600, lineHeight: 1.06, letterSpacing: -2.2, maxWidth: 1000 }}>
        {title}
      </div>
      <div style={{ display: "flex", marginTop: "auto", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 28, color: C.ink2, fontWeight: 400 }}>
          <span>
            {wanted} {wanted === 1 ? "thing" : "things"} wanted
          </span>
          <span>
            {listed.length} {listed.length === 1 ? "product" : "products"} found by agents
          </span>
        </div>
        {cheapest && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              background: C.card,
              borderRadius: 18,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
              padding: "20px 28px",
            }}
          >
            <span style={{ fontSize: 20, color: C.ink3, fontWeight: 500, letterSpacing: 2 }}>PRICES FROM</span>
            <span style={{ fontSize: 68, fontWeight: 400, letterSpacing: -2, lineHeight: 1.1 }}>
              {formatMoney(cheapest.current_price!.price, cheapest.current_price!.currency)}
            </span>
          </div>
        )}
      </div>
    </Frame>
  );
}

const PATH = /^\/og\/(home|l\/([A-Za-z0-9_-]{1,64}))\.png$/;

export function isOgPath(pathname: string) {
  return PATH.test(pathname);
}

export async function handleOg(request: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const edge = (caches as unknown as { default: Cache }).default;
  try {
    const hit = await edge.match(cacheKey);
    if (hit) return hit;
  } catch {
    // Cache API unavailable (some local setups); render anyway.
  }

  try {
    cache.setExecutionContext(ctx);
    const m = PATH.exec(url.pathname)!;
    let element: React.ReactElement;
    if (m[1] === "home") {
      element = <HomeCard />;
    } else {
      // Always anonymous: a private list is not_found here, so it falls back to the generic image.
      const list = await api<ListDetail>(request, `/lists/${encodeURIComponent(m[2])}`, { anonymous: true });
      if (list.visibility === "private") throw new Error("private list");
      element = <ListCard list={list} />;
    }
    const image = await ImageResponse.async(element, { width: 1200, height: 630, fonts: fonts() });
    const res = new Response(image.body, {
      status: 200,
      headers: {
        "content-type": "image/png",
        // The page links include ?v=<updated_at>, so a list change produces a new URL. Kept short
        // so a list switched to private stops being shown from any cache within minutes.
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    });
    try {
      ctx.waitUntil(edge.put(cacheKey, res.clone()));
    } catch {
      // ignore cache failures
    }
    return res;
  } catch (err) {
    console.error("OG image failed", url.pathname, err);
    return new Response(null, { status: 302, headers: { location: "/og.png", "cache-control": "no-store" } });
  }
}
