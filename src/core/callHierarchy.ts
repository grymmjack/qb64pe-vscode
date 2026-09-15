/**
 * Call hierarchy (vscode-free): who calls a routine and what it calls.
 * Module-level code (outside any SUB/FUNCTION) is represented by a
 * "module" item for its file so top-level calls have a caller.
 */
import * as path from "path";
import { SymbolIndex, normalizeBase, normalizeName, normalizePath } from "./index";
import { QB64Symbol } from "./symbols";
import { identifiersIn, scanLine } from "./lexer";
import {
  Position,
  Range,
  declarationOf,
  enclosingRoutine,
  findOccurrences,
  isRoutine,
  resolveAt,
  symbolsInScope,
} from "./queries";
import { signatureLabel } from "./format";

export interface CallItem {
  name: string;
  kind: "sub" | "function" | "module";
  detail: string;
  file: string;
  range: Range;
  selectionRange: Range;
}

export interface IncomingCall {
  from: CallItem;
  fromRanges: Range[];
}

export interface OutgoingCall {
  to: CallItem;
  fromRanges: Range[];
}

export function itemForRoutine(index: SymbolIndex, routine: QB64Symbol): CallItem {
  const lines = index.get(routine.file)?.lines ?? [];
  const end = routine.endLine ?? routine.line;
  return {
    name: routine.name,
    kind: routine.type === "SUB" ? "sub" : "function",
    detail: signatureLabel(routine).replace(/^(SUB|FUNCTION)\s+\S+\s*/, ""),
    file: routine.file,
    range: {
      start: { line: routine.line, character: 0 },
      end: { line: end, character: lines[end]?.length ?? 0 },
    },
    selectionRange: declarationOf(index, routine).range,
  };
}

export function moduleItem(index: SymbolIndex, file: string): CallItem {
  const key = normalizePath(file);
  const lines = index.get(key)?.lines ?? [""];
  const last = Math.max(0, lines.length - 1);
  const zero = { line: 0, character: 0 };
  return {
    name: path.basename(key),
    kind: "module",
    detail: "module-level code",
    file: key,
    range: { start: zero, end: { line: last, character: lines[last]?.length ?? 0 } },
    selectionRange: { start: zero, end: zero },
  };
}

/** The routine under the cursor, or the routine the cursor is inside. */
export function callHierarchyItemAt(
  index: SymbolIndex,
  file: string,
  position: Position
): CallItem | null {
  const key = normalizePath(file);
  const res = resolveAt(index, key, position);
  if (res?.symbol && isRoutine(res.symbol)) return itemForRoutine(index, res.symbol);
  const routine = enclosingRoutine(index, key, position.line);
  return routine ? itemForRoutine(index, routine) : null;
}

/** Back from an item to its routine (null for module items). */
export function routineOfItem(index: SymbolIndex, item: CallItem): QB64Symbol | null {
  if (item.kind === "module") return null;
  const res = resolveAt(index, item.file, item.selectionRange.start);
  return res?.symbol && isRoutine(res.symbol) ? res.symbol : null;
}

export function incomingCalls(index: SymbolIndex, item: CallItem): IncomingCall[] {
  const routine = routineOfItem(index, item);
  if (!routine) return [];
  const groups = new Map<string, IncomingCall>();
  for (const o of findOccurrences(index, routine, false)) {
    if (o.kind === "write") continue; // `Fn = value` sets the return value; not a call
    const caller = enclosingRoutine(index, o.file, o.range.start.line);
    if (caller && caller.line === o.range.start.line) continue; // its own header
    const from = caller ? itemForRoutine(index, caller) : moduleItem(index, o.file);
    const groupKey = `${from.file}:${from.kind}:${from.range.start.line}`;
    const group = groups.get(groupKey);
    if (group) group.fromRanges.push(o.range);
    else groups.set(groupKey, { from, fromRanges: [o.range] });
  }
  return Array.from(groups.values()).sort(
    (a, b) => a.from.file.localeCompare(b.from.file) || a.from.range.start.line - b.from.range.start.line
  );
}

export function outgoingCalls(index: SymbolIndex, item: CallItem): OutgoingCall[] {
  const key = normalizePath(item.file);
  const entry = index.get(key);
  if (!entry) return [];
  const routine = routineOfItem(index, item);
  const routines = entry.symbols.filter((s) => isRoutine(s) && !s.isExternal);
  const types = entry.symbols.filter((s) => s.type === "TYPE");

  // Lines to scan: the routine body, or everything outside routines/TYPEs.
  const lineNumbers: number[] = [];
  if (routine) {
    for (let l = routine.line + 1; l < (routine.endLine ?? entry.lines.length); l++) lineNumbers.push(l);
  } else {
    for (let l = 0; l < entry.lines.length; l++) {
      if (routines.some((r) => r.line <= l && l <= (r.endLine ?? Infinity))) continue;
      if (types.some((t) => t.line <= l && l <= (t.endLine ?? t.line))) continue;
      lineNumbers.push(l);
    }
  }

  const scope = new Map<string, QB64Symbol>();
  for (const s of symbolsInScope(index, key, routine ? routine.line : -1)) {
    if (!isRoutine(s)) continue;
    scope.set(normalizeName(s.name), s);
    if (!scope.has(normalizeBase(s.name))) scope.set(normalizeBase(s.name), s);
  }

  const groups = new Map<string, OutgoingCall>();
  for (const line of lineNumbers) {
    const text = entry.lines[line];
    if (!text || !text.trim()) continue;
    const scan = scanLine(text);
    if (scan.isMetacommand) continue;
    for (const id of identifiersIn(text, scan)) {
      if (id.start > 0 && scan.mask[id.start - 1] === ".") continue;
      const callee = scope.get(normalizeName(id.word)) ?? scope.get(normalizeBase(id.word));
      if (!callee) continue;
      // `Fact& = …` inside FUNCTION Fact& sets the return value; only `Fact&(` calls.
      if (routine && callee.type === "FUNCTION" && normalizeBase(callee.name) === normalizeBase(routine.name)) {
        if (!/^\s*\(/.test(text.substring(id.end))) continue;
      }
      const range = { start: { line, character: id.start }, end: { line, character: id.end } };
      const groupKey = `${callee.file}:${callee.line}`;
      const group = groups.get(groupKey);
      if (group) group.fromRanges.push(range);
      else groups.set(groupKey, { to: itemForRoutine(index, callee), fromRanges: [range] });
    }
  }
  return Array.from(groups.values()).sort(
    (a, b) => a.fromRanges[0].start.line - b.fromRanges[0].start.line || a.to.name.localeCompare(b.to.name)
  );
}
