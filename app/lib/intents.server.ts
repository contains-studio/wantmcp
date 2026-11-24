import { data } from "react-router";
import { api, formError } from "./api.server";
import { assertSameOrigin } from "./session.server";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const optional = (f: FormData, k: string) => str(f, k) || null;

/**
 * Form intents shared by the list page and the signed-in feed. Each one is a thin call
 * to the REST API; the API enforces permissions.
 */
export async function handleWriterIntent(request: Request, form: FormData, listId?: string) {
  assertSameOrigin(request);
  const intent = str(form, "intent");
  try {
    switch (intent) {
      case "add-item": {
        const id = str(form, "list_id") || listId;
        if (!id) return data({ error: "Pick a list first" }, 400);
        const text = str(form, "text");
        if (!text) return data({ error: "Describe what you want" }, 400);
        const item = await api<{ id: string }>(request, `/lists/${encodeURIComponent(id)}/items`, { method: "POST", body: { text } });
        return { ok: true, intent, itemId: item.id };
      }
      case "comment": {
        const body = str(form, "body");
        if (!body) return data({ error: "Write something first" }, 400);
        await api(request, "/comments", {
          method: "POST",
          body: { target_type: str(form, "target_type"), target_id: str(form, "target_id"), body },
        });
        return { ok: true, intent };
      }
      case "delete-comment":
        await api(request, `/comments/${encodeURIComponent(str(form, "comment_id"))}`, { method: "DELETE" });
        return { ok: true, intent };
      case "purchase":
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}/purchase`, {
          method: "POST",
          body: {
            entry_id: optional(form, "entry_id"),
            retailer: optional(form, "retailer"),
            price: optional(form, "price"),
            currency: optional(form, "currency"),
          },
        });
        return { ok: true, intent };
      case "unpurchase":
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}/purchase`, { method: "DELETE" });
        return { ok: true, intent };
      case "promote":
        await api(request, `/entries/${encodeURIComponent(str(form, "entry_id"))}/promote`, { method: "POST" });
        return { ok: true, intent };
      case "reject":
        await api(request, `/entries/${encodeURIComponent(str(form, "entry_id"))}/reject`, { method: "POST" });
        return { ok: true, intent };
      case "add-entry": {
        const price = optional(form, "price");
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}/entries`, {
          method: "POST",
          body: {
            title: str(form, "title"),
            product_url: str(form, "product_url"),
            image_url: optional(form, "image_url"),
            retailer: str(form, "retailer"),
            coupon_code: optional(form, "coupon_code"),
            ...(price ? { price, original_price: optional(form, "original_price"), currency: str(form, "currency") || "GBP" } : {}),
          },
        });
        return { ok: true, intent };
      }
      case "delete-item":
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}`, { method: "DELETE" });
        return { ok: true, intent };
      default:
        return data({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return data(formError(err), 400);
  }
}
