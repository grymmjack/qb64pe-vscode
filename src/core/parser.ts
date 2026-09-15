/**
 * Pure text -> symbol parser for QB64PE source.
 *
 * No `vscode` or filesystem dependencies: callers hand in the file content
 * and a path used only to tag the resulting symbols. This keeps the parser
 * unit-testable and lets the SymbolParser/SymbolIndex adapters own all I/O.
 *
 * Strategy: physical lines are joined on `_` continuations into logical
 * lines, each logical line is split into `:`-separated statements with the
 * lexer (so comments and strings can never masquerade as code), and every
 * statement is matched against anchored, sigil-aware patterns. It is still a
 * pattern matcher rather than a grammar, but a careful one.
 */
import { Parameter, QB64Symbol, QB64SymbolScope } from "./symbols";
import { hasLineContinuation, scanLine, splitStatements } from "./lexer";

export interface IncludeDirective {
  /** The path exactly as written in the `$INCLUDE` directive. */
  path: string;
  line: number;
}

export interface ParseResult {
  symbols: QB64Symbol[];
  includes: IncludeDirective[];
}

interface Declaration {
  name: string;
  dims?: string;
  dataType?: string;
}

interface Routine {
  symbol: QB64Symbol;
  name: string;
  /** Lower-cased name without its type sigil, for return-value assignments. */
  base: string;
  params: Set<string>;
  locals: Set<string>;
}

interface State {
  routine: Routine | null;
  type: QB64Symbol | null;
  /** Library name while inside DECLARE LIBRARY … END DECLARE, else null. */
  library: string | null;
  moduleNames: Set<string>;
}

const SIGIL = "(?:~?(?:%%|&&|##|[%&!#`])|\\$)";
const NAME = `[A-Za-z_][A-Za-z0-9_]*${SIGIL}?`;
const SIGIL_AT_END = new RegExp(`${SIGIL}$`);

const RE = {
  include: /^\s*'?\$INCLUDE\s*:\s*'([^']+)'/i,
  lineNumber: /^\s*(\d+)(?:\s+|$)/,
  label: /^[A-Za-z][A-Za-z0-9_]*$/,
  declareLibrary:
    /^DECLARE\s+(?:(?:DYNAMIC|STATIC|CUSTOMTYPE)\s+)?LIBRARY(?:\s+"([^"]*)")?\s*$/i,
  endDeclare: /^END\s+DECLARE\b/i,
  declareForward: /^DECLARE\s+(?:SUB|FUNCTION)\b/i,
  type: new RegExp(`^TYPE\\s+(${NAME})\\s*$`, "i"),
  endType: /^END\s+TYPE\b/i,
  routine: new RegExp(
    `^(SUB|FUNCTION)\\s+(${NAME})\\s*(?:ALIAS\\s+(?:"[^"]*"|[A-Za-z_][A-Za-z0-9_]*)\\s*)?(?:\\((.*)\\))?\\s*(STATIC)?\\s*$`,
    "i"
  ),
  endRoutine: /^END\s+(SUB|FUNCTION)\b/i,
  dim: /^(DIM|REDIM|STATIC|COMMON)\s+(?:_PRESERVE\s+)?(?:(SHARED)\s+)?(.+)$/i,
  shared: /^SHARED\s+/i,
  const: /^CONST\s+(.+)$/i,
  constItem: new RegExp(`^(${NAME})\\s*=\\s*(.+)$`),
  forLoop: new RegExp(`^FOR\\s+(${NAME})\\s*=`, "i"),
  assignment: new RegExp(`^(?:LET\\s+)?(${NAME})\\s*=`, "i"),
  declTypeFirst: new RegExp(`^AS\\s+(.+?)\\s+(${NAME})\\s*(\\(.*\\))?$`, "i"),
  declNameFirst: new RegExp(`^(${NAME})\\s*(\\(.*\\))?\\s*(?:AS\\s+(.+))?$`, "i"),
  param: new RegExp(
    `^(?:(BYVAL|BYREF)\\s+)?(${NAME})\\s*(\\(\\s*\\))?\\s*(?:AS\\s+(.+))?$`,
    "i"
  ),
};

/**
 * Statement keywords that commonly stand alone before a `:` (`CLS: PRINT`),
 * which must not be mistaken for labels. Any `_`-prefixed name is a QB64PE
 * keyword and is excluded by the label pattern itself.
 */
const NOT_A_LABEL = new Set([
  "BEEP", "CALL", "CASE", "CHAIN", "CLEAR", "CLOSE", "CLS", "COLOR", "DATA",
  "DO", "ELSE", "ELSEIF", "END", "ERASE", "EXIT", "FILES", "FOR", "GOSUB",
  "GOTO", "IF", "INPUT", "KEY", "LET", "LOCATE", "LOOP", "LPRINT", "NEXT",
  "ON", "OPEN", "PAINT", "PLAY", "PRINT", "RANDOMIZE", "READ", "REM", "RESET",
  "RESTORE", "RESUME", "RETURN", "RUN", "SCREEN", "SELECT", "SHELL", "SLEEP",
  "SOUND", "STOP", "SWAP", "SYSTEM", "THEN", "TROFF", "TRON", "UNTIL", "WAIT",
  "WEND", "WHILE", "WIDTH", "WRITE",
]);

const SIGIL_TYPES: Record<string, string> = {
  $: "STRING",
  "%%": "_BYTE",
  "&&": "_INTEGER64",
  "##": "_FLOAT",
  "%": "INTEGER",
  "&": "LONG",
  "!": "SINGLE",
  "#": "DOUBLE",
  "`": "_BIT",
};

/** `count%` -> `INTEGER`, `flags~%` -> `_UNSIGNED INTEGER`, `x` -> undefined. */
export function sigilToType(name: string): string | undefined {
  const m = name.match(/(~?)(%%|&&|##|[%&!#`$])$/);
  if (!m) return undefined;
  const base = SIGIL_TYPES[m[2]];
  return m[1] ? `_UNSIGNED ${base}` : base;
}

function collapse(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** `count%` -> `count`, `Describe$` -> `Describe`. */
export function stripSigil(name: string): string {
  return name.replace(SIGIL_AT_END, "");
}

function baseName(name: string): string {
  return stripSigil(name).toLowerCase();
}

/** Splits on commas that are outside parentheses and string literals. */
export function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inString = !inString;
    else if (!inString) {
      if (c === "(") depth++;
      else if (c === ")") depth = Math.max(0, depth - 1);
      else if (c === "," && depth === 0) {
        parts.push(text.substring(start, i));
        start = i + 1;
      }
    }
  }
  parts.push(text.substring(start));
  return parts;
}

/**
 * Parses QB64PE source text into a flat list of symbols.
 * TYPE members live on the TYPE symbol's `members`, not in the flat list.
 */
export function parseContent(content: string, filePath: string): QB64Symbol[] {
  return parseFile(content, filePath).symbols;
}

/** Like parseContent but also returns the `$INCLUDE` directives found. */
export function parseFile(content: string, filePath: string): ParseResult {
  const physical = content.split(/\r?\n/);
  const out: ParseResult = { symbols: [], includes: [] };
  const state: State = {
    routine: null,
    type: null,
    library: null,
    moduleNames: new Set<string>(),
  };

  for (let i = 0; i < physical.length; i++) {
    const startLine = i;
    let logical = physical[i];
    while (hasLineContinuation(logical) && i + 1 < physical.length) {
      logical = logical.replace(/_\s*$/, "") + " " + physical[++i].trimStart();
    }
    processLine(logical, startLine, physical, filePath, state, out);
  }

  return out;
}

function processLine(
  line: string,
  lineNumber: number,
  physical: string[],
  file: string,
  state: State,
  out: ParseResult
): void {
  const include = line.match(RE.include);
  if (include) {
    out.includes.push({ path: include[1], line: lineNumber });
    return;
  }
  if (scanLine(line).isMetacommand) return;

  let code = line;
  const lineNumberLabel = code.match(RE.lineNumber);
  if (lineNumberLabel) {
    out.symbols.push({
      name: lineNumberLabel[1],
      type: "LABEL",
      scope: "MODULE",
      line: lineNumber,
      file,
    });
    code = code.substring(lineNumberLabel[0].length);
  }

  let statements = splitStatements(code);
  if (
    statements.length >= 2 &&
    RE.label.test(statements[0].text) &&
    !NOT_A_LABEL.has(statements[0].text.toUpperCase())
  ) {
    out.symbols.push({
      name: statements[0].text,
      type: "LABEL",
      scope: "MODULE",
      line: lineNumber,
      file,
    });
    statements = statements.slice(1);
  }

  for (const statement of statements) {
    if (statement.text) {
      handleStatement(statement.text, lineNumber, physical, file, state, out);
    }
  }
}

function handleStatement(
  s: string,
  line: number,
  physical: string[],
  file: string,
  state: State,
  out: ParseResult
): void {
  let m: RegExpMatchArray | null;

  // DECLARE LIBRARY … END DECLARE (external routines); old-style forward
  // DECLARE SUB/FUNCTION lines are ignored by QB64PE and by us.
  if ((m = s.match(RE.declareLibrary))) {
    state.library = m[1] ?? "";
    return;
  }
  if (RE.endDeclare.test(s)) {
    state.library = null;
    return;
  }
  if (RE.declareForward.test(s)) return;

  // TYPE … END TYPE
  if ((m = s.match(RE.type))) {
    const symbol: QB64Symbol = {
      name: m[1],
      type: "TYPE",
      scope: "MODULE",
      line,
      file,
      documentation: extractDocumentation(physical, line),
      members: [],
    };
    out.symbols.push(symbol);
    state.moduleNames.add(m[1].toLowerCase());
    state.type = symbol;
    return;
  }
  if (RE.endType.test(s)) {
    if (state.type) state.type.endLine = line;
    state.type = null;
    return;
  }
  if (state.type) {
    for (const d of parseDeclarationList(s)) {
      state.type.members.push({
        name: d.name,
        type: "FIELD",
        dataType: d.dataType,
        scope: "MODULE",
        line,
        file,
        parent: state.type.name,
        isArray: !!d.dims,
      });
    }
    return;
  }

  // SUB / FUNCTION header
  if ((m = s.match(RE.routine))) {
    const kind = m[1].toUpperCase() as "SUB" | "FUNCTION";
    const name = m[2];
    const parameters = parseParameters(m[3]);
    const symbol: QB64Symbol = {
      name,
      type: kind,
      dataType: kind === "FUNCTION" ? sigilToType(name) : undefined,
      parameters,
      scope: "MODULE",
      line,
      file,
      documentation: extractDocumentation(physical, line),
      parameterDescriptions: extractParameterDocumentation(
        physical,
        line,
        parameters
      ),
    };
    if (m[4]) symbol.isStatic = true;
    if (state.library !== null) {
      symbol.isExternal = true;
      symbol.library = state.library;
    } else {
      state.routine = {
        symbol,
        name,
        base: baseName(name),
        params: new Set(parameters.map((p) => p.name.toLowerCase())),
        locals: new Set<string>(),
      };
    }
    out.symbols.push(symbol);
    state.moduleNames.add(name.toLowerCase());
    return;
  }
  if (RE.endRoutine.test(s)) {
    if (state.routine) state.routine.symbol.endLine = line;
    state.routine = null;
    return;
  }

  // DIM / REDIM / STATIC / COMMON declaration lists
  if ((m = s.match(RE.dim))) {
    const isShared = !!m[2];
    for (const d of parseDeclarationList(m[3])) {
      out.symbols.push({
        name: d.name,
        type: "VARIABLE",
        dataType: d.dataType,
        scope: variableScope(state, isShared),
        line,
        file,
        isArray: !!d.dims,
        isShared,
      });
      remember(state, d.name);
    }
    return;
  }
  if (RE.shared.test(s)) return; // SHARED x - access to a module variable

  // CONST a = 1, b = 2
  if ((m = s.match(RE.const))) {
    for (const piece of splitTopLevelCommas(m[1])) {
      const item = piece.trim().match(RE.constItem);
      if (!item) continue;
      out.symbols.push({
        name: item[1],
        type: "CONST",
        scope: state.routine ? "LOCAL" : "MODULE",
        line,
        file,
        documentation: extractDocumentation(physical, line),
        value: item[2].trim(),
      });
      remember(state, item[1]);
    }
    return;
  }

  // Implicit declarations: `x = …` and `FOR i = …` on a name not yet known.
  if ((m = s.match(RE.forLoop) || s.match(RE.assignment))) {
    const name = m[1];
    const lower = name.toLowerCase();
    const routine = state.routine;
    if (routine && (routine.params.has(lower) || baseName(name) === routine.base)) {
      return; // parameter or the FUNCTION's own return value
    }
    if (isKnown(state, lower)) return;
    out.symbols.push({
      name,
      type: "VARIABLE",
      dataType: sigilToType(name),
      scope: routine ? "LOCAL" : "MODULE",
      line,
      file,
      isImplicit: true,
    });
    remember(state, name);
  }
}

function variableScope(state: State, isShared: boolean): QB64SymbolScope {
  if (isShared) return "GLOBAL";
  return state.routine ? "LOCAL" : "MODULE";
}

function remember(state: State, name: string): void {
  (state.routine ? state.routine.locals : state.moduleNames).add(
    name.toLowerCase()
  );
}

function isKnown(state: State, lower: string): boolean {
  if (state.moduleNames.has(lower)) return true;
  return !!state.routine && state.routine.locals.has(lower);
}

/**
 * Parses `a AS LONG, b(10) AS STRING * 8, c%` or `AS LONG a, b` style
 * declaration lists (DIM/REDIM/STATIC/COMMON bodies and TYPE members).
 */
export function parseDeclarationList(text: string): Declaration[] {
  const declarations: Declaration[] = [];
  let pendingType: string | undefined;

  for (const piece of splitTopLevelCommas(text)) {
    const p = piece.trim();
    if (!p) continue;

    let m = p.match(RE.declTypeFirst);
    if (m) {
      pendingType = collapse(m[1]);
      declarations.push({ name: m[2], dims: m[3], dataType: pendingType });
      continue;
    }

    m = p.match(RE.declNameFirst);
    if (m) {
      declarations.push({
        name: m[1],
        dims: m[2],
        dataType: m[3] ? collapse(m[3]) : pendingType ?? sigilToType(m[1]),
      });
    }
  }

  return declarations;
}

/**
 * Parses the inside of a routine's parameter list, e.g.
 * `a AS INTEGER, BYVAL b AS LONG, arr() AS STRING, n%`.
 */
export function parseParameters(paramText?: string): Parameter[] {
  if (!paramText || paramText.trim() === "") return [];

  const params: Parameter[] = [];
  for (const piece of splitTopLevelCommas(paramText)) {
    const m = piece.trim().match(RE.param);
    if (!m) continue;
    params.push({
      name: m[2],
      type: m[4] ? collapse(m[4]) : sigilToType(m[2]),
      byRef: !(m[1] && m[1].toUpperCase() === "BYVAL"), // BYREF is the default
      isArray: !!m[3],
    });
  }
  return params;
}

/**
 * Collects the comment block directly above a declaration as its documentation.
 * `@param` lines are excluded here; see extractParameterDocumentation.
 */
export function extractDocumentation(
  lines: string[],
  currentIndex: number
): string {
  const docLines: string[] = [];

  for (let i = currentIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("'")) {
      const cleanLine = cleanCommentLine(line);
      if (cleanLine.length > 0 && !/^\s*@param\s+/i.test(cleanLine)) {
        docLines.unshift(cleanLine);
      }
    } else if (line === "") {
      continue;
    } else {
      break;
    }
  }

  return docLines.length > 0 ? docLines.join("\n") : "";
}

/** Strips the leading apostrophes and whitespace from a comment line. */
export function cleanCommentLine(line: string): string {
  return line.replace(/^'+/, "").replace(/^\s+/, "");
}

/**
 * Reads per-parameter descriptions from the comment block above a declaration.
 * Supports `@param name description` as well as `name - description` /
 * `name: description` when `name` is one of the declared parameters.
 * Also fills in `description` on the matching Parameter objects.
 */
export function extractParameterDocumentation(
  lines: string[],
  currentIndex: number,
  parameters: Parameter[]
): Map<string, string> {
  const paramDescriptions = new Map<string, string>();
  const docLines: string[] = [];

  for (let i = currentIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("'")) {
      const cleanLine = cleanCommentLine(line);
      if (cleanLine.length > 0) docLines.unshift(cleanLine);
    } else if (line === "") {
      continue;
    } else {
      break;
    }
  }

  for (const docLine of docLines) {
    const paramMatch = docLine.match(
      /^\s*@param\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/i
    );
    if (paramMatch) {
      paramDescriptions.set(paramMatch[1].toLowerCase(), paramMatch[2]);
      continue;
    }

    const colonMatch = docLine.match(
      /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[-:]\s*(.+)$/
    );
    if (
      colonMatch &&
      parameters.some(
        (p) => p.name.toLowerCase() === colonMatch[1].toLowerCase()
      )
    ) {
      paramDescriptions.set(colonMatch[1].toLowerCase(), colonMatch[2]);
    }
  }

  for (const param of parameters) {
    const description = paramDescriptions.get(param.name.toLowerCase());
    if (description) param.description = description;
  }

  return paramDescriptions;
}
