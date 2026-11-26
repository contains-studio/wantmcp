import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES, SKILL_NAME, crc32, frontMatter, guideHeader, guideToReference, skillHash, skillVersion, skillZip, type SkillFile } from "./skill.ts";

const DIR = fileURLToPath(new URL(`../../../../skills/${SKILL_NAME}/`, import.meta.url));

function files(dir = DIR, prefix = ""): SkillFile[] {
  return readdirSync(dir).flatMap((n) =>
    statSync(join(dir, n)).isDirectory() ? files(join(dir, n), `${prefix}${n}/`) : [{ path: `${prefix}${n}`, text: readFileSync(join(dir, n), "utf8") }],
  );
}

test("SKILL.md follows the Agent Skills format", () => {
  const md = readFileSync(join(DIR, "SKILL.md"), "utf8");
  const fm = frontMatter(md);
  assert.equal(fm.name, SKILL_NAME, "name matches the folder");
  assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(!/anthropic|claude/.test(fm.name), "no reserved words in the name");
  assert.ok(fm.description && fm.description.length <= 1024, "description present, at most 1024 characters");
  assert.ok(!/[<>]/.test(fm.description), "no XML in the description");
  for (const phrase of ["things they want", "wish list", "gift ideas", "tasks", "questions"]) assert.ok(fm.description.includes(phrase), `description names "${phrase}"`);
  assert.match(fm["metadata.version"], /^\d+\.\d+\.\d+$/);
  // Only the keys the Claude apps' upload accepts (anything else is an error there).
  const keys = Object.keys(fm).filter((k) => !k.includes("."));
  for (const k of keys) assert.ok(["name", "description", "license", "compatibility", "metadata", "allowed-tools"].includes(k), `front matter key ${k}`);
  assert.ok(md.split("\n").length <= 100, "short: the details live in the reference files and on the server");
});

test("SKILL.md links each reference file, and they exist", () => {
  const md = readFileSync(join(DIR, "SKILL.md"), "utf8");
  for (const g of GUIDES) {
    assert.ok(md.includes(`](reference/${g}.md)`), `links reference/${g}.md`);
    assert.ok(readFileSync(join(DIR, "reference", `${g}.md`), "utf8").startsWith(guideHeader(g)), `reference/${g}.md is generated`);
  }
});

test("nothing private or machine-specific in the skill folder", () => {
  for (const f of files()) {
    assert.ok(!/\b(wk|ak)_[A-Za-z0-9]{8,}/.test(f.text), `${f.path}: no keys`);
    assert.ok(!/\/Users\/|\/home\/[a-z]|[A-Z]:\\\\/.test(f.text), `${f.path}: no machine paths`);
    assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(f.text), `${f.path}: no email addresses`);
  }
});

test("guideToReference drops the front matter and adds the header", () => {
  const served = "---\nname: shop-a-want-list\ndescription: x\n---\r\n\r\n# Shop\r\nBody\r\n";
  assert.equal(guideToReference("shop-a-want-list", served), `${guideHeader("shop-a-want-list")}\n\n# Shop\nBody\n`);
});

test("skillHash matches the skills installer's published test vectors", async () => {
  assert.equal(await skillHash([]), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(await skillHash([{ path: "SKILL.md", text: "# hi\n" }]), "93c36952d8843b33e68ae970ebabcc03e1687c9bb0dd1ecaf357060318952f55");
  assert.equal(
    await skillHash([
      { path: "docs/b.md", text: "b\n" },
      { path: "SKILL.md", text: "a\n" },
    ]),
    "b22c4d22aa319d2924312fa18fcbfedc88fa89c74dbd8f298c683e1caf7b7f24",
  );
});

test("skillZip puts every file under the skill's folder, readable back", () => {
  const input = files();
  const zip = skillZip(SKILL_NAME, input);
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const dec = new TextDecoder();
  const eocd = zip.length - 22;
  assert.equal(view.getUint32(eocd, true), 0x06054b50);
  assert.equal(view.getUint16(eocd + 10, true), input.length);
  let p = view.getUint32(eocd + 16, true);
  const seen: string[] = [];
  for (let i = 0; i < input.length; i++) {
    assert.equal(view.getUint32(p, true), 0x02014b50);
    const size = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const off = view.getUint32(p + 42, true);
    const name = dec.decode(zip.subarray(p + 46, p + 46 + nameLen));
    const dataAt = off + 30 + view.getUint16(off + 26, true);
    const data = zip.subarray(dataAt, dataAt + size);
    assert.equal(crc32(data), view.getUint32(p + 16, true), `${name}: CRC`);
    const src = input.find((f) => `${SKILL_NAME}/${f.path}` === name);
    assert.ok(src, `${name} is one of the folder's files`);
    assert.equal(dec.decode(data), src.text);
    seen.push(name);
    p += 46 + nameLen;
  }
  assert.ok(seen.includes(`${SKILL_NAME}/SKILL.md`));
  assert.deepEqual(skillZip(SKILL_NAME, input), zip, "the same files make the same bytes");
});

test("skillVersion names the version, hash and install command", async () => {
  const v = await skillVersion(files(), "https://wantmcp.com");
  assert.equal(v.name, SKILL_NAME);
  assert.match(v.version, /^\d+\.\d+\.\d+$/);
  assert.match(v.sha256, /^[0-9a-f]{64}$/);
  assert.equal(v.install, "npx skills add contains-studio/wantmcp --skill list-want-mcp -g");
  assert.equal(v.skill_md, "https://wantmcp.com/skill.md");
});
