import assert from "node:assert/strict";
import test from "node:test";
import { feedbackAbout } from "./feedback.ts";

test("about names the page, never a token, id or query string", () => {
  assert.equal(feedbackAbout("/claim/clm_e2e_car_abc123"), "/claim");
  assert.equal(feedbackAbout("/l/lst_abc?x=1"), "/l");
  assert.equal(feedbackAbout("/invite/inv_secret"), "/invite");
  assert.equal(feedbackAbout("/unsubscribe/sometoken"), "/unsubscribe");
  assert.equal(feedbackAbout("/app/skills?edit=skl_1"), "/app/skills");
  assert.equal(feedbackAbout("/app/lists/lst_1/settings"), "/app");
  assert.equal(feedbackAbout("/themes/heat"), "/themes/heat");
  assert.equal(feedbackAbout("/"), "/");
  assert.equal(feedbackAbout("/somewhere-else"), undefined);
  assert.equal(feedbackAbout("https://evil.example/claim"), undefined);
  assert.equal(feedbackAbout(null), undefined);
});
