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
        const extra: Record<string, unknown> = {};
        const details = str(form, "details");
        if (details) extra.details = details;
        const due = dueDate(str(form, "due_at"));
        if (due) extra.due_at = due;
        const item = await api<{ id: string }>(request, `/lists/${encodeURIComponent(id)}/items`, { method: "POST", body: { text, ...extra } });
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
        const body: Record<string, unknown> = { ...entryFields(form, false) };
        if (price) {
          body.price = price;
          body.original_price = optional(form, "original_price");
          body.currency = (str(form, "currency") || "GBP").toUpperCase();
        }
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}/entries`, { method: "POST", body });
        return { ok: true, intent };
      }
      case "edit-entry":
        await api(request, `/entries/${encodeURIComponent(str(form, "entry_id"))}`, { method: "PATCH", body: entryFields(form, true) });
        return { ok: true, intent };
      case "delete-entry":
        await api(request, `/entries/${encodeURIComponent(str(form, "entry_id"))}`, { method: "DELETE" });
        return { ok: true, intent };
      case "post-price": {
        const price = str(form, "price");
        if (!price) return data({ error: "Enter the price", intent }, 400);
        await api(request, `/entries/${encodeURIComponent(str(form, "entry_id"))}/prices`, {
          method: "POST",
          body: {
            price,
            currency: (str(form, "currency") || "GBP").toUpperCase(),
            original_price: optional(form, "original_price"),
            note: optional(form, "note"),
          },
        });
        return { ok: true, intent };
      }
      case "edit-item": {
        const text = str(form, "text");
        if (!text) return data({ error: "Describe what you want", intent }, 400);
        const body: Record<string, unknown> = { text };
        if (form.has("details")) body.details = str(form, "details");
        if (form.has("due_at")) body.due_at = dueDate(str(form, "due_at"));
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}`, { method: "PATCH", body });
        return { ok: true, intent };
      }
      case "answer-question": {
        // SPEC 12.1: a writer answers an agent's question; the item goes back to open.
        const text = str(form, "text");
        if (!text) return data({ error: "Write an answer", intent }, 400);
        await api(request, `/questions/${encodeURIComponent(str(form, "question_id"))}/answer`, { method: "POST", body: { text } });
        return { ok: true, intent };
      }
      case "add-details": {
        // The light prompt after adding an item: what an agent would need, stored in details.
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}`, { method: "PATCH", body: { details: str(form, "details") } });
        return { ok: true, intent };
      }
      case "set-status": {
        const status = str(form, "status");
        if (!["open", "in_progress", "done"].includes(status)) return data({ error: "Unknown status", intent }, 400);
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}/status`, {
          method: "POST",
          body: { status, note: optional(form, "note"), entry_id: optional(form, "entry_id") },
        });
        return { ok: true, intent };
      }
      case "add-text-entry":
      case "edit-text-entry": {
        const links = str(form, "links")
          .split(/\s+/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (links.length > 8) return data({ error: "Up to 8 links, please", intent }, 400);
        const bad = links.find((l) => !/^https:\/\//i.test(l));
        if (bad) return data({ error: `Links must start with https:// (${bad.slice(0, 60)})`, intent }, 400);
        const body = { title: str(form, "title"), description: str(form, "description"), links };
        if (intent === "add-text-entry") {
          await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}/entries`, { method: "POST", body });
        } else {
          await api(request, `/entries/${encodeURIComponent(str(form, "entry_id"))}`, { method: "PATCH", body });
        }
        return { ok: true, intent };
      }
      case "delete-item":
        await api(request, `/items/${encodeURIComponent(str(form, "item_id"))}`, { method: "DELETE" });
        return { ok: true, intent };
      default:
        return data({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return data({ ...formError(err), intent }, 400);
  }
}

/** A due date from a date input: end of that day, UTC. Empty clears it. */
function dueDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T23:59:59Z`;
}

/** A date input (YYYY-MM-DD) as an ISO timestamp: start of day for a start, end of day for an end. */
function dealDate(value: string, end: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T${end ? "23:59:59" : "00:00:00"}Z`;
}

/**
 * Entry fields from the add/edit form. When editing, empty optional fields are sent as
 * null so they can be cleared; when adding they are left out.
 */
function entryFields(form: FormData, editing: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {
    title: str(form, "title"),
    product_url: str(form, "product_url"),
    description: str(form, "description"),
  };
  const opt = (key: string, value: unknown) => {
    if (value !== null && value !== "") out[key] = value;
    else if (editing) out[key] = null;
  };
  opt("buy_url", optional(form, "buy_url"));
  opt("image_url", optional(form, "image_url"));
  opt("coupon_code", optional(form, "coupon_code"));
  opt("deal_starts_at", dealDate(str(form, "deal_starts_at"), false));
  opt("deal_ends_at", dealDate(str(form, "deal_ends_at"), true));
  const retailer = str(form, "retailer");
  if (retailer || editing) out.retailer = retailer;
  return out;
}
