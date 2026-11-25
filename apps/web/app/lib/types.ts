/**
 * The public API's wire types live in the shared package so every client uses the same ones.
 * This module re-exports them so the web app can keep importing from "~/lib/types".
 */
export type * from "@wantmcp/api-types";
