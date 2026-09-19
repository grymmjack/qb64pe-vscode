/**
 * Index-driven diagnostics (vscode-free): problems the symbol index can see
 * without compiling. Deliberately conservative - every rule prefers a
 * missed problem over a false report:
 *  - duplicate SUB/FUNCTION (sigil-insensitive), TYPE, CONST across the
 *    compilation unit, duplicate labels in a file            -> error
 *  - GOTO/GOSUB to a label the file does not define          -> error
 *  - statement-style call of a name that is neither a keyword
 *    nor any symbol in scope (`Foo 1, 2`, `CALL Foo(1)`)     -> warning
 *  - a routine's local that is never read                    -> hint
 */
import * as path from "path";
import { SymbolIndex, normalizeBase, normalizeName, normalizePath } from "./index";
import { QB64Symbol } from "./symbols";
import { hasLineContinuation, scanLine, splitStatements } from "./lexer";
import { isKeyword } from "./keywords";
import {
  Range,
  declarationOf,
  enclosingRoutine,
  findOccurrences,
  isRoutine,
  symbolsInScope,
} from "./queries";

export type Severity = "error" | "warning" | "hint";

export interface Diagnostic {
  file: string;
  range: Range;
  message: string;
  severity: Severity;
  code:
    | "duplicate"
    | "undefined-label"
    | "undefined-sub"
    | "unused-local"
    | "missing-include";
  /** Render faded (VS Code's Unnecessary tag). */
  unnecessary?: boolean;
}

const NAME = "[A-Za-z_][A-Za-z0-9_]*(?:~?(?:%%|&&|##|[%&!#`])|\\$)?";
const RE_JUMP = new RegExp(`^(?:GOTO|GOSUB)\\s+(\\d+|[A-Za-z_][A-Za-z0-9_]*)\\s*$`, "i");
const RE_CALL = new RegExp(`^CALL\\s+(${NAME})`, "i");
const RE_STATEMENT = new RegExp(`^(${NAME})(\\s+(.*))?$`);
const RE_ASSIGN_REST = /^(?:\(.*\))?\s*(?:\.[A-Za-z_][A-Za-z0-9_]*(?:\(.*\))?)*\s*=/;
/** Statement words that may be missing from the keyword list. */
const STATEMENT_WORDS = new Set([
  "OPTION", "REM", "LET", "GOTO", "GOSUB", "CALL", "DECLARE", "DEF", "DEFINT", "DEFLNG",
  "DEFSNG", "DEFDBL", "DEFSTR", "DATA", "READ", "RESTORE", "RESUME", "ON", "ERROR", "END",
  "EXIT", "RETURN", "ELSE", "ELSEIF", "LOOP", "WEND", "NEXT", "CASE", "SELECT", "DO",
  "WHILE", "FOR", "IF", "THEN", "TYPE", "SUB", "FUNCTION", "DIM", "REDIM", "STATIC",
  "SHARED", "COMMON", "CONST", "PRINT", "INPUT", "LINE", "OPEN", "CLOSE", "GET", "PUT",
  "SWAP", "LSET", "RSET", "MID", "CLEAR", "RESET", "TRON", "TROFF", "SLEEP", "STOP",
  "SYSTEM", "CLS", "BEEP", "RANDOMIZE", "LOCATE", "COLOR", "SCREEN", "WIDTH", "VIEW",
  "WINDOW", "PALETTE", "PCOPY", "PAINT", "PSET", "PRESET", "CIRCLE", "DRAW", "PLAY",
  "SOUND", "POKE", "OUT", "WAIT", "LPRINT", "WRITE", "ERASE", "FIELD", "LOCK", "UNLOCK",
  "SEEK", "KEY", "KILL", "NAME", "CHDIR", "MKDIR", "RMDIR", "FILES", "SHELL", "RUN",
  "CHAIN", "ENVIRON", "BLOAD", "BSAVE", "IOCTL", "STRIG", "PEN", "TIMER", "UNTIL",
]);

const isBuiltin = (name: string) =>
  isKeyword(name) || STATEMENT_WORDS.has(name.toUpperCase());

export function diagnose(index: SymbolIndex, file: string): Diagnostic[] {
  const key = normalizePath(file);
  const entry = index.get(key);
  if (!entry) return [];
  const out: Diagnostic[] = [];
  duplicates(index, key, out);
  undefinedNames(index, key, entry.lines, entry.symbols, out);
  unusedLocals(index, key, entry.symbols, out);
  missingIncludes(index, key, entry.lines, out);
  return out.sort(
    (a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character
  );
}

function report(
  index: SymbolIndex,
  out: Diagnostic[],
  symbol: QB64Symbol,
  message: string,
  severity: Severity,
  code: Diagnostic["code"],
  unnecessary?: boolean
): void {
  out.push({ file: symbol.file, range: declarationOf(index, symbol).range, message, severity, code, unnecessary });
}

function duplicates(index: SymbolIndex, key: string, out: Diagnostic[]): void {
  const unit = index.unitOf(key);
  const groups = new Map<string, QB64Symbol[]>();
  for (const f of unit) {
    for (const s of index.symbolsOf(f)) {
      let group: string | null = null;
      if (isRoutine(s) && !s.isExternal) group = `routine:${normalizeBase(s.name)}`;
      else if (s.type === "TYPE") group = `type:${normalizeName(s.name)}`;
      else if (s.type === "CONST" && s.scope !== "LOCAL") group = `const:${normalizeName(s.name)}`;
      else if (s.type === "LABEL" && f === key) {
        // Labels are scoped to their routine (or module level), so the same
        // label name in two different SUBs/FUNCTIONs is legal — only a repeat
        // within the same scope is a duplicate.
        const routine = enclosingRoutine(index, key, s.line);
        const scopeId = routine ? `${normalizeBase(routine.name)}@${routine.line}` : "module";
        group = `label:${scopeId}:${normalizeName(s.name)}`;
      }
      if (!group) continue;
      const list = groups.get(group);
      if (list) list.push(s);
      else groups.set(group, [s]);
    }
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const [first, ...rest] = list; // unit order: this file first, then includes
    for (const dup of rest) {
      if (dup.file !== key) continue;
      const kind = dup.type === "LABEL" ? "Label" : dup.type;
      const where = `${path.basename(first.file)}:${first.line + 1}`;
      report(index, out, dup, `${kind} '${dup.name}' is already defined (${where}).`, "error", "duplicate");
    }
  }
}

function undefinedNames(
  index: SymbolIndex,
  key: string,
  lines: string[],
  symbols: QB64Symbol[],
  out: Diagnostic[]
): void {
  const labels = new Set(symbols.filter((s) => s.type === "LABEL").map((s) => normalizeName(s.name)));
  const types = symbols.filter((s) => s.type === "TYPE");
  const routines = symbols.filter((s) => isRoutine(s) && !s.isExternal);
  const scopes = new Map<QB64Symbol | null, Map<string, QB64Symbol>>();
  const scopeAt = (line: number) => {
    const routine = enclosingRoutine(index, key, line);
    let scope = scopes.get(routine);
    if (!scope) {
      const visible = symbolsInScope(index, key, routine ? routine.line : -1);
      scope = new Map();
      for (const s of visible) {
        scope.set(normalizeName(s.name), s);
        if (isRoutine(s) && !scope.has(normalizeBase(s.name))) scope.set(normalizeBase(s.name), s);
      }
      scopes.set(routine, scope);
    }
    return scope;
  };
  const known = (name: string, line: number) => {
    const scope = scopeAt(line);
    return scope.has(normalizeName(name)) || scope.has(normalizeBase(name));
  };
  let inDeclare = false;

  for (let i = 0; i < lines.length; i++) {
    const startLine = i;
    let logical = lines[i];
    while (hasLineContinuation(logical) && i + 1 < lines.length) {
      logical = logical.replace(/_\s*$/, "") + " " + lines[++i].trimStart();
    }
    const scan = scanLine(logical);
    if (scan.isMetacommand) continue;
    if (types.some((t) => t.line < startLine && startLine < (t.endLine ?? Infinity))) continue;
    if (routines.some((r) => r.line === startLine)) continue; // routine header

    const statements = splitStatements(logical, scan).map((s) => s.text.replace(/^\d+\s+/, ""));
    for (let n = 0; n < statements.length; n++) {
      const text = statements[n];
      if (!text) continue;
      if (/^DECLARE\s+(?:\w+\s+)?LIBRARY\b/i.test(text)) inDeclare = true;
      if (/^END\s+DECLARE\b/i.test(text)) inDeclare = false;
      if (inDeclare) continue;

      const jump = text.match(RE_JUMP);
      if (jump) {
        if (!labels.has(normalizeName(jump[1]))) {
          out.push({
            file: key,
            range: rangeOfWord(lines[startLine], jump[1], startLine),
            message: `Label '${jump[1]}' is not defined in this file.`,
            severity: "error",
            code: "undefined-label",
          });
        }
        continue;
      }

      const call = text.match(RE_CALL);
      let name: string | null = null;
      if (call) {
        name = call[1];
      } else {
        const m = text.match(RE_STATEMENT);
        if (!m || isBuiltin(m[1])) continue;
        if (n === 0 && statements.length > 1 && labels.has(normalizeName(m[1])) && !m[2]) continue; // label line
        const rest = text.substring(m[1].length);
        if (RE_ASSIGN_REST.test(rest)) continue; // assignment, not a call
        name = m[1];
      }
      if (!name || isBuiltin(name) || known(name, startLine)) continue;
      out.push({
        file: key,
        range: rangeOfWord(lines[startLine], name, startLine),
        message: `SUB '${name}' is not defined.`,
        severity: "warning",
        code: "undefined-sub",
      });
    }
  }
}

/** Flag `$INCLUDE` directives whose file could not be resolved. */
function missingIncludes(
  index: SymbolIndex,
  key: string,
  lines: string[],
  out: Diagnostic[]
): void {
  for (const inc of index.unresolvedIncludesOf(key)) {
    const line = lines[inc.line] ?? "";
    const at = line.indexOf(inc.path);
    const start = at >= 0 ? at : 0;
    out.push({
      file: key,
      range: {
        start: { line: inc.line, character: start },
        end: { line: inc.line, character: start + (at >= 0 ? inc.path.length : 1) },
      },
      message: `$INCLUDE file not found: '${inc.path}'.`,
      severity: "warning",
      code: "missing-include",
    });
  }
}

function rangeOfWord(line: string, word: string, lineNumber: number): Range {
  const at = line.toLowerCase().indexOf(word.toLowerCase());
  const start = Math.max(0, at);
  return {
    start: { line: lineNumber, character: start },
    end: { line: lineNumber, character: start + (at >= 0 ? word.length : 0) },
  };
}

function unusedLocals(index: SymbolIndex, key: string, symbols: QB64Symbol[], out: Diagnostic[]): void {
  const lines = index.get(key)!.lines;
  for (const s of symbols) {
    if (s.type !== "VARIABLE" || s.scope !== "LOCAL" || s.isParameter) continue;
    const uses = findOccurrences(index, s, false, [key]);
    const read = uses.some((o) => {
      if (o.kind === "read") return true;
      // A FOR counter is written by the loop but is clearly in use.
      const text = lines[o.range.start.line] ?? "";
      const statement = splitStatements(text).reverse().find((st) => st.start <= o.range.start.character);
      return !!statement && /^FOR\s+/i.test(statement.text);
    });
    if (read) continue;
    // An implicit variable's declaration is itself an assignment.
    const message = uses.length === 0 && !s.isImplicit
      ? `'${s.name}' is declared but never used.`
      : `'${s.name}' is assigned but never read.`;
    report(index, out, s, message, "hint", "unused-local", true);
  }
}
