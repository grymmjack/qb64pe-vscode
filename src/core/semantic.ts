/**
 * Semantic tokens for user-defined names (vscode-free). Keywords are left to
 * the TextMate grammar; only identifiers that resolve to an indexed symbol
 * get a token, so user routines, types, variables, parameters, fields and
 * labels can be themed distinctly from built-ins.
 *
 * A whole-document pass resolves through per-scope name maps built once per
 * routine instead of calling resolveAt for every identifier.
 */
import { SymbolIndex, normalizeBase, normalizeName, normalizePath } from "./index";
import { QB64Symbol } from "./symbols";
import { identifiersIn, scanLine } from "./lexer";
import {
  Range,
  chainBefore,
  declarationOf,
  isRoutine,
  isWrite,
  resolveMember,
  symbolsInScope,
} from "./queries";

export const TOKEN_TYPES = [
  "function",
  "method",
  "struct",
  "variable",
  "parameter",
  "property",
  "label",
] as const;
export const TOKEN_MODIFIERS = [
  "declaration",
  "readonly",
  "modification",
  "static",
  "defaultLibrary",
] as const;

export type TokenType = (typeof TOKEN_TYPES)[number];
export type TokenModifier = (typeof TOKEN_MODIFIERS)[number];

export interface SemanticToken {
  line: number;
  start: number;
  length: number;
  type: TokenType;
  modifiers: TokenModifier[];
}

function tokenType(symbol: QB64Symbol): TokenType | null {
  switch (symbol.type) {
    case "SUB":
      return "method";
    case "FUNCTION":
      return "function";
    case "TYPE":
      return "struct";
    case "CONST":
      return "variable";
    case "VARIABLE":
      return symbol.isParameter ? "parameter" : "variable";
    case "FIELD":
      return "property";
    case "LABEL":
      return "label";
  }
  return null;
}

const toMap = (symbols: QB64Symbol[]) =>
  new Map(symbols.map((s) => [normalizeName(s.name), s] as const));

export function semanticTokens(index: SymbolIndex, file: string): SemanticToken[] {
  const key = normalizePath(file);
  const entry = index.get(key);
  if (!entry) return [];

  const routines = entry.symbols.filter((s) => isRoutine(s) && !s.isExternal);
  const types = entry.symbols.filter((s) => s.type === "TYPE");
  const moduleSymbols = symbolsInScope(index, key, -1);
  const moduleScope = toMap(moduleSymbols);
  const routineByBase = new Map<string, QB64Symbol>();
  for (const s of moduleSymbols) {
    if (isRoutine(s) && !routineByBase.has(normalizeBase(s.name))) {
      routineByBase.set(normalizeBase(s.name), s);
    }
  }
  const routineScopes = new Map<QB64Symbol, Map<string, QB64Symbol>>();
  const scopeFor = (routine: QB64Symbol) => {
    let scope = routineScopes.get(routine);
    if (!scope) {
      scope = toMap(symbolsInScope(index, key, routine.line));
      routineScopes.set(routine, scope);
    }
    return scope;
  };
  const declarations = new Map<QB64Symbol, Range>();
  const declarationRange = (s: QB64Symbol) => {
    let r = declarations.get(s);
    if (!r) {
      r = declarationOf(index, s).range;
      declarations.set(s, r);
    }
    return r;
  };

  const tokens: SemanticToken[] = [];
  for (let line = 0; line < entry.lines.length; line++) {
    const text = entry.lines[line];
    if (!text.trim()) continue;
    const scan = scanLine(text);
    if (scan.isMetacommand) continue;

    const routine = routines.find((r) => r.line <= line && line <= (r.endLine ?? Infinity));
    const typeBlock = types.find((t) => t.line <= line && line <= (t.endLine ?? t.line));
    const scope = routine ? scopeFor(routine) : moduleScope;

    for (const id of identifiersIn(text, scan)) {
      let symbol: QB64Symbol | undefined;
      if (id.start > 0 && scan.mask[id.start - 1] === ".") {
        const chain = chainBefore(text, scan, id.start);
        if (chain.length > 0) {
          symbol = resolveMember(index, key, line, chain, id.word)?.field ?? undefined;
        }
      } else {
        const lower = normalizeName(id.word);
        if (typeBlock) {
          symbol = typeBlock.members?.find((m) => normalizeName(m.name) === lower);
        }
        symbol ??= scope.get(lower);
        if (!symbol && routine?.type === "FUNCTION" && normalizeBase(id.word) === normalizeBase(routine.name)) {
          symbol = routine; // assignment to the return value
        }
        symbol ??= routineByBase.get(normalizeBase(id.word)); // Add(1) for FUNCTION Add%
      }
      if (!symbol) continue;
      const type = tokenType(symbol);
      if (!type) continue;

      const modifiers: TokenModifier[] = [];
      const decl = declarationRange(symbol);
      const isDeclaration =
        symbol.file === key && decl.start.line === line && decl.start.character === id.start;
      if (isDeclaration) modifiers.push("declaration");
      if (symbol.type === "CONST") modifiers.push("readonly");
      if (symbol.isStatic) modifiers.push("static");
      if (symbol.isExternal) modifiers.push("defaultLibrary");
      if (
        !isDeclaration &&
        (symbol.type === "VARIABLE" || symbol.type === "FIELD") &&
        isWrite(text, scan, id)
      ) {
        modifiers.push("modification");
      }
      tokens.push({ line, start: id.start, length: id.end - id.start, type, modifiers });
    }
  }
  return tokens;
}
