import type { Route } from "./+types/skill";
import { SKILL_NAME, type SkillFile, skillVersion, skillZip } from "~/lib/skill";
import { siteOrigin } from "~/lib/config.server";

/**
 * The installable skill, served from the files checked in at skills/list-want-mcp (bundled at build time, so the site and
 * the repo the installer reads can't differ):
 *   /skill.md and /SKILL.md            SKILL.md alone, for agents that fetch one file
 *   /skills/list-want-mcp.zip          the folder, for upload in the Claude apps (Customize › Skills)
 *   /skill.json                        version, hash and the install command, to tell whether a copy is current
 */
const RAW = import.meta.glob<string>("../../../../skills/list-want-mcp/**/*", { query: "?raw", import: "default", eager: true });
const PREFIX = `/skills/${SKILL_NAME}/`;
export const SKILL_FILES: SkillFile[] = Object.entries(RAW)
  .map(([path, text]) => ({ path: path.slice(path.indexOf(PREFIX) + PREFIX.length), text }))
  .sort((a, b) => (a.path < b.path ? -1 : 1));

const CACHE = "public, max-age=300, s-maxage=3600";

export async function loader({ request }: Route.LoaderArgs) {
  const path = new URL(request.url).pathname.toLowerCase();
  if (path.endsWith(".zip")) {
    return new Response(skillZip(SKILL_NAME, SKILL_FILES), {
      headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${SKILL_NAME}.zip"`, "cache-control": CACHE },
    });
  }
  if (path.endsWith(".json")) {
    return Response.json(await skillVersion(SKILL_FILES, siteOrigin(request)), { headers: { "cache-control": CACHE, "access-control-allow-origin": "*" } });
  }
  const skill = SKILL_FILES.find((f) => f.path === "SKILL.md")!;
  return new Response(skill.text, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": CACHE, "access-control-allow-origin": "*" } });
}
