/**
 * Source tags (`?ref=share`, `?ref=newsletter`): the label from the landing URL is kept for the visit in
 * sessionStorage (no cookie) and sent with sign-up and list creation, so the server can count sign-ups per
 * channel. Only `[a-z0-9-]{1,24}` is ever kept or sent.
 */
import { useEffect, useState } from "react";

const KEY = "wm_ref";
export const REF_PATTERN = /^[a-z0-9-]{1,24}$/;

export function cleanRef(value: unknown): string | null {
  return typeof value === "string" && REF_PATTERN.test(value) ? value : null;
}

/** Called once per page load: remembers a valid ?ref= for the rest of the visit. */
export function useRememberRef() {
  useEffect(() => {
    try {
      const ref = cleanRef(new URLSearchParams(window.location.search).get("ref"));
      if (ref) sessionStorage.setItem(KEY, ref);
    } catch {
      // Storage blocked: the visit simply has no tag.
    }
  }, []);
}

/** A hidden `ref` field for forms that sign people up or create lists. Empty without JavaScript. */
export function RefField() {
  const [ref, setRef] = useState("");
  useEffect(() => {
    try {
      setRef(cleanRef(sessionStorage.getItem(KEY)) ?? "");
    } catch {
      // ignore
    }
  }, []);
  return <input type="hidden" name="ref" value={ref} />;
}
