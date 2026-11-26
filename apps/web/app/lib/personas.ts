/**
 * Pages for people with a particular job to get done (/for/<slug>). Each page is static data in
 * content/personas/<slug>.ts: a short intro and three sample lists, one per format.
 *
 * Writing rules (the persona test checks what it can):
 * - Address the job, not the person. Never assume or state anything about the reader's faith,
 *   health, disability, money or family. No stereotypes.
 * - Only claim what the product does: agents add products, prices, updates and sourced answers
 *   when someone asks them (or a schedule the person set up runs them). Nothing re-checks prices on
 *   its own, sends alerts, buys, books or pays. Visitors can read public lists; they cannot claim
 *   gifts or comment. Every new list starts private (shopping too, since 25 Nov 2026); its owner can
 *   make it public.
 * - US terms, USD prices, invented stores and products, example.com/example.org links.
 */
import type { SampleListSpec } from "./samples";

export type PersonaGroup =
  | "deals"
  | "gifts"
  | "home"
  | "school"
  | "moving"
  | "hobbies"
  | "events"
  | "delegating"
  | "work"
  | "research"
  | "agents"
  | "publishing"
  | "anywhere";

export const PERSONA_GROUPS: Record<PersonaGroup, string> = {
  deals: "Deals and big purchases",
  gifts: "Gifts and holidays",
  home: "Home and family",
  school: "School and study",
  moving: "Moving and home projects",
  hobbies: "Hobbies and repairs",
  events: "Trips, weddings and events",
  delegating: "Handing off the legwork",
  work: "Work and small organizations",
  research: "Research and fact-checking",
  agents: "For people who build with agents",
  publishing: "Publishing and communities",
  anywhere: "Shopping from wherever you are",
};

export interface Persona {
  /** URL slug: lowercase words joined by hyphens. */
  slug: string;
  /** Display order (1 to 67). */
  order: number;
  group: PersonaGroup;
  /** The page title, 25 to 60 characters, without the site name. */
  title: string;
  /** The meta description, 110 to 160 characters. */
  description: string;
  /** The page heading. */
  h1: string;
  /** One or two short sentences under the heading. */
  intro: string;
  /** A short label for the index page, 2 to 6 words. */
  label: string;
  /** False keeps the page out of search engines (noindex) until the owner confirms it. */
  index: boolean;
  /** One sample list per format, each with at least three wants. */
  lists: { shopping: SampleListSpec; tasks: SampleListSpec; research: SampleListSpec };
}
