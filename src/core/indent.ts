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

/** Classify a physical line by its block role, using masked (string/comment-free) code. */
export function classify(raw: string, opts: IndentOptions = {}): LineClass {
  const indentSubs = opts.indentSubs !== false;
  const scan = scanLine(raw);
  // Metacommand conditional blocks ($IF / $ELSE / $END IF).
  if (scan.isMetacommand) {
    const m = raw.trim().toUpperCase();
    if (/^\$IF\b/.test(m)) return { ...NONE, opens: true };
    if (/^\$END\s*IF\b/.test(m)) return { ...NONE, closes: true };
    if (/^\$ELSE(IF)?\b/.test(m)) return { ...NONE, mid: true };
    return NONE;
  }

  const code = scan.mask.replace(/'.*$/, "").trim();
  const continuation = /_\s*$/.test(code);
  const upper = code.toUpperCase();
  const first = upper.split(/[\s:(]/, 1)[0];

  const has = (re: RegExp) => re.test(upper);
  const r = (over: Partial<LineClass>): LineClass => ({ ...NONE, ...over, continuation });

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
