/**
 * Column alignment for QB64PE source (vscode-free, unit-tested).
 *
 * A faithful port of the user's `align-qb64pe.py`, but built on the shared
 * lexer: `scanLine()` returns a same-length `mask` (string literals and
 * comments blanked to spaces) plus the comment column and the statement
 * separating `:` columns. Because the mask preserves columns, a match on it
 * maps 1:1 to the source, and a `'`, `=`, `:` or `AS` inside a string is never
 * mistaken for code — no separate string scanner needed.
 *
 * Five independent passes, each opt-in:
 *   assignments  align `=` within consecutive assignment blocks (pads the LHS)
 *   declarations align `AS` within TYPE/DIM declaration groups
 *   case         align `CASE "KEY": lhs = rhs` (two columns: the `:` and the `=`)
 *   colons       align `:` statement separators
 *   comments     align inline `'` comments to a shared column
 *
 * Given `isRoutine`, a `label: statement` line is first split so the label
 * stands on its own line (see labels.ts) — the one pass that changes line count.
 *
 * `scope` controls grouping for declarations / colons / comments:
 *   "block"   group within SUB/FUNCTION/TYPE blocks and indent level (global-ish)
 *   "section" group between blank / pure-comment delimiter lines
 * (assignments and case are always block/consecutive as in the reference tool.)
 *
 * Every pass only ever rewrites interior whitespace and padding — never the
 * code tokens themselves — so it is behaviour-preserving (QB64PE ignores the
 * extra spaces it introduces).
 */
import { scanLine } from "./lexer";
import { splitInlineLabels } from "./labels";

export interface AlignOptions {
  /** Align `=` in consecutive assignment blocks. */
  assignments?: boolean;
  /** Align `AS` in TYPE/DIM declaration groups. */
  declarations?: boolean;
  /** Align `CASE "KEY":` inline assignments (two columns). */
  case?: boolean;
  /** Align `:` statement separators. */
  colons?: boolean;
  /** Align inline `'` comments. */
  comments?: boolean;
  /** Grouping for declarations/colons/comments. */
  scope?: "block" | "section";
  /** Spaces to leave at each alignment column (default 1). */
  gap?: number;
  /**
   * When given, split `label: statement` lines so the label stands alone.
   * Must return true for any SUB/FUNCTION name (and when unsure).
   */
  isRoutine?: (name: string) => boolean;
}

const DEFAULTS: Required<Omit<AlignOptions, "isRoutine">> = {
  assignments: true,
  declarations: true,
  case: true,
  colons: true,
  comments: true,
  scope: "block",
  gap: 1,
};

/** Run the enabled passes over `text` and return the aligned text. */
export function align(text: string, options: AlignOptions = {}): string {
  const o = { ...DEFAULTS, ...options };
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let lines = text.split(/\r?\n/);

  if (o.isRoutine) lines = splitInlineLabels(lines, o.isRoutine);
  // Order mirrors align-qb64pe.py: structural columns first, comments last so
  // they line up against the already-padded code.
  if (o.assignments) lines = alignAssignments(lines, o.gap);
  if (o.declarations) lines = alignDeclarations(lines, o.gap, o.scope);
  if (o.case) lines = alignCase(lines, o.gap);
  if (o.colons) lines = alignColons(lines, o.gap, o.scope);
  if (o.comments) lines = alignComments(lines, o.gap, o.scope);

  return lines.join(eol);
}

// ---------------------------------------------------------------------------
// Position finders (mask-based)
// ---------------------------------------------------------------------------

const CTRL_PREFIX = /^(FOR|WHILE|IF|ELSEIF|_IF|UNTIL|DO\s+WHILE|DO\s+UNTIL|LOOP\s+WHILE|LOOP\s+UNTIL)\b/;
const AS_EXCLUDE = /^(OPEN|LOCK|UNLOCK|GET|PUT|SEEK|FOR)\b/;
const BLOCK_BOUNDARY = /^(SUB|FUNCTION|TYPE|END\s+SUB|END\s+FUNCTION|END\s+TYPE)\b/i;
const DIM_KEYWORD_ONLY = /^(DIM|DIM\s+SHARED|REDIM|REDIM\s+SHARED)$/i;

/** Column of the assignment `=`, or -1 (skips comparisons, control flow, compound `+=`-style). */
function findEqPos(raw: string): number {
  const scan = scanLine(raw);
  if (scan.isMetacommand) return -1;
  const mask = scan.mask;
  const trimmed = mask.trimStart();
  if (!trimmed || raw.trimStart().startsWith("'")) return -1;
  if (CTRL_PREFIX.test(trimmed.toUpperCase())) return -1;

  // Code region ends at the comment or the first statement-separating colon.
  let end = mask.length;
  if (scan.commentStart >= 0) end = Math.min(end, scan.commentStart);
  if (scan.colons.length) end = Math.min(end, scan.colons[0]);

  let eq = -1;
  for (let i = 0; i < end; i++) {
    if (mask[i] !== "=") continue;
    const prev = mask[i - 1];
    if (prev === "<" || prev === ">" || prev === "!") continue; // <= >= <>
    eq = i;
    break;
  }
  if (eq < 0) return -1;

  // Compound/augmented assignment (n& = n& + 1): RHS starts with the LHS token
  // followed by an operator — leave those out of alignment.
  const lhsTok = raw.slice(0, eq).trim();
  const rhs = raw.slice(eq + 1).trimStart();
  if (lhsTok && rhs.toUpperCase().startsWith(lhsTok.toUpperCase())) {
    const after = rhs.slice(lhsTok.length).trimStart();
    if (after && ("+-*/\\&".includes(after[0]) || /^(AND|OR|XOR)\b/i.test(after))) {
      return -1;
    }
  }
  return eq;
}

/** Column of the space before ` AS ` in a TYPE/DIM declaration, or -1. */
function findAsPos(raw: string): number {
  const scan = scanLine(raw);
  if (scan.isMetacommand) return -1;
  const mask = scan.mask;
  const trimmed = mask.trim();
  if (!trimmed || raw.trimStart().startsWith("'")) return -1;
  if (AS_EXCLUDE.test(trimmed.toUpperCase())) return -1;

  const upper = mask.toUpperCase();
  const end = scan.commentStart >= 0 ? scan.commentStart : mask.length;
  for (let i = 0; i + 4 <= end; i++) {
    if (upper.slice(i, i + 4) !== " AS ") continue;
    const lhs = raw.slice(0, i).trim();
    if (lhs.includes("(") || lhs.includes(")")) continue; // parameter list / array
    if (DIM_KEYWORD_ONLY.test(lhs)) continue; // "DIM AS TYPE varlist" — type precedes name
    return i;
  }
  return -1;
}

/** Column of the `:` in a `CASE "KEY": code` line, or -1. */
function findCaseColonPos(raw: string): number {
  const scan = scanLine(raw);
  if (scan.isMetacommand || scan.colons.length === 0) return -1;
  const colon = scan.colons[0];
  const label = raw.slice(0, colon);
  if (!/^\s*CASE\s+"[^"]*"\s*$/i.test(label)) return -1;
  const end = scan.commentStart >= 0 ? scan.commentStart : raw.length;
  const rest = raw.slice(colon + 1, end).trim();
  return rest ? colon : -1;
}

/** Column of an alignable inline comment, or -1 (pure-comment and THEN lines excluded). */
function findCommentPos(raw: string): number {
  const scan = scanLine(raw);
  if (scan.isMetacommand || scan.commentStart < 0) return -1;
  if (!raw.slice(0, scan.commentStart).trim()) return -1; // pure comment line
  // Control-flow lines (…THEN… 'x) tend to dwarf adjacent assignments — skip.
  if (/\bTHEN\b/i.test(scan.mask.slice(0, scan.commentStart))) return -1;
  return scan.commentStart;
}

/** Statement-separating `:` columns that have real (non-comment) content after them. */
function findColonPositions(raw: string): number[] {
  const scan = scanLine(raw);
  if (scan.isMetacommand || scan.colons.length === 0) return [];
  const end = scan.commentStart >= 0 ? scan.commentStart : raw.length;
  return scan.colons.filter((p) => raw.slice(p + 1, end).trim() !== "");
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

function isBlockBoundary(raw: string): boolean {
  return BLOCK_BOUNDARY.test(raw.trim());
}

function indentOf(raw: string): number {
  return raw.length - raw.trimStart().length;
}

// ---------------------------------------------------------------------------
// Pass: align `=` (consecutive assignment groups)
// ---------------------------------------------------------------------------

function alignAssignments(lines: string[], gap: number): string[] {
  const out = [...lines];
  const pad = " ".repeat(gap);
  let i = 0;
  while (i < lines.length) {
    const group: Array<{ idx: number; eq: number }> = [];
    while (i < lines.length) {
      const eq = findEqPos(lines[i]);
      if (eq < 0) break;
      group.push({ idx: i, eq });
      i++;
    }
    if (group.length === 0) {
      i++;
      continue;
    }
    const maxLhs = Math.max(...group.map((g) => out[g.idx].slice(0, g.eq).trimEnd().length));
    for (const { idx, eq } of group) {
      const raw = out[idx];
      const lhs = raw.slice(0, eq).trimEnd();
      const rhs = raw.slice(eq + 1).trimStart();
      out[idx] = lhs.padEnd(maxLhs) + pad + "= " + rhs;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pass: align `AS` (declaration groups)
// ---------------------------------------------------------------------------

function alignDeclarations(lines: string[], gap: number, scope: "block" | "section"): string[] {
  const groups = scope === "block" ? asGroupsBlock(lines) : asGroupsSection(lines);
  return applyAsGroups(lines, groups, gap);
}

/** Consecutive runs of ` AS ` declaration lines (blank / non-AS lines break). */
function asGroupsSection(lines: string[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (findAsPos(lines[i]) >= 0) {
      current.push(i);
    } else if (current.length) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

/** ` AS ` lines grouped within block boundaries and by indent level. */
function asGroupsBlock(lines: string[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  let indent: number | null = null;
  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
    indent = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (isBlockBoundary(raw) || !raw.trim()) {
      flush();
      continue;
    }
    if (findAsPos(raw) >= 0) {
      const ind = indentOf(raw);
      if (indent === null) indent = ind;
      else if (ind !== indent) {
        flush();
        indent = ind;
      }
      current.push(i);
    }
  }
  flush();
  return groups;
}

function applyAsGroups(lines: string[], groups: number[][], gap: number): string[] {
  const out = [...lines];
  const pad = " ".repeat(gap);
  for (const group of groups) {
    const positions = group.map((idx) => ({ idx, as: findAsPos(out[idx]) }));
    const maxLhs = Math.max(...positions.map((p) => out[p.idx].slice(0, p.as).trimEnd().length));
    for (const { idx, as } of positions) {
      const raw = out[idx];
      const lhs = raw.slice(0, as).trimEnd();
      const rest = raw.slice(as + 4); // after " AS "
      out[idx] = lhs.padEnd(maxLhs) + pad + "AS " + rest;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pass: align `CASE "KEY": lhs = rhs` (two columns)
// ---------------------------------------------------------------------------

function alignCase(lines: string[], gap: number): string[] {
  // Group between blank / pure-comment delimiter lines (section-aware, as in
  // the reference tool's default CASE behaviour).
  const groups: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (!stripped || stripped.startsWith("'")) {
      if (current.length) groups.push(current);
      current = [];
      continue;
    }
    if (findCaseColonPos(lines[i]) >= 0) {
      current.push(i);
    } else if (current.length) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);

  const out = [...lines];
  for (const group of groups) {
    if (group.length < 2) continue;

    // Phase 1: align the label / `:` column.
    const maxLabel = Math.max(
      ...group.map((idx) => out[idx].slice(0, findCaseColonPos(out[idx]) + 1).trimEnd().length)
    );
    const asgnCol = maxLabel + gap;
    const step1 = group.map((idx) => {
      const raw = out[idx];
      const colon = findCaseColonPos(raw);
      const label = raw.slice(0, colon + 1).trimEnd();
      const assignment = raw.slice(colon + 1).trimStart();
      return { idx, text: label.padEnd(asgnCol) + assignment };
    });

    // Phase 2: align the `=` within the assignment portion.
    const eqInfo = step1.map(({ idx, text }) => {
      const asgn = text.slice(asgnCol);
      const eq = findEqPos(asgn);
      return { idx, text, eq, lhsLen: eq >= 0 ? asgn.slice(0, eq).trimEnd().length : 0 };
    });
    const withEq = eqInfo.filter((e) => e.eq >= 0);
    const eqCol = withEq.length ? asgnCol + Math.max(...withEq.map((e) => e.lhsLen)) + gap : -1;

    for (const { idx, text, eq } of eqInfo) {
      if (eqCol >= 0 && eq >= 0) {
        const beforeEq = (text.slice(0, asgnCol) + text.slice(asgnCol, asgnCol + eq)).trimEnd();
        const afterEq = text.slice(asgnCol + eq + 1).trimStart();
        out[idx] = beforeEq.padEnd(eqCol) + "= " + afterEq;
      } else {
        out[idx] = text;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pass: align `:` statement separators
// ---------------------------------------------------------------------------

function alignColons(lines: string[], gap: number, scope: "block" | "section"): string[] {
  const groups = scope === "block" ? colonGroupsBlock(lines) : colonGroupsSection(lines);
  return applyColonGroups(lines, groups, gap);
}

function colonGroupsSection(lines: string[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (!stripped || stripped.startsWith("'")) {
      if (current.length) groups.push(current);
      current = [];
      continue;
    }
    if (findColonPositions(lines[i]).length) current.push(i);
    else if (current.length) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function colonGroupsBlock(lines: string[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  let indent: number | null = null;
  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
    indent = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw.trim();
    if (isBlockBoundary(raw) || !stripped) {
      flush();
      continue;
    }
    if (stripped.startsWith("'")) continue; // pure comment: skip, don't break
    if (findColonPositions(raw).length) {
      const ind = indentOf(raw);
      if (indent === null) indent = ind;
      else if (ind !== indent) {
        flush();
        indent = ind;
      }
      current.push(i);
    } else {
      flush();
    }
  }
  flush();
  return groups;
}

function applyColonGroups(lines: string[], groups: number[][], gap: number): string[] {
  const out = [...lines];
  for (const group of groups) {
    if (group.length < 2) continue;
    const rows = group.map((idx) => ({ idx, segs: splitColons(out[idx], findColonPositions(out[idx])) }));
    const maxColons = Math.max(...rows.map((r) => r.segs.length - 1));

    // Normalise each slot: slot 0 keeps indentation (rstrip); later slots get a
    // single leading space + trimmed content. Then measure the widest slot.
    const norm = (slot: number, seg: string): string => {
      if (slot === 0) return seg.trimEnd();
      const s = seg.trim();
      return s ? " " + s : "";
    };
    const slotMax: number[] = [];
    for (let s = 0; s < maxColons; s++) {
      let w = 0;
      for (const { segs } of rows) if (s < segs.length - 1) w = Math.max(w, norm(s, segs[s]).length);
      slotMax.push(w);
    }

    for (const { idx, segs } of rows) {
      const parts: string[] = [];
      for (let s = 0; s < segs.length; s++) {
        if (s < segs.length - 1) {
          let n = norm(s, segs[s]);
          if (s < slotMax.length) n = n.padEnd(slotMax[s] + gap);
          parts.push(n + ":");
        } else {
          const last = segs[s].trimStart();
          parts.push(last ? " " + last : segs[s]);
        }
      }
      out[idx] = parts.join("");
    }
  }
  return out;
}

function splitColons(raw: string, positions: number[]): string[] {
  const segs: string[] = [];
  let prev = 0;
  for (const p of positions) {
    segs.push(raw.slice(prev, p));
    prev = p + 1;
  }
  segs.push(raw.slice(prev));
  return segs;
}

// ---------------------------------------------------------------------------
// Pass: align inline comments
// ---------------------------------------------------------------------------

function alignComments(lines: string[], gap: number, scope: "block" | "section"): string[] {
  return scope === "block" ? alignCommentsBlock(lines, gap) : alignCommentsSection(lines, gap);
}

/** Blank / pure-comment lines delimit sections; only groups of ≥2 are aligned. */
function alignCommentsSection(lines: string[], gap: number): string[] {
  const out = [...lines];
  const sections: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (!stripped || stripped.startsWith("'")) {
      if (current.length) sections.push(current);
      current = [];
      continue;
    }
    if (findCommentPos(lines[i]) >= 0) current.push(i);
  }
  if (current.length) sections.push(current);

  for (const section of sections) {
    if (section.length < 2) continue;
    padComments(out, section, gap);
  }
  return out;
}

/** Group within block boundaries + indent; comment/blank skipped (don't break); lone lines normalised. */
function alignCommentsBlock(lines: string[], gap: number): string[] {
  const out = [...lines];
  const groups: number[][] = [];
  let current: number[] = [];
  let indent: number | null = null;
  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
    indent = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw.trim();
    if (isBlockBoundary(raw)) {
      flush();
      if (findCommentPos(raw) >= 0) groups.push([i]); // boundary's own comment, normalised solo
      continue;
    }
    if (!stripped || stripped.startsWith("'")) continue; // skip, don't break
    if (findCommentPos(raw) >= 0) {
      const ind = indentOf(raw);
      if (indent === null) indent = ind;
      else if (ind !== indent) {
        flush();
        indent = ind;
      }
      current.push(i);
    }
  }
  flush();

  for (const group of groups) padComments(out, group, gap);
  return out;
}

function padComments(out: string[], group: number[], gap: number): void {
  const positions = group.map((idx) => ({ idx, pos: findCommentPos(out[idx]) }));
  const maxCode = Math.max(...positions.map((p) => out[p.idx].slice(0, p.pos).trimEnd().length));
  const target = maxCode + gap;
  for (const { idx, pos } of positions) {
    const code = out[idx].slice(0, pos).trimEnd();
    const comment = out[idx].slice(pos);
    out[idx] = code.padEnd(target) + comment;
  }
}
