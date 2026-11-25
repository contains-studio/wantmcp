import { expect, test } from "@playwright/test";

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
