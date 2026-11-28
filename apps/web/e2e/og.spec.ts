import { expect, test } from "@playwright/test";
import { addItem, createList, freshEmail, signIn } from "./helpers";

// A fresh ?v= skips the edge cache, so the image is really rendered. A failed render redirects to /og.png.
for (const path of ["/og/home.png", "/og/l/lst_desk2026.png", "/og/for/black-friday-shopping-list.png"]) {
  test(`share image renders: ${path}`, async ({ request }) => {
    const res = await request.get(`${path}?v=${Date.now()}`, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    expect((await res.body()).length).toBeGreaterThan(10_000);
  });
}

test("a private list gets the generic share image", async ({ request }) => {
  const res = await request.get(`/og/l/lst_tasks.png?v=${Date.now()}`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toBe("/og.png");
});

// A title full of markup is drawn as text (Satori turns text into glyph outlines; nothing of it reaches the SVG as
// markup), and the card still renders rather than falling back.
test("a public list whose title looks like markup still gets its own share image", async ({ page, request }) => {
  await signIn(page, freshEmail("og-markup"));
  const id = await createList(page, { format: "Shopping", title: `Tom & Jerry's "<b>gifts</b>" <svg onload=x> & co`, visibility: "Public" });
  // An empty list isn't shown to strangers yet; one want makes it a list.
  await addItem(page, `A <rect/> & "quoted" thing`);
  const res = await request.get(`/og/l/${id}.png?v=${Date.now()}`, { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expect((await res.body()).length).toBeGreaterThan(10_000);
});
