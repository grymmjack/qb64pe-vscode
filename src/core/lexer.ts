/**
 * Line-level lexical helpers for QB64PE source (vscode-free).
 *
 * QB64PE lexical rules relied on here:
 *  - String literals are double-quoted with NO escape sequences; an
 *    unterminated string runs to the end of the line.
 *  - `'` starts a comment to end of line; `REM` does too, but only at the
 *    start of a statement (line start or after `:`).
 *  - `:` separates statements when outside strings and comments.
 *  - Metacommands (`$CONSOLE:ONLY`, `'$INCLUDE:'x.bi'`, `$IF …`) must be
 *    first on the line. They contain `:` and `'` that are NOT separators or
 *    comments, so a metacommand line is returned as one unbroken code span.
 *  - A trailing ` _` (outside strings/comments) continues the statement on
 *    the next line.
 *
 * `scanLine` does one pass and the other helpers derive from its result.
 * The mask it returns has the same length as the input with string literals
 * (quotes included) and comments blanked to spaces, so any regex match on
 * the mask yields columns valid for the original line.
 */

export type SpanKind = "string" | "comment";

export interface Span {
  start: number;
  /** Exclusive. */
  end: number;
  kind: SpanKind;
}

export interface LineScan {
  /** Same length as the input; strings and comments replaced by spaces. */
  mask: string;
  /** Column where the trailing comment starts, or -1 when there is none. */
  commentStart: number;
  /** Columns of statement-separating colons. */
  colons: number[];
  spans: Span[];
  /** True for `$META…` / `'$META…` lines. */
  isMetacommand: boolean;
}

export interface Statement {
  /** Statement text with surrounding whitespace and any comment removed. */
  text: string;
  /** Column of `text[0]` in the original line. */
  start: number;
}

export interface Identifier {
  word: string;
  start: number;
  /** Exclusive. */
  end: number;
}

const IDENT_CHAR = /[A-Za-z0-9_]/;
const METACOMMAND = /^\s*'?\$[A-Za-z]/;

/**
 * Identifier with an optional QB64PE type sigil. Order matters: two-character
 * sigils (`%%` byte, `&&` int64, `##` float) before their one-character
 * prefixes; `~` marks unsigned. `$` is the string sigil. A leading `$` is
 * accepted so metacommand names (`$CONSOLE`) lex as one token.
 */
const IDENTIFIER = /\$?[A-Za-z_][A-Za-z0-9_]*(?:~?(?:%%|&&|##|[%&!#`])|\$)?/g;

export function scanLine(line: string): LineScan {
  const n = line.length;
  const colons: number[] = [];
  const spans: Span[] = [];

  if (METACOMMAND.test(line)) {
    return { mask: line, commentStart: -1, colons, spans, isMetacommand: true };
  }

  const mask = line.split("");
  let commentStart = -1;
  let atStatementStart = true;
  let i = 0;

  while (i < n) {
    const c = line[i];

    if (c === '"') {
      const start = i;
      i++;
      while (i < n && line[i] !== '"') i++;
      const end = Math.min(i + 1, n); // include the closing quote if present
      for (let k = start; k < end; k++) mask[k] = " ";
      spans.push({ start, end, kind: "string" });
      i = end;
      atStatementStart = false;
      continue;
    }

    if (c === "'") {
      commentStart = i;
      break;
    }

    if (
      atStatementStart &&
      (c === "R" || c === "r") &&
      /^rem$/i.test(line.substring(i, i + 3)) &&
      (i + 3 >= n || !IDENT_CHAR.test(line[i + 3]))
    ) {
      commentStart = i;
      break;
    }

    if (c === ":") {
      colons.push(i);
      atStatementStart = true;
      i++;
      continue;
    }

    if (!/\s/.test(c)) atStatementStart = false;
    i++;
  }

  if (commentStart >= 0) {
    for (let k = commentStart; k < n; k++) mask[k] = " ";
    spans.push({ start: commentStart, end: n, kind: "comment" });
  }

  return {
    mask: mask.join(""),
    commentStart,
    colons,
    spans,
    isMetacommand: false,
  };
}

/**
 * The line with string literals and comments blanked to spaces. Same length
 * as the input, so columns are preserved.
 */
export function stripCommentsAndStrings(
  line: string,
  scan: LineScan = scanLine(line)
): string {
  return scan.mask;
}

/** The line with any trailing comment removed; string literals are kept. */
export function stripComment(
  line: string,
  scan: LineScan = scanLine(line)
): string {
  return scan.commentStart >= 0 ? line.substring(0, scan.commentStart) : line;
}

export function isInCommentOrString(
  line: string,
  col: number,
  scan: LineScan = scanLine(line)
): boolean {
  return scan.spans.some((s) => col >= s.start && col < s.end);
}

/**
 * Splits a line into its `:`-separated statements (comment removed, strings
 * intact). A label line like `handler:` yields `["handler", ""]`.
 */
export function splitStatements(
  line: string,
  scan: LineScan = scanLine(line)
): Statement[] {
  const code = stripComment(line, scan);
  const bounds = [-1, ...scan.colons, code.length];
  const statements: Statement[] = [];

  for (let b = 0; b < bounds.length - 1; b++) {
    const from = bounds[b] + 1;
    const to = bounds[b + 1];
    const raw = code.substring(from, to);
    const leading = raw.length - raw.trimStart().length;
    statements.push({ text: raw.trim(), start: from + leading });
  }

  return statements;
}

/** True when the statement continues on the next line (`… _`). */
export function hasLineContinuation(
  line: string,
  scan: LineScan = scanLine(line)
): boolean {
  return /(^|\s)_\s*$/.test(scan.mask);
}

/**
 * The identifier (with its type sigil) at `col`, or null when `col` is in a
 * comment/string or not on an identifier. Like VS Code's word ranges, a
 * cursor immediately after an identifier still selects it. Dots are not part
 * of an identifier, so `a.b.c` yields the single segment under the cursor.
 */
export function identifierAt(
  line: string,
  col: number,
  scan: LineScan = scanLine(line)
): Identifier | null {
  if (isInCommentOrString(line, col, scan)) return null;

  IDENTIFIER.lastIndex = 0;
  let trailing: Identifier | null = null;
  let match: RegExpExecArray | null;

  while ((match = IDENTIFIER.exec(scan.mask)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (start <= col && col < end) return { word: match[0], start, end };
    if (end === col) trailing = { word: match[0], start, end };
    if (start > col) break;
  }

  return trailing;
}

/** Every identifier in the code portion of a line, in order. */
export function identifiersIn(
  line: string,
  scan: LineScan = scanLine(line)
): Identifier[] {
  const result: Identifier[] = [];
  IDENTIFIER.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IDENTIFIER.exec(scan.mask)) !== null) {
    result.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return result;
}
