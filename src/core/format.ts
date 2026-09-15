/**
 * Human-readable renderings of symbols (vscode-free): one-line declaration
 * labels for completion details / signature help and a Markdown block for
 * hover and completion documentation. Kept in one place so every provider
 * describes a symbol the same way.
 */
import * as path from "path";
import { Parameter, QB64Symbol } from "./symbols";

export function parameterLabel(p: Parameter): string {
  return `${p.byRef === false ? "BYVAL " : ""}${p.name}${p.isArray ? "()" : ""}${
    p.type ? ` AS ${p.type}` : ""
  }`;
}

/** `FUNCTION Add% (a AS INTEGER, b AS INTEGER)` / `SUB Greet` */
export function signatureLabel(symbol: QB64Symbol): string {
  const params = (symbol.parameters ?? []).map(parameterLabel).join(", ");
  const head = `${symbol.type} ${symbol.name}`;
  const list = params ? ` (${params})` : "";
  const ret = symbol.type === "FUNCTION" && symbol.dataType ? `  ' returns ${symbol.dataType}` : "";
  return `${head}${list}${symbol.isStatic ? " STATIC" : ""}${ret}`;
}

/** Short kind word for completion details and similar. */
export function kindLabel(symbol: QB64Symbol): string {
  switch (symbol.type) {
    case "SUB":
      return symbol.isExternal ? "external sub" : "sub";
    case "FUNCTION":
      return symbol.isExternal ? "external function" : "function";
    case "VARIABLE":
      if (symbol.isParameter) return "parameter";
      if (symbol.scope === "GLOBAL") return "shared variable";
      return symbol.scope === "LOCAL" ? "local variable" : "variable";
    case "CONST":
      return "constant";
    case "TYPE":
      return "type";
    case "FIELD":
      return "field";
    case "LABEL":
      return "label";
  }
}

/** One line of QB64PE that declares the symbol, as it would appear in code. */
export function declarationLabel(symbol: QB64Symbol): string {
  const array = symbol.isArray ? "()" : "";
  const as = symbol.dataType ? ` AS ${symbol.dataType}` : "";
  switch (symbol.type) {
    case "SUB":
    case "FUNCTION":
      return signatureLabel(symbol);
    case "VARIABLE":
      if (symbol.isParameter) return `${symbol.name}${array}${as}`;
      if (symbol.isImplicit) return `${symbol.name}${as}`;
      return `DIM ${symbol.isShared ? "SHARED " : ""}${symbol.name}${array}${as}`;
    case "CONST":
      return `CONST ${symbol.name}${symbol.value !== undefined ? ` = ${symbol.value}` : ""}`;
    case "TYPE":
      return `TYPE ${symbol.name}`;
    case "FIELD":
      return `${symbol.parent ? `${symbol.parent}.` : ""}${symbol.name}${array}${as}`;
    case "LABEL":
      return `${symbol.name}:`;
  }
}

/** Markdown documentation for hovers and completion items. */
export function symbolMarkdown(symbol: QB64Symbol): string {
  const parts: string[] = [];
  parts.push("```QB64PE\n" + declarationLabel(symbol) + "\n```");

  const notes: string[] = [kindLabel(symbol)];
  if (symbol.isParameter && symbol.parent) notes.push(`of ${symbol.parent}`);
  if (symbol.isImplicit) notes.push("implicitly declared");
  if (symbol.isExternal) {
    notes.push(symbol.library ? `DECLARE LIBRARY "${symbol.library}"` : "DECLARE LIBRARY");
  }
  parts.push(`*${notes.join(", ")}*`);

  if (symbol.documentation) parts.push(symbol.documentation);

  if (symbol.parameters && symbol.parameters.length > 0) {
    parts.push(
      "**Parameters**\n" +
        symbol.parameters
          .map((p) => {
            const passing = p.byRef === false ? "by value" : "by reference";
            return `- \`${parameterLabel(p)}\` — ${passing}${p.description ? `: ${p.description}` : ""}`;
          })
          .join("\n")
    );
  }

  if (symbol.type === "FUNCTION" && symbol.dataType) {
    parts.push(`**Returns** ${symbol.dataType}`);
  }

  if (symbol.type === "TYPE" && symbol.members && symbol.members.length > 0) {
    parts.push(
      "**Members**\n" +
        symbol.members
          .map((m) => `- \`${m.name}${m.isArray ? "()" : ""}${m.dataType ? ` AS ${m.dataType}` : ""}\``)
          .join("\n")
    );
  }

  parts.push(`*${path.basename(symbol.file)}:${symbol.line + 1}*`);
  return parts.join("\n\n");
}
