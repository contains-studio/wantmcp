/**
 * The Want MCP's installable skill, `list-want-mcp` (skills/list-want-mcp at the repo root): how its reference files are
 * made from the guides the MCP server serves, its version and hash, and the ZIP the Claude apps take. Pure functions, so
 * the Worker routes (routes/skill.ts), the generator (scripts/build-skill.mjs) and the tests share them.
 */

export const SKILL_NAME = "list-want-mcp";
export const SKILL_REPO = "contains-studio/wantmcp";
/** The one command every coding agent's installer takes (vercel-labs/skills; `-g` for the whole user account). */
export const SKILL_INSTALL = `npx skills add ${SKILL_REPO} --skill ${SKILL_NAME} -g`;
/** Where Claude Code reads a user's own skills (code.claude.com/docs/en/skills). */
export const SKILL_CLAUDE_CODE_DIR = `~/.claude/skills/${SKILL_NAME}`;
/** For chat apps with no skills: one line for the app's memory or custom instructions. */
export const SKILL_MEMORY_LINE = "When I talk about things I want, my wish list or gift ideas, use The Want MCP.";

/** The three guides the server serves (MCP resources skill://<name>/SKILL.md, prompts, and read_skill). */
export const GUIDES = ["shop-a-want-list", "work-a-task-list", "research-a-question-list"] as const;

/** First line of each generated reference file; the rest is the guide as served, without its front matter. */
export function guideHeader(name: string): string {
  return `<!-- Generated from skill://${name}/SKILL.md on The Want MCP server by apps/web/scripts/build-skill.mjs. Do not edit by hand: run \`pnpm skill:build\` in apps/web. -->`;
}

/** The served guide (front matter and all) as the checked-in reference file. */
export function guideToReference(name: string, served: string): string {
  const body = served.replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  return `${guideHeader(name)}\n\n${body}\n`;
}

/** The front matter's plain `key: value` lines and one level of nesting (enough for name, description, metadata). */
export function frontMatter(md: string): Record<string, string> {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return {};
  const out: Record<string, string> = {};
  let parent = "";
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\s*)([A-Za-z_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, indent, key, raw] = kv;
    const value = raw.replace(/^"(.*)"$/, "$1");
    if (!indent) parent = value ? "" : key;
    out[indent && parent ? `${parent}.${key}` : key] = value;
  }
  return out;
}

export type SkillFile = { path: string; text: string };

const enc = new TextEncoder();

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The folder's hash as the `skills` installer computes it for skills-lock.json (vercel-labs/skills README, "Lock File
 * Content Hash"): files sorted by path bytes, each fed as path, NUL, length, NUL, content (CRLF made LF).
 */
export async function skillHash(files: SkillFile[]): Promise<string> {
  const sorted = files
    .map((f) => ({ path: enc.encode(f.path), body: enc.encode(f.text.replace(/\r\n/g, "\n")) }))
    .sort((a, b) => {
      for (let i = 0; i < Math.min(a.path.length, b.path.length); i++) if (a.path[i] !== b.path[i]) return a.path[i] - b.path[i];
      return a.path.length - b.path.length;
    });
  const parts: Uint8Array[] = [];
  for (const f of sorted) parts.push(f.path, Uint8Array.of(0), enc.encode(String(f.body.length)), Uint8Array.of(0), f.body);
  return sha256Hex(concat(parts));
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * A ZIP (stored, no compression: a few KB of text) with every file under `<folder>/`, the layout the Claude apps' upload
 * expects (the folder's name is the skill's name). Fixed timestamps, so the same files always make the same bytes.
 */
export function skillZip(folder: string, files: SkillFile[]): Uint8Array<ArrayBuffer> {
  const DOS_TIME = 0; // 00:00:00
  const DOS_DATE = ((2026 - 1980) << 9) | (11 << 5) | 26; // 26 Nov 2026
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    const name = enc.encode(`${folder}/${f.path}`);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true); // version needed
    head.setUint16(6, 0x0800, true); // UTF-8 names
    head.setUint16(8, 0, true); // stored
    head.setUint16(10, DOS_TIME, true);
    head.setUint16(12, DOS_DATE, true);
    head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true);
    head.setUint32(22, data.length, true);
    head.setUint16(26, name.length, true);
    head.setUint16(28, 0, true);
    local.push(new Uint8Array(head.buffer), name, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 0x0314, true); // made by: Unix, 2.0
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, DOS_TIME, true);
    cen.setUint16(14, DOS_DATE, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(38, (0o100644 << 16) >>> 0, true); // -rw-r--r--
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cenBytes = concat(central);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenBytes.length, true);
  end.setUint32(16, offset, true);
  return concat([...local, cenBytes, new Uint8Array(end.buffer)]);
}

/** What /skill.json answers: enough for an agent to tell whether its copy is current, and how to update it. */
export async function skillVersion(files: SkillFile[], origin: string) {
  const skill = files.find((f) => f.path === "SKILL.md");
  const fm = frontMatter(skill?.text ?? "");
  return {
    name: fm.name ?? SKILL_NAME,
    version: fm["metadata.version"] ?? "",
    updated: fm["metadata.updated"] ?? "",
    // The folder hash the `skills` installer records in skills-lock.json (vercel-labs/skills, "Lock File Content
    // Hash"): over every file below, not any one of them. zip_sha256 and skill_md_sha256 are plain hashes of what is
    // served at `zip` and `skill_md`, for anyone checking a download with `shasum -a 256`.
    sha256: await skillHash(files),
    sha256_of: "the skill folder, as the skills installer hashes it for skills-lock.json",
    zip_sha256: await sha256Hex(skillZip(SKILL_NAME, files)),
    skill_md_sha256: skill ? await sha256Hex(enc.encode(skill.text)) : "",
    files: files.map((f) => f.path).sort(),
    install: SKILL_INSTALL,
    skill_md: `${origin}/skill.md`,
    zip: `${origin}/skills/${SKILL_NAME}.zip`,
    source: `https://github.com/${SKILL_REPO}/tree/main/skills/${SKILL_NAME}`,
  };
}
