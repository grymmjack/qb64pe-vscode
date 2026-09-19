/**
 * Parse static array bounds from a QB64PE declaration (vscode-free, unit-tested).
 *
 * The vwatch runtime exposes no array bounds, so to list an array's elements in
 * the debugger's Variables view we recover the bounds from the source `DIM`/
 * `REDIM`/`STATIC`/`COMMON` declaration. Only integer-literal, single-dimension
 * bounds are returned — dynamic (`REDIM a(n)`) and multi-dimensional arrays
 * return null and are left as a "watch by index" hint, so we never read past the
 * real end of an array.
 */
export interface ArrayBounds {
  lower: number;
  upper: number;
}

const DECL_RE = /^\s*(?:DIM|REDIM|STATIC|COMMON)\b/i;

/** OPTION BASE for the program: 1 if `OPTION BASE 1` appears, else 0. */
export function optionBase(source: string): 0 | 1 {
  return /^[ \t]*OPTION[ \t]+BASE[ \t]+1\b/im.test(source) ? 1 : 0;
}

/**
 * Bounds of `name`'s single dimension from a declaration line, or null when the
 * line does not declare `name` as a 1-D array with integer-literal bounds.
 * `base` supplies the lower bound when only an upper bound is written (`a(10)`).
 */
export function parseArrayBounds(
  line: string,
  name: string,
  base: 0 | 1
): ArrayBounds | null {
  if (!DECL_RE.test(line)) return null;
  const dims = extractDims(line, name);
  if (dims === null) return null;
  const parts = splitTopLevel(dims);
  if (parts.length !== 1) return null; // only 1-D arrays are auto-expanded
  const d = parts[0].trim();

  const range = /^(-?\d+)\s+TO\s+(-?\d+)$/i.exec(d);
  if (range) {
    const lo = parseInt(range[1], 10);
    const hi = parseInt(range[2], 10);
    return hi >= lo ? { lower: lo, upper: hi } : null;
  }

  const single = /^(-?\d+)$/.exec(d);
  if (single) {
    const hi = parseInt(single[1], 10);
    return hi >= base ? { lower: base, upper: hi } : null;
  }

  return null; // non-literal bound (variable/expression) — don't guess
}

/** The text inside `name(...)` in a declaration, or null if `name(` isn't found. */
function extractDims(line: string, name: string): string | null {
  // name, optional type sigil(s), optional spaces, then '('
  const re = new RegExp(
    `\\b${escapeRegExp(name)}[%&!#$~]*\\s*\\(`,
    "i"
  );
  const m = re.exec(line);
  if (!m) return null;
  const open = m.index + m[0].length - 1; // index of '('
  let depth = 0;
  for (let i = open; i < line.length; i++) {
    const c = line[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return line.slice(open + 1, i);
    }
  }
  return null; // unbalanced
}

/** Split on commas that are not nested inside parentheses. */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
