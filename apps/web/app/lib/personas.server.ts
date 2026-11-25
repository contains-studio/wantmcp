/** The /for pages' content: one static file per persona in content/personas, loaded at build time. */
import type { Persona } from "./personas";

const modules = import.meta.glob<{ default: Persona }>("../../content/personas/*.ts", { eager: true });

export const PERSONAS: Persona[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order);

export function personaBySlug(slug: string | undefined): Persona | undefined {
  return PERSONAS.find((p) => p.slug === slug);
}
