/**
 * The site writes US English (the owner's choice). Every sentence a person reads on the web, in the app's own words,
 * uses US spellings: strings and JSX text in routes, components, the explorations and the themes. Code (identifiers,
 * class names, import paths, ARIA's own `aria-labelledby`) is never read as text, because the source is parsed and
 * only string literals, template text and JSX text are checked. The personas have their own, wider check
 * (personas.test.ts), which also refuses UK-only words.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { UK_SPELLINGS } from "./spelling.ts";

const ROOTS = ["app/routes", "app/components", "app/explorations", "app/themes", "app/lib"];
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

/** The text a person can read in a source file: string literals, template text and JSX text. */
function readable(file: string): string[] {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    // Import paths and keys are code, not text.
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) out.push(n.text);
    else if (ts.isJsxText(n)) out.push(n.text);
    n.forEachChild(visit);
  };
  visit(src);
  return out;
}

test("every sentence a person reads uses US spelling", () => {
  const files = ROOTS.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) && !f.endsWith(".d.ts"));
  const found: string[] = [];
  for (const f of files)
    for (const t of readable(f))
      for (const [re, us] of UK_SPELLINGS) {
        const m = t.match(re);
        if (m) found.push(`${f}: "${m[0]}" (US: ${us}) in "${t.trim().replace(/\s+/g, " ").slice(0, 90)}"`);
      }
  assert.deepEqual(found, []);
});
