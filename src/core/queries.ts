/**
 * Position-based queries over a SymbolIndex (vscode-free): what symbol is
 * under the cursor, where is it declared, and where else does it occur.
 *
 * Scope rules applied, in precedence order, for a name at (file, line):
 *  1. inside a TYPE block: the TYPE's members
 *  2. inside a SUB/FUNCTION: the FUNCTION's own name (its return value), its
 *     parameters, then its locals
 *  3. non-local symbols of this file, then of the files it includes, then of
 *     the rest of its compilation unit (see SymbolIndex.unitOf); inside a
 *     routine, GLOBAL (SHARED) variables rank above MODULE ones, which need a
 *     SHARED statement that we do not track
 *  4. routines matched ignoring the type sigil (`Add(1, 2)` -> `FUNCTION Add%`)
 *  5. anything in the workspace, as a last resort
 *
 * Member access (`a.b.c`, `arr(1).x`) is resolved through the dotted chain:
 * owner -> its dataType -> TYPE -> member -> … -> FIELD.
 *
 * All the queries work on the text the index holds, so callers must keep the
 * index current (the VS Code adapter's ensureDocument does that).
 */
import { Parameter, QB64Symbol } from "./symbols";
import {
  SymbolIndex,
  normalizeBase,
  normalizeName,
  normalizePath,
} from "./index";
import {
  Identifier,
  LineScan,
  hasLineContinuation,
  identifierAt,
  identifiersIn,
  scanLine,
  splitStatements,
} from "./lexer";

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export type OccurrenceKind = "declaration" | "write" | "read";

export interface Occurrence {
  file: string;
  range: Range;
  kind: OccurrenceKind;
}

export interface Resolution {
  file: string;
  /** The identifier under the cursor, as written. */
  word: string;
  range: Range;
  /** Owners before the word for a member access (`["p", "pos"]` for `p.pos.x`). */
  chain: string[];
  /** Best match, or null for keywords/unknown names. */
  symbol: QB64Symbol | null;
  /** All matches in precedence order. */
  candidates: QB64Symbol[];
  /** For a resolved member access: the TYPE the field belongs to. */
  owner?: QB64Symbol;
}

const END = Number.MAX_SAFE_INTEGER;
const NAME_SRC = "[A-Za-z_][A-Za-z0-9_]*(?:~?(?:%%|&&|##|[%&!#`])|\\$)?";
const RE_ASSIGN = new RegExp(
  `^(LET\\s+)?(${NAME_SRC})((?:\\s*\\([^=]*\\))?(?:\\.[A-Za-z_][A-Za-z0-9_]*(?:\\s*\\([^=]*\\))?)*)\\s*=`,
  "i"
);
const RE_FOR = new RegExp(`^(FOR\\s+)(${NAME_SRC})\\s*=`, "i");

export function isRoutine(symbol: QB64Symbol): boolean {
  return symbol.type === "SUB" || symbol.type === "FUNCTION";
}

function nameEq(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

/** Identity for symbols, including synthesized parameter symbols. */
export function sameSymbol(a: QB64Symbol, b: QB64Symbol): boolean {
  return (
    a.file === b.file &&
    a.line === b.line &&
    a.type === b.type &&
    nameEq(a.name, b.name) &&
    !!a.isParameter === !!b.isParameter &&
    (a.parent ?? "") === (b.parent ?? "")
  );
}

export function enclosingRoutine(
  index: SymbolIndex,
  file: string,
  line: number
): QB64Symbol | null {
  let best: QB64Symbol | null = null;
  for (const s of index.symbolsOf(file)) {
    if (!isRoutine(s) || s.isExternal) continue;
    if (s.line <= line && line <= (s.endLine ?? END)) {
      if (!best || s.line > best.line) best = s;
    }
  }
  return best;
}

export function enclosingType(
  index: SymbolIndex,
  file: string,
  line: number
): QB64Symbol | null {
  for (const s of index.symbolsOf(file)) {
    if (s.type === "TYPE" && s.line <= line && line <= (s.endLine ?? END)) {
      return s;
    }
  }
  return null;
}

/** A routine parameter as a symbol; `line` is the routine's header line. */
export function parameterSymbol(
  routine: QB64Symbol,
  param: Parameter
): QB64Symbol {
  return {
    name: param.name,
    type: "VARIABLE",
    dataType: param.type,
    scope: "LOCAL",
    line: routine.line,
    file: routine.file,
    isParameter: true,
    isArray: param.isArray,
    parent: routine.name,
  };
}

/** Files whose symbols are visible from `file`, nearest first. */
export function visibleFiles(index: SymbolIndex, file: string): string[] {
  const key = normalizePath(file);
  const closure = index.closure(key);
  const inClosure = new Set(closure);
  return [
    key,
    ...closure.filter((f) => f !== key),
    ...index.unitOf(key).filter((f) => !inClosure.has(f)),
  ];
}

/** Candidates for `name` used at (file, line), best first. */
export function resolveName(
  index: SymbolIndex,
  file: string,
  line: number,
  name: string
): QB64Symbol[] {
  const key = normalizePath(file);
  const out: QB64Symbol[] = [];
  const add = (s: QB64Symbol) => {
    if (!out.some((o) => sameSymbol(o, s))) out.push(s);
  };

  const type = enclosingType(index, key, line);
  if (type) {
    for (const m of type.members ?? []) if (nameEq(m.name, name)) add(m);
  }

  const routine = enclosingRoutine(index, key, line);
  if (routine) {
    if (
      routine.type === "FUNCTION" &&
      normalizeBase(routine.name) === normalizeBase(name)
    ) {
      add(routine);
    }
    for (const p of routine.parameters ?? []) {
      if (nameEq(p.name, name)) add(parameterSymbol(routine, p));
    }
    const end = routine.endLine ?? END;
    for (const s of index.symbolsOf(key)) {
      if (
        s.scope === "LOCAL" &&
        s.line >= routine.line &&
        s.line <= end &&
        nameEq(s.name, name)
      ) {
        add(s);
      }
    }
  }

  const files = visibleFiles(index, key);
  const found: QB64Symbol[] = [];
  for (const f of files) {
    for (const s of index.lookup(name, [f])) {
      if (s.scope !== "LOCAL") found.push(s);
    }
  }
  if (routine) {
    // GLOBAL (SHARED) variables are visible in a routine; MODULE ones only
    // via SHARED statements, which we do not track - rank them last.
    found.sort((a, b) => rank(a) - rank(b));
  }
  found.forEach(add);

  if (out.length === 0) {
    for (const f of files) {
      for (const s of index.lookupBase(name, [f])) if (isRoutine(s)) add(s);
    }
  }
  if (out.length === 0) {
    for (const s of index.lookup(name)) if (s.scope !== "LOCAL") add(s);
    for (const s of index.lookupBase(name)) if (isRoutine(s)) add(s);
  }
  return out;
}

/**
 * Every symbol usable at (file, line), best-shadowing first and deduplicated
 * by name: the enclosing routine's parameters and locals, then non-local
 * symbols of this file, its includes and the rest of its unit (labels only
 * from this file). This is the candidate set for identifier completion.
 */
export function symbolsInScope(
  index: SymbolIndex,
  file: string,
  line: number
): QB64Symbol[] {
  const key = normalizePath(file);
  const out: QB64Symbol[] = [];
  const seen = new Set<string>();
  const add = (s: QB64Symbol) => {
    const k = normalizeName(s.name);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
  };

  const routine = enclosingRoutine(index, key, line);
  if (routine) {
    for (const p of routine.parameters ?? []) add(parameterSymbol(routine, p));
    const end = routine.endLine ?? END;
    for (const s of index.symbolsOf(key)) {
      if (s.scope === "LOCAL" && s.line >= routine.line && s.line <= end) add(s);
    }
  }

  const found: QB64Symbol[] = [];
  for (const f of visibleFiles(index, key)) {
    for (const s of index.symbolsOf(f)) {
      if (s.scope === "LOCAL") continue;
      if (s.type === "LABEL" && f !== key) continue;
      found.push(s);
    }
  }
  if (routine) found.sort((a, b) => rank(a) - rank(b));
  found.forEach(add);
  return out;
}

function rank(s: QB64Symbol): number {
  if (s.type !== "VARIABLE") return 0;
  return s.scope === "GLOBAL" ? 0 : 1;
}

/** Identifiers before `start` joined by dots, outermost first. */
export function chainBefore(
  line: string,
  scan: LineScan,
  start: number
): string[] {
  const chain: string[] = [];
  let i = start - 1;
  while (i >= 0 && scan.mask[i] === ".") {
    let j = i - 1;
    if (j >= 0 && scan.mask[j] === ")") {
      let depth = 0;
      while (j >= 0) {
        if (scan.mask[j] === ")") depth++;
        else if (scan.mask[j] === "(" && --depth === 0) break;
        j--;
      }
      j--;
    }
    const owner = j >= 0 ? identifierAt(line, j, scan) : null;
    if (!owner || owner.end !== j + 1) break;
    chain.unshift(owner.word);
    i = owner.start - 1;
  }
  return chain;
}

/** The TYPE symbol a variable/field/parameter is declared AS, if any. */
export function typeOf(
  index: SymbolIndex,
  file: string,
  line: number,
  symbol: QB64Symbol
): QB64Symbol | null {
  if (!symbol.dataType) return null;
  const typeName = symbol.dataType.split(/[\s*]/)[0];
  if (!typeName) return null;
  const found = resolveName(index, file, line, typeName).find(
    (s) => s.type === "TYPE"
  );
  return found ?? null;
}

function member(type: QB64Symbol, name: string): QB64Symbol | null {
  return (type.members ?? []).find((m) => nameEq(m.name, name)) ?? null;
}

/** Resolves `chain.field` at (file, line) to the owning TYPE and the FIELD. */
export function resolveMember(
  index: SymbolIndex,
  file: string,
  line: number,
  chain: string[],
  field: string
): { owner: QB64Symbol; field: QB64Symbol | null } | null {
  const first = resolveName(index, file, line, chain[0])[0];
  if (!first) return null;
  let type = typeOf(index, file, line, first);
  for (let k = 1; k < chain.length && type; k++) {
    const next = member(type, chain[k]);
    type = next ? typeOf(index, file, line, next) : null;
  }
  if (!type) return null;
  return { owner: type, field: member(type, field) };
}

export interface MemberContext {
  /** The TYPE whose members apply, or null when the owner did not resolve. */
  owner: QB64Symbol | null;
  members: QB64Symbol[];
  /** The partial member name typed so far (may be empty). */
  prefix: string;
  chain: string[];
}

/**
 * When the cursor sits right after `owner.` (optionally followed by a partial
 * name), the TYPE members that can complete it. Null when the cursor is not
 * in a member position at all; an unresolvable owner yields empty members.
 */
export function memberContextAt(
  index: SymbolIndex,
  file: string,
  position: Position
): MemberContext | null {
  const key = normalizePath(file);
  const text = index.get(key)?.lines[position.line];
  if (text === undefined) return null;

  const scan = scanLine(text);
  const partial = identifierAt(text, position.character, scan);
  const start = partial && partial.end === position.character ? partial.start : position.character;
  if (start === 0 || scan.mask[start - 1] !== ".") return null;

  const chain = chainBefore(text, scan, start);
  const prefix = partial && partial.end === position.character ? partial.word : "";
  if (chain.length === 0) return { owner: null, members: [], prefix, chain };

  const m = resolveMember(index, key, position.line, chain, "");
  return { owner: m?.owner ?? null, members: m?.owner.members ?? [], prefix, chain };
}

/** What is under the cursor. Null when not on an identifier. */
export function resolveAt(
  index: SymbolIndex,
  file: string,
  position: Position
): Resolution | null {
  const key = normalizePath(file);
  const text = index.get(key)?.lines[position.line];
  if (text === undefined) return null;

  const scan = scanLine(text);
  const id = identifierAt(text, position.character, scan);
  if (!id) return null;

  const range = rangeOf(position.line, id);
  const chain = chainBefore(text, scan, id.start);
  if (chain.length > 0) {
    const m = resolveMember(index, key, position.line, chain, id.word);
    return {
      file: key,
      word: id.word,
      range,
      chain,
      symbol: m?.field ?? null,
      candidates: m?.field ? [m.field] : [],
      owner: m?.owner,
    };
  }

  const candidates = resolveName(index, key, position.line, id.word);
  return { file: key, word: id.word, range, chain, symbol: candidates[0] ?? null, candidates };
}

/**
 * Where `symbol` is declared, with the exact range of its name. Declarations
 * may span physical lines (`_` continuation), so the search follows the
 * logical line; a parameter is looked for after its routine's name.
 */
export function declarationOf(index: SymbolIndex, symbol: QB64Symbol): Occurrence {
  const lines = index.get(symbol.file)?.lines ?? [];
  let afterRoutineName = !!(symbol.isParameter && symbol.parent);
  for (let ln = symbol.line; ln < lines.length; ln++) {
    const text = lines[ln];
    let ids = identifiersIn(text);
    if (afterRoutineName) {
      const header = ids.findIndex((i) => nameEq(i.word, symbol.parent!));
      ids = header >= 0 ? ids.slice(header + 1) : [];
      afterRoutineName = false;
    }
    const target = ids.find((i) => nameEq(i.word, symbol.name));
    if (target) return { file: symbol.file, range: rangeOf(ln, target), kind: "declaration" };
    if (!hasLineContinuation(text)) break;
  }
  const at = { line: symbol.line, character: 0 };
  return { file: symbol.file, range: { start: at, end: at }, kind: "declaration" };
}

export function findDefinition(
  index: SymbolIndex,
  file: string,
  position: Position
): Occurrence[] {
  const res = resolveAt(index, file, position);
  return res?.symbol ? [declarationOf(index, res.symbol)] : [];
}

/**
 * Every occurrence of `symbol`: its declaration (first) plus each reference,
 * tagged read/write. Locals and parameters are searched only within their
 * routine; everything else across the whole compilation unit. Each candidate
 * is re-resolved, so a same-named local in another routine is not counted.
 */
export function findOccurrences(
  index: SymbolIndex,
  symbol: QB64Symbol,
  includeDeclaration = true,
  onlyFiles?: string[]
): Occurrence[] {
  const key = symbol.file;
  let files: string[];
  let from = 0;
  let to = END;

  if (symbol.isParameter || symbol.scope === "LOCAL") {
    files = [key];
    const routine = enclosingRoutine(index, key, symbol.line);
    if (routine) {
      from = routine.line;
      to = routine.endLine ?? END;
    }
  } else {
    files = index.unitOf(key);
  }
  if (onlyFiles) {
    const allowed = new Set(onlyFiles.map(normalizePath));
    files = files.filter((f) => allowed.has(f));
  }

  const needle = normalizeBase(symbol.name);
  const declaration = declarationOf(index, symbol).range;
  const out: Occurrence[] = [];

  for (const f of files) {
    const entry = index.get(f);
    if (!entry) continue;
    const last = Math.min(to, entry.lines.length - 1);
    for (let ln = from; ln <= last; ln++) {
      const text = entry.lines[ln];
      if (!text || !text.toLowerCase().includes(needle)) continue;

      const scan = scanLine(text);
      for (const id of identifiersIn(text, scan)) {
        if (!matchesName(id.word, symbol)) continue;
        const res = resolveAt(index, f, { line: ln, character: id.start });
        if (!res?.symbol || !sameSymbol(res.symbol, symbol)) continue;

        let kind: OccurrenceKind;
        if (f === key && ln === declaration.start.line && id.start === declaration.start.character) {
          kind = "declaration";
          if (!includeDeclaration) continue;
        } else {
          kind = isWrite(text, scan, id) ? "write" : "read";
        }
        out.push({ file: f, range: rangeOf(ln, id), kind });
      }
    }
  }
  // Declaration first, then references in scan order (stable sort).
  return out.sort((a, b) => Number(b.kind === "declaration") - Number(a.kind === "declaration"));
}

function matchesName(word: string, symbol: QB64Symbol): boolean {
  if (nameEq(word, symbol.name)) return true;
  return isRoutine(symbol) && normalizeBase(word) === normalizeBase(symbol.name);
}

/** True when `id` is (part of) the target of an assignment or a FOR counter. */
export function isWrite(text: string, scan: LineScan, id: Identifier): boolean {
  const statements = splitStatements(text, scan);
  let statement = statements[0];
  for (const s of statements) if (s.start <= id.start) statement = s;
  if (!statement) return false;
  const rel = id.start - statement.start;
  if (rel < 0) return false;

  const forMatch = statement.text.match(RE_FOR);
  if (forMatch) return rel === forMatch[1].length;

  const assign = statement.text.match(RE_ASSIGN);
  if (!assign) return false;
  const targetStart = assign[1] ? assign[1].length : 0;
  const eq = assign[0].length - 1;
  if (rel < targetStart || rel >= eq) return false;
  // Inside the target expression but not inside its parentheses (array
  // subscripts / arguments are reads).
  let depth = 0;
  for (let i = targetStart; i < rel; i++) {
    if (statement.text[i] === "(") depth++;
    else if (statement.text[i] === ")") depth--;
  }
  return depth === 0;
}

function rangeOf(line: number, id: Identifier): Range {
  return {
    start: { line, character: id.start },
    end: { line, character: id.end },
  };
}

const SEARCHABLE = new Set<QB64Symbol["type"]>(["SUB", "FUNCTION", "TYPE", "CONST"]);

/**
 * Workspace symbol search (Ctrl+T): routines, TYPEs and CONSTs whose name
 * contains the query's characters in order (case-insensitive). Prefix
 * matches come first, then the rest alphabetically. Empty query = all.
 */
export function searchSymbols(
  index: SymbolIndex,
  query: string,
  limit = 1000
): QB64Symbol[] {
  const q = query.trim().toLowerCase();
  const matches = index
    .allSymbols()
    .filter((s) => SEARCHABLE.has(s.type) && (q === "" || isSubsequence(q, s.name.toLowerCase())));
  matches.sort((a, b) => {
    const ap = q !== "" && a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bp = q !== "" && b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return ap - bp || a.name.localeCompare(b.name) || a.file.localeCompare(b.file);
  });
  return matches.slice(0, limit);
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const c of haystack) if (c === needle[i] && ++i === needle.length) return true;
  return needle.length === 0;
}
