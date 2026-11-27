/**
 * Copies the developer guide (SPEC 24.3) from the server repo, where the MCP layer owns it and checks every fact against
 * the live server, into app/content/developers.md. /developers and /developers.md are built from that copy, so a new
 * version of the guide is one command: never retype it.
 *
 *   node scripts/build-developers.mjs                    # from GitHub (contains-studio/wantmcp-server, main), via gh
 *   node scripts/build-developers.mjs --from <file>      # from a local checkout's docs/developers-source.md
 *   node scripts/build-developers.mjs --check [--from …] # fail if the copy differs (skips, exit 0, when the source can't be read)
 *
 * On the way it drops the server's own check notes (the `check:developers` comment, and the sentence naming the
 * server repo's command), and refuses anything that looks private: a real key, an email address, a machine path.
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../app/content/developers.md", import.meta.url));
const CHECK = process.argv.includes("--check");
const fromAt = process.argv.indexOf("--from");
const FROM = fromAt > 0 ? process.argv[fromAt + 1] : null;

async function source() {
  if (FROM) return readFile(FROM, "utf8");
  return execFileSync("gh", ["api", "-H", "Accept: application/vnd.github.raw", "repos/contains-studio/wantmcp-server/contents/docs/developers-source.md?ref=main"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/** The public copy: the guide as written, without the server's own check notes. */
export function publicCopy(md) {
  return (
    md
      .replace(/<!--\s*check:developers[\s\S]*?-->\s*/g, "")
      .replace(/ \(`npm run check:developers` in the server repo\)/g, "")
      .trimEnd() + "\n"
  );
}

/** Lines that must never reach this public repo. Placeholders such as `wk_…` are fine. */
export function privateLines(md) {
  const bad = [
    [/\b(?:wk|ak)_[A-Za-z0-9]{8,}/, "a real-looking key"],
    [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, "an email address"],
    [/(?:\/Users\/|\/home\/|C:\\Users\\|\/private\/tmp\/)/, "a machine path"],
    [/check:developers|server repo/, "the server's own check notes"],
  ];
  return md.split("\n").flatMap((line, i) => bad.filter(([re]) => re.test(line)).map(([, what]) => `line ${i + 1}: ${what}`));
}

let raw;
try {
  raw = await source();
} catch (err) {
  if (!CHECK) throw err;
  console.log(`skip: can't read the developer guide (${err.message.split("\n")[0]})`);
  process.exit(0);
}
const want = publicCopy(raw);
const found = privateLines(want);
if (found.length) {
  console.log(`FAIL the guide has something that must not be public:\n  ${found.join("\n  ")}`);
  process.exit(1);
}
if (CHECK) {
  const have = await readFile(OUT, "utf8").catch(() => "");
  if (have === want) console.log("ok   app/content/developers.md matches the server's guide");
  else {
    console.log("FAIL app/content/developers.md differs from the server's guide: run pnpm developers:build");
    process.exit(1);
  }
} else {
  await writeFile(OUT, want);
  console.log(`wrote app/content/developers.md (${want.length} bytes)`);
}
