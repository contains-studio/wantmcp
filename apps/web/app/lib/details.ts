/**
 * The "anything an agent needs?" prompt after adding an item. An empty answer means "nothing to
 * add": no request, so details already saved on the add form are never wiped.
 */
export function detailsPatch(raw: string | null | undefined): { details: string } | null {
  const details = (raw ?? "").trim();
  return details ? { details } : null;
}
