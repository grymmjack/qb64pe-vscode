/**
 * MediaWiki (QB64PE wiki) → Markdown converter (vscode-free, unit-tested).
 *
 * QB64PE ships its help as MediaWiki source in `<install>/internal/help/*.txt`.
 * This turns one such page into the same Markdown shape the extension's bundled
 * `help/*.md` uses (so the hover stylesheet keeps working): an `## [title]` head,
 * a `### summary` blockquote, then `#### SECTION` blockquotes, with `{{CodeStart}}`
 * blocks as fenced code and `{{OutputStart}}` blocks as coloured `<pre>`.
 *
 * It is intentionally a focused transform for the template set the QB64PE wiki
 * actually uses (surveyed across all 602 shipped pages), not a general MediaWiki
 * parser.
 */

export interface WikiConvertOptions {
  /** The page's keyword, e.g. "_RGB32" or "$CONSOLE" or "PRINT USING". */
  title: string;
  /** Base URL for the "open in wiki" link and `[[links]]`. */
  wikiBase?: string;
}

const WIKI_BASE = "https://qb64phoenix.com/qb64wiki/index.php/";

/** Section markers `{{PageXxx}}` → the heading shown for that section. */
const SECTION_LABELS: Record<string, string> = {
  PageSyntax: "SYNTAX",
  PageParameters: "PARAMETERS",
  PageDescription: "DESCRIPTION",
  PageExamples: "EXAMPLES",
  PageAvailability: "AVAILABILITY",
  PageSeeAlso: "SEE ALSO",
  PageReferences: "REFERENCES",
  PageErrors: "ERRORS",
};
/** Markers that carry no content we want to render. */
const DROP_SECTIONS = new Set(["PageNavigation"]);

/** `_RGB32` → `RGB32.md`, `PRINT USING` → `PRINT_USING.md`, `MID$` → `MID$.md`. */
export function helpLinkTarget(name: string): string {
  return (
    name
      .replace(/^_/, "")
      .replace(/\//g, "-")
      .replace(/ /g, "_") + ".md"
  );
}

/** URL of the page on the live wiki. */
export function wikiUrl(name: string, base: string = WIKI_BASE): string {
  return base + encodeURI(name.replace(/ /g, "_"));
}

/** Title shown for the page: DISPLAYTITLE if the source declares one. */
export function displayTitle(wikitext: string): string | null {
  const m = wikitext.match(/^\{\{DISPLAYTITLE:\s*(.+?)\s*\}\}/m);
  return m ? m[1] : null;
}

export function wikitextToMarkdown(
  wikitext: string,
  options: WikiConvertOptions
): string {
  const wikiBase = options.wikiBase ?? WIKI_BASE;
  const title = displayTitle(wikitext) ?? options.title;

  // Drop the metadata templates the downloader prepends.
  const body = wikitext
    .replace(/^\{\{QBDLDATE:[^}]*\}\}\s*$/gm, "")
    .replace(/^\{\{QBDLTIME:[^}]*\}\}\s*$/gm, "")
    .replace(/^\{\{DISPLAYTITLE:[^}]*\}\}\s*$/gm, "");

  const { lead, sections } = splitSections(body);

  const out: string[] = [];
  out.push(
    `## [${title}](${helpLinkTarget(title)}) [📖](${wikiUrl(title, wikiBase)})`,
    "---"
  );

  const leadText = renderProse(lead, wikiBase).trim();
  if (leadText) {
    out.push("<blockquote>", "", "### " + leadText, "", "</blockquote>");
  }

  for (const section of sections) {
    const content = renderSection(section.body, wikiBase).trim();
    if (!content && section.name !== "PageExamples") continue;
    out.push(
      "",
      `#### ${SECTION_LABELS[section.name] ?? section.name.replace(/^Page/, "").toUpperCase()}`,
      "",
      "<blockquote>",
      "",
      content,
      "",
      "</blockquote>"
    );
  }

  return collapseBlankLines(out.join("\n")) + "\n";
}

interface Section {
  name: string;
  body: string;
}

/** Splits the page into the lead paragraph and its `{{PageXxx}}` sections. */
function splitSections(body: string): { lead: string; sections: Section[] } {
  const marker = /^\{\{(Page[A-Za-z]+)\}\}\s*$/gm;
  const sections: Section[] = [];
  let lead = body;
  let match: RegExpExecArray | null;
  const found: { name: string; start: number; contentStart: number }[] = [];
  while ((match = marker.exec(body)) !== null) {
    found.push({
      name: match[1],
      start: match.index,
      contentStart: match.index + match[0].length,
    });
  }
  if (found.length > 0) {
    lead = body.slice(0, found[0].start);
    for (let i = 0; i < found.length; i++) {
      const end = i + 1 < found.length ? found[i + 1].start : body.length;
      if (DROP_SECTIONS.has(found[i].name)) continue;
      sections.push({
        name: found[i].name,
        body: body.slice(found[i].contentStart, end),
      });
    }
  }
  return { lead, sections };
}

const BLOCK_RE =
  /\{\{(CodeStart|OutputStart(?:BG\d)?|TextStart|PreStart|FixedStart)\}\}([\s\S]*?)\{\{(?:CodeEnd|OutputEnd|TextEnd|PreEnd|FixedEnd)\}\}/g;

/** Renders one section body: fenced/`<pre>` blocks plus prose in between. */
function renderSection(body: string, wikiBase: string): string {
  const parts: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(body)) !== null) {
    parts.push(renderProse(body.slice(last, m.index), wikiBase));
    parts.push(m[1] === "CodeStart" ? renderCode(m[2]) : renderPre(m[1], m[2]));
    last = m.index + m[0].length;
  }
  parts.push(renderProse(body.slice(last), wikiBase));
  return parts.join("\n");
}

/** A `{{CodeStart}}` block → a fenced QB64 code block (links become plain text). */
function renderCode(content: string): string {
  const code = stripInlineToText(content).replace(/^\n+/, "").replace(/\s+$/, "");
  return "\n```vb\n" + code + "\n```\n";
}

/** Output/Text/Pre/Fixed block → `<pre>`, keeping `{{Text|..|colour}}` colours. */
function renderPre(kind: string, content: string): string {
  const bg = kind.match(/^OutputStartBG(\d)$/);
  const style = bg ? ` style="background:${bgColor(bg[1])}"` : "";
  const inner = content.replace(/^\n+/, "").replace(/\s+$/, "");
  return `\n<pre${style}>\n${coloredText(inner)}\n</pre>\n`;
}

const BG = ["#000", "#00a", "#0a0", "#0aa", "#a00", "#a0a", "#a50", "#aaa"];
function bgColor(n: string): string {
  return BG[Number(n)] ?? "#000";
}

/** Expands inline templates to their plain text (for inside code fences). */
function stripInlineToText(text: string): string {
  return text
    .replace(/<nowiki>([\s\S]*?)<\/nowiki>/g, "$1")
    .replace(/\{\{(?:Cl|Cb|Cm|Ot)\|[^|{}]*\|([^{}]*)\}\}/g, "$1")
    .replace(/\{\{(?:Cl|Cb|Cm|Ot)\|([^{}]*)\}\}/g, "$1")
    .replace(/\{\{Parameter\|([^{}]*)\}\}/g, "$1")
    .replace(/\{\{Text\|([^|{}]*)\|[^{}]*\}\}/g, "$1")
    .replace(/\{\{Small\|([^{}]*)\}\}/g, "$1")
    .replace(/\{\{InlineCode\}\}([\s\S]*?)\{\{InlineCodeEnd\}\}/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "");
}

/** HTML-escapes text and turns `{{Text|content|colour}}` into coloured spans. */
function coloredText(text: string): string {
  const stripped = text.replace(/<nowiki>([\s\S]*?)<\/nowiki>/g, "$1");
  let out = "";
  let last = 0;
  const re = /\{\{Text\|([\s\S]*?)\|([^{}|]*)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    out += escapeHtml(stripInlineToText(stripped.slice(last, m.index)));
    const color = safeColor(m[2]);
    const content = escapeHtml(stripInlineToText(m[1]));
    out += color ? `<span style="color:${color}">${content}</span>` : content;
    last = m.index + m[0].length;
  }
  out += escapeHtml(stripInlineToText(stripped.slice(last)));
  return out;
}

/** Accepts `#rgb`/`#rrggbb` and simple colour names; rejects anything else. */
function safeColor(raw: string): string | null {
  const c = raw.trim();
  if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
  if (/^[a-zA-Z]{1,20}$/.test(c)) return c.toLowerCase();
  return null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Renders wiki prose: lists, indents, rules, and inline markup. */
function renderProse(text: string, wikiBase: string): string {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim() === "") {
      out.push("");
      continue;
    }
    if (/^-{4,}$/.test(line.trim())) {
      out.push("---");
      continue;
    }
    // Lists: leading ':' (indent) then one or more '*'.
    const list = line.match(/^(:*)(\*+)\s?(.*)$/);
    if (list) {
      const depth = list[1].length + list[2].length - 1;
      out.push("  ".repeat(depth) + "* " + inline(list[3], wikiBase));
      continue;
    }
    // Definition/indent lines ':' / '::' → plain text.
    const indent = line.match(/^:+\s?(.*)$/);
    if (indent) {
      out.push(inline(indent[1], wikiBase));
      continue;
    }
    out.push(inline(line, wikiBase));
  }
  return out.join("\n");
}

/** Inline template + wiki-markup expansion for prose. */
function inline(text: string, wikiBase: string): string {
  let s = text;
  s = s.replace(/<nowiki>([\s\S]*?)<\/nowiki>/g, "$1");
  s = s.replace(/\{\{InlineCode\}\}([\s\S]*?)\{\{InlineCodeEnd\}\}/g, "`$1`");
  // Code links: {{Cl|target|display}} / {{Cl|target}} (also Cb/Cm/Ot).
  s = s.replace(
    /\{\{(?:Cl|Cb|Cm|Ot)\|([^|{}]*)\|([^{}]*)\}\}/g,
    (_, target, disp) => link(disp, target, wikiBase)
  );
  s = s.replace(/\{\{(?:Cl|Cb|Cm|Ot)\|([^{}]*)\}\}/g, (_, target) =>
    link(target, target, wikiBase)
  );
  s = s.replace(/\{\{Parameter\|([^{}]*)\}\}/g, (_, p) => `*${p.trim()}*`);
  s = s.replace(
    /\{\{Text\|([^|{}]*)\|([^{}|]*)\}\}/g,
    (_, content, color) => {
      const c = safeColor(color);
      return c ? `<span style="color:${c}">${content}</span>` : content;
    }
  );
  s = s.replace(/\{\{Small\|([^{}]*)\}\}/g, "$1");
  // Wiki links: [[target|display]] / [[target]].
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, target, disp) =>
    link(disp, target, wikiBase)
  );
  s = s.replace(/\[\[([^\]]+)\]\]/g, (_, target) => link(target, target, wikiBase));
  // Bold before italic (''' vs '').
  s = s.replace(/'''(.+?)'''/g, "**$1**");
  s = s.replace(/''(.+?)''/g, "*$1*");
  // Any leftover template: keep its last argument's text.
  s = s.replace(/\{\{[^{}]*\|([^{}]*)\}\}/g, "$1").replace(/\{\{[^{}]*\}\}/g, "");
  return s;
}

/** A markdown link to another help page (local `.md`, matching the bundled set). */
function link(display: string, target: string, _wikiBase: string): string {
  return `[${display.trim()}](${helpLinkTarget(target.trim())})`;
}

function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}
