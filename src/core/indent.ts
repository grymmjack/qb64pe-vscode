/**
 * Block-aware re-indentation for QB64PE (vscode-free, unit-tested).
 *
 * This changes ONLY the leading whitespace of each line, never the code itself,
 * so it can reformat safely without any risk of altering program behaviour
 * (QB64PE ignores leading whitespace). Strings and comments are masked via the
 * lexer so keywords inside them never affect nesting.
 *
 * Handles SUB/FUNCTION, block IF/ELSE/ELSEIF/END IF (single-line IF left alone),
 * FOR/NEXT, DO/LOOP, WHILE/WEND, SELECT CASE/CASE/END SELECT, TYPE, DECLARE
 * LIBRARY, and `$IF`/`$ELSE`/`$END IF` metacommands, plus `_` line continuation.
 */
import { scanLine } from "./lexer";

export interface IndentOptions {
  /** Indent SUB/FUNCTION bodies (QB64 IDE: "Indent SUBs and FUNCTIONs"). */
  indentSubs?: boolean;
}

/** Re-indent `text` using `unit` (e.g. "  ", "    ", or "\t") per level. */
export function reindent(text: string, unit: string, opts: IndentOptions = {}): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  return reindentLines(lines, unit, opts).join(eol);
}

interface Frame {
  /** SELECT frames track whether a CASE body is currently open. */
  caseOpen?: boolean;
  select?: boolean;
}

export function reindentLines(lines: string[], unit: string, opts: IndentOptions = {}): string[] {
  const out: string[] = [];
  let depth = 0;
  const selects: Frame[] = []; // active SELECT blocks (for CASE handling)
  let continued = false; // previous physical line ended with `_`

  for (const raw of lines) {
    const content = raw.trim();
    if (content.length === 0) {
      out.push("");
      continue;
    }

    const c = classify(raw, opts);

    // Continuation lines are indented one extra level and don't change depth.
    if (continued) {
      out.push(indentStr(unit, depth + 1) + content);
      continued = c.continuation;
      continue;
    }

    // Work out the indent level this line renders at, plus depth changes.
    let render = depth;

    if (c.endSelect) {
      // Close the last CASE body (if any) and the SELECT itself.
      const frame = selects.pop();
      if (frame?.caseOpen) depth = Math.max(0, depth - 1);
      depth = Math.max(0, depth - 1);
      render = depth;
    } else if (c.case) {
      const frame = selects[selects.length - 1];
      if (frame?.caseOpen) depth = Math.max(0, depth - 1); // close previous CASE body
      render = depth;
      depth += 1; // open this CASE body
      if (frame) frame.caseOpen = true;
    } else if (c.closes) {
      depth = Math.max(0, depth - 1);
      render = depth;
    } else if (c.mid) {
      render = Math.max(0, depth - 1); // ELSE/ELSEIF render one out; body stays at depth
    }

    out.push(indentStr(unit, render) + content);

    if (c.select) {
      selects.push({ select: true, caseOpen: false });
      depth += 1;
    } else if (c.opens) {
      depth += 1;
    }

    continued = c.continuation;
  }

  return out;
}

function indentStr(unit: string, level: number): string {
  return level > 0 ? unit.repeat(level) : "";
}

interface LineClass {
  opens: boolean;
  closes: boolean;
  mid: boolean;
  select: boolean;
  case: boolean;
  endSelect: boolean;
  continuation: boolean;
}

const NONE: LineClass = {
  opens: false,
  closes: false,
  mid: false,
  select: false,
  case: false,
  endSelect: false,
  continuation: false,
};

/** Split masked code into statements at the lexer's statement-separating colons. */
function splitAtColons(code: string, colons: number[]): string[] {
  if (!colons || colons.length === 0) return [code];
  const parts: string[] = [];
  let start = 0;
  for (const idx of colons) {
    if (idx >= start && idx <= code.length) {
      parts.push(code.slice(start, idx));
      start = idx + 1;
    }
  }
  parts.push(code.slice(start));
  return parts;
}

/**
 * Classify a physical line by its block role, using masked (string/comment-free)
 * code. Colon-joined statements are handled: a block keyword in any statement
 * counts, so `DIM i AS LONG: FOR i = 0 TO 9` opens a FOR body (reported by
 * a740g — previously only the first token, `DIM`, was examined).
 */
export function classify(raw: string, opts: IndentOptions = {}): LineClass {
  const scan = scanLine(raw);
  // Metacommand conditional blocks ($IF / $ELSE / $END IF).
  if (scan.isMetacommand) {
    const m = raw.trim().toUpperCase();
    if (/^\$IF\b/.test(m)) return { ...NONE, opens: true };
    if (/^\$END\s*IF\b/.test(m)) return { ...NONE, closes: true };
    if (/^\$ELSE(IF)?\b/.test(m)) return { ...NONE, mid: true };
    return NONE;
  }

  const codeFull = scan.mask.replace(/'.*$/, "");
  const continuation = /_\s*$/.test(codeFull.trim());
  const stmts = splitAtColons(codeFull, scan.colons).map((s) => s.trim()).filter((s) => s.length > 0);

  // Single statement (the overwhelming majority): classify it directly.
  if (stmts.length <= 1) return { ...classifyStatement(stmts[0] ?? "", opts), continuation };

  // Multiple statements. How the line RENDERS comes from the first statement
  // (e.g. `NEXT i : x = 1` dedents); the NET block delta comes from all of them
  // (so `DIM i: FOR …` opens, and an inline `FOR …: … : NEXT` nets to zero).
  const primary = classifyStatement(stmts[0], opts);
  // SELECT/CASE need the select stack in reindentLines; a multi-statement line
  // starting with one is not real code — defer to the first statement's class.
  if (primary.select || primary.case || primary.endSelect) return { ...primary, continuation };

  let delta = 0;
  for (const s of stmts) {
    const cs = classifyStatement(s, opts);
    if (cs.opens) delta += 1;
    else if (cs.closes) delta -= 1;
  }

  if (primary.mid || primary.closes) {
    // Line renders one level out. Depth then follows the net delta.
    if (delta < 0) return { ...NONE, closes: true, continuation }; // e.g. NEXT i : x = 1
    return { ...NONE, mid: true, continuation }; // renders out, net depth unchanged
  }
  // First statement is neutral or an opener: render at current depth.
  if (delta > 0) return { ...NONE, opens: true, continuation };
  if (delta < 0) return { ...NONE, closes: true, continuation };
  return { ...NONE, continuation };
}

/** Classify a single statement (no statement-separating colons) by block role. */
function classifyStatement(code: string, opts: IndentOptions = {}): LineClass {
  const indentSubs = opts.indentSubs !== false;
  const upper = code.trim().toUpperCase();
  if (!upper) return NONE;
  const first = upper.split(/[\s:(]/, 1)[0];

  const has = (re: RegExp) => re.test(upper);
  const r = (over: Partial<LineClass>): LineClass => ({ ...NONE, ...over });

  // SELECT ... / CASE ... / END SELECT
  if (/^END\s+SELECT\b/.test(upper) || first === "ENDSELECT") return r({ endSelect: true });
  if (/^SELECT\b/.test(upper)) return r({ select: true });
  if (first === "CASE") return r({ case: true });

  // Closers.
  if (/^END\s+(SUB|FUNCTION)\b/.test(upper) || first === "ENDSUB" || first === "ENDFUNCTION") {
    return r({ closes: indentSubs }); // paired with the SUB/FUNCTION opener
  }
  if (
    /^END\s+(IF|TYPE|DECLARE)\b/.test(upper) ||
    first === "ENDIF" || first === "ENDTYPE" ||
    first === "LOOP" || first === "WEND" || first === "NEXT"
  ) {
    return r({ closes: true });
  }

  // Mid keywords.
  if (first === "ELSE" || first === "ELSEIF") {
    // ELSEIF ... THEN opens a body just like ELSE.
    return r({ mid: true });
  }

  // Openers.
  if (first === "SUB" || first === "FUNCTION") {
    if (/^DECLARE\b/.test(upper)) return r({}); // DECLARE SUB/FUNCTION prototypes don't nest
    return r({ opens: indentSubs });
  }
  if (first === "TYPE") return r({ opens: true });
  if (/^DECLARE\s+(DYNAMIC\s+)?LIBRARY\b/.test(upper)) return r({ opens: true });

  if (first === "IF") {
    // Block IF only when THEN ends the line (nothing executable after it).
    if (/\bTHEN\s*$/.test(upper)) return r({ opens: true });
    return r({}); // single-line IF (IF ... THEN foo / IF ... GOTO n)
  }
  if (first === "FOR") {
    if (/\bNEXT\b/.test(upper)) return r({}); // inline FOR ... NEXT
    return r({ opens: true });
  }
  if (first === "DO") {
    if (/\bLOOP\b/.test(upper)) return r({});
    return r({ opens: true });
  }
  if (first === "WHILE") {
    if (/\bWEND\b/.test(upper)) return r({});
    return r({ opens: true });
  }

  return r({});
}
