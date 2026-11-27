/**
 * The developer guide (SPEC 24.3) read into blocks for /developers. It reads only what the guide uses: headings,
 * paragraphs, bullet and numbered lists, tables and fenced code. Everything stays plain text (rendered by React, never
 * as HTML), and nothing is reworded: every fact, call and snippet is the source's own.
 */

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string; id: string }
  | { kind: "para"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "code"; lang: string; text: string };

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Table cells split on unescaped pipes; `\|` is a pipe inside a cell. */
function cells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const out: Block[] = [];
  const used = new Map<string, number>();
  const idFor = (text: string) => {
    const base = slug(text) || "section";
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n ? `${base}-${n + 1}` : base;
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push({ kind: "code", lang: fence[1] ?? "", text: body.join("\n") });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const text = h[2].trim();
      out.push({ kind: "heading", level: h[1].length as 1 | 2 | 3, text, id: idFor(text) });
      i++;
      continue;
    }
    if (/^\|/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      const [head, , ...body] = rows; // the second row is the |---| rule
      out.push({ kind: "table", head: head ?? [], rows: body });
      continue;
    }
    const item = /^(\s*)(-|\d+\.)\s+/;
    if (item.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        if (item.test(lines[i])) items.push(lines[i].replace(item, ""));
        else items[items.length - 1] += ` ${lines[i].trim()}`; // a wrapped line of the item above
        i++;
      }
      out.push({ kind: "list", ordered, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|\||\s*(-|\d+\.)\s)/.test(lines[i])) para.push(lines[i++].trim());
    out.push({ kind: "para", text: para.join(" ") });
  }
  return out;
}

/** Inline text: `code`, **bold** (which may hold code), and the rest as it is. */
export type Inline = { kind: "text" | "code"; text: string } | { kind: "bold"; parts: Inline[] };
export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /`([^`]+)`|\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ kind: "text", text: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "code", text: m[1] });
    else out.push({ kind: "bold", parts: parseInline(m[2]) });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ kind: "text", text: s.slice(last) });
  return out;
}

export interface Section {
  heading: Extract<Block, { kind: "heading" }>;
  blocks: Block[];
}

/** One way in, from the "Three ways in" list: its bold title, the rest, and the section that explains it, if any. */
export interface WayIn {
  title: string;
  text: string;
  href: string | null;
}

/** A piece of code in several languages ("curl: no account first", "TypeScript (…): no account first"). */
export interface CodeGroup {
  topic: string;
  id: string;
  /** `detail`: the source heading, when it says more than the language and the topic ("TypeScript: sign in (web or Node)"). */
  variants: Array<{ lang: string; heading: string; detail: string | null; blocks: Block[] }>;
}

export interface Guide {
  title: string;
  intro: Block[];
  ways: WayIn[];
  sections: Section[];
  /** The "Code" section, grouped by what the code does, one tab per language. */
  code: { heading: Section["heading"]; groups: CodeGroup[] } | null;
}

const LANG = /^(curl|TypeScript|Swift|Kotlin|Python)\b[^:]*:\s*(.+)$/;

export function readGuide(md: string): Guide {
  const blocks = parseBlocks(md);
  const h1 = blocks.find((b): b is Extract<Block, { kind: "heading" }> => b.kind === "heading" && b.level === 1);
  const title = h1?.text ?? "Build with The Want MCP";
  const sections: Section[] = [];
  const intro: Block[] = [];
  for (const b of blocks) {
    if (b.kind === "heading" && b.level === 1) continue;
    if (b.kind === "heading" && b.level === 2) sections.push({ heading: b, blocks: [] });
    else if (sections.length) sections.at(-1)!.blocks.push(b);
    else intro.push(b);
  }
  // The three ways in become cards; each links to the numbered section with its name, when there is one.
  const waysAt = sections.findIndex((s) => /^Three ways in/i.test(s.heading.text));
  const ways: WayIn[] = [];
  if (waysAt >= 0) {
    const list = sections[waysAt].blocks.find((b) => b.kind === "list");
    for (const it of list && list.kind === "list" ? list.items : []) {
      const m = it.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      const t = (m ? m[1] : it).replace(/\.$/, "");
      const key = slug(t.split("(")[0]);
      const target = sections.find((s) => /^\d+\.\s/.test(s.heading.text) && key.startsWith(slug(s.heading.text.replace(/^\d+\.\s*/, ""))));
      ways.push({ title: t, text: m ? m[2] : "", href: target ? `#${target.heading.id}` : null });
    }
    sections.splice(waysAt, 1);
  }
  const codeAt = sections.findIndex((s) => /^Code$/i.test(s.heading.text));
  let code: Guide["code"] = null;
  if (codeAt >= 0) {
    const sec = sections[codeAt];
    const groups: CodeGroup[] = [];
    let current: CodeGroup["variants"][number] | null = null;
    for (const b of sec.blocks) {
      if (b.kind === "heading" && b.level === 3) {
        const m = b.text.match(LANG);
        // "sign in (web or Node)" and "sign in on iPhone, iPad and Mac" are one thing in two languages; each tab keeps
        // its full heading.
        const said = m ? m[2].trim() : b.text;
        const topic = said.replace(/\s*\(.*\)$/, "").replace(/\s+on\s+.+$/, "");
        const lang = m ? m[1] : b.text;
        let g = groups.find((x) => x.topic.toLowerCase() === topic.toLowerCase());
        if (!g) groups.push((g = { topic, id: `code-${slug(topic)}`, variants: [] }));
        current = { lang, heading: b.text, detail: m && (said !== topic || /\(/.test(b.text.split(":")[0])) ? b.text : null, blocks: [] };
        g.variants.push(current);
      } else current?.blocks.push(b);
    }
    code = { heading: sec.heading, groups };
    sections.splice(codeAt, 1);
  }
  return { title, intro, ways, sections, code };
}
