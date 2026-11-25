import { AsyncLocalStorage } from "node:async_hooks";

/** Per-request trace: the reference shown on error pages and the API's request id for a failure. */
export interface RequestTrace {
  ref: string;
  upstreamRequestId: string | null;
}

export const requestTrace = new AsyncLocalStorage<RequestTrace>();

export function currentTrace(): RequestTrace | undefined {
  return requestTrace.getStore();
}
