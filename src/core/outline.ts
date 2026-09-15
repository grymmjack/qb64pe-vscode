/**
 * Document outline model (vscode-free): a tree of the symbols in one file
 * with full-body ranges (so the outline follows the cursor) and the exact
 * name ranges for selection. Routines contain their parameters and locals,
 * TYPEs their fields; includes and named labels appear at top level.
 */
import { SymbolIndex, normalizePath } from "./index";
import { QB64Symbol } from "./symbols";
import { Range, declarationOf, isRoutine, parameterSymbol } from "./queries";
import { signatureLabel } from "./format";

export type OutlineKind =
  | "include"
  | "type"
  | "field"
  | "const"
  | "variable"
  | "parameter"
  | "label"
  | "sub"
  | "function";

export interface OutlineNode {
  name: string;
  detail: string;
  kind: OutlineKind;
  /** Declared inside DECLARE LIBRARY. */
  external?: boolean;
  range: Range;
  selectionRange: Range;
  children: OutlineNode[];
}

export function buildOutline(index: SymbolIndex, file: string): OutlineNode[] {
  const entry = index.get(normalizePath(file));
  if (!entry) return [];
  const lines = entry.lines;

  const lineRange = (line: number): Range => ({
    start: { line, character: 0 },
    end: { line, character: lines[line]?.length ?? 0 },
  });
  const bodyRange = (s: QB64Symbol): Range => {
    const end = s.endLine ?? s.line;
    return {
      start: { line: s.line, character: 0 },
      end: { line: end, character: lines[end]?.length ?? 0 },
    };
  };
  const nameRange = (s: QB64Symbol): Range => declarationOf(index, s).range;

  const nodes: OutlineNode[] = [];
  const routineNodes: { symbol: QB64Symbol; node: OutlineNode }[] = [];

  for (const include of entry.includes) {
    nodes.push({
      name: include.path,
      detail: "$INCLUDE",
      kind: "include",
      range: lineRange(include.line),
      selectionRange: lineRange(include.line),
      children: [],
    });
  }

  for (const s of entry.symbols) {
    if (isRoutine(s)) {
      const node: OutlineNode = {
        name: s.name,
        detail: routineDetail(s),
        kind: s.type === "SUB" ? "sub" : "function",
        external: s.isExternal || undefined,
        range: s.isExternal ? lineRange(s.line) : bodyRange(s),
        selectionRange: nameRange(s),
        children: [],
      };
      if (!s.isExternal) {
        for (const p of s.parameters ?? []) {
          const range = nameRange(parameterSymbol(s, p));
          node.children.push({
            name: p.name,
            detail: p.type ?? "",
            kind: "parameter",
            range,
            selectionRange: range,
            children: [],
          });
        }
        routineNodes.push({ symbol: s, node });
      }
      nodes.push(node);
      continue;
    }

    if (s.type === "TYPE") {
      nodes.push({
        name: s.name,
        detail: "TYPE",
        kind: "type",
        range: bodyRange(s),
        selectionRange: nameRange(s),
        children: (s.members ?? []).map((f) => ({
          name: f.name,
          detail: `${f.dataType ?? ""}${f.isArray ? "()" : ""}`.trim(),
          kind: "field" as const,
          range: lineRange(f.line),
          selectionRange: nameRange(f),
          children: [],
        })),
      });
      continue;
    }

    if (s.type === "LABEL") {
      if (/^\d+$/.test(s.name)) continue; // line numbers would flood the outline
      nodes.push({
        name: s.name,
        detail: "label",
        kind: "label",
        range: lineRange(s.line),
        selectionRange: nameRange(s),
        children: [],
      });
      continue;
    }

    if (s.type === "CONST" || s.type === "VARIABLE") {
      const node: OutlineNode = {
        name: s.name,
        detail: valueDetail(s),
        kind: s.type === "CONST" ? "const" : "variable",
        range: lineRange(s.line),
        selectionRange: nameRange(s),
        children: [],
      };
      const owner =
        s.scope === "LOCAL"
          ? routineNodes.find(
              (r) => r.symbol.line <= s.line && s.line <= (r.symbol.endLine ?? r.symbol.line)
            )
          : undefined;
      (owner ? owner.node.children : nodes).push(node);
    }
  }

  const byLine = (a: OutlineNode, b: OutlineNode) =>
    a.range.start.line - b.range.start.line ||
    a.selectionRange.start.character - b.selectionRange.start.character;
  nodes.sort(byLine);
  for (const n of nodes) n.children.sort(byLine);
  return nodes;
}

function routineDetail(s: QB64Symbol): string {
  const label = signatureLabel(s).replace(/^(SUB|FUNCTION)\s+\S+\s*/, "");
  const external = s.isExternal ? `DECLARE LIBRARY${s.library ? ` "${s.library}"` : ""}` : "";
  return [label.replace(/\s+' returns /, " → ").trim(), external].filter(Boolean).join("  ");
}

function valueDetail(s: QB64Symbol): string {
  if (s.type === "CONST") return s.value !== undefined ? `= ${s.value}` : "CONST";
  const parts: string[] = [];
  if (s.dataType) parts.push(s.dataType);
  if (s.isArray) parts.push("()");
  if (s.isShared) parts.push("SHARED");
  if (s.isImplicit) parts.push("(implicit)");
  return parts.join(" ").replace(/ \(\)/, "()");
}
