/**
 * Pure text -> symbol parser for QB64PE source.
 *
 * No `vscode` or filesystem dependencies: callers hand in the file content
 * and a path used only to tag the resulting symbols. This keeps the parser
 * unit-testable and lets the SymbolParser/SymbolIndex adapters own all I/O.
 */
import { Parameter, QB64Symbol, QB64SymbolScope } from "./symbols";

/**
 * Parses QB64PE source text into a flat list of symbols.
 * @param content Full source text of one file.
 * @param filePath Path the symbols are attributed to.
 */
export function parseContent(content: string, filePath: string): QB64Symbol[] {
  const symbols: QB64Symbol[] = [];
  const lines = content.split("\n");
  let currentScope: "LOCAL" | "MODULE" = "MODULE";
  let inSubOrFunction = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i;

    // Skip comments and empty lines
    if (line.startsWith("'") || line.startsWith("REM") || line === "")
      continue;

    // Track scope context
    if (line.match(/^\s*(SUB|FUNCTION)\s+/i)) {
      inSubOrFunction = true;
      currentScope = "LOCAL";
    } else if (line.match(/^\s*END\s+(SUB|FUNCTION)\s*$/i)) {
      inSubOrFunction = false;
      currentScope = "MODULE";
    }

    // Parse SUBs
    const subMatch = line.match(
      /^\s*SUB\s+([A-Za-z_][A-Za-z0-9_]*)\s*(\([^)]*\))?\s*(STATIC)?\s*$/i
    );
    if (subMatch) {
      const name = subMatch[1];
      const paramString = subMatch[2];
      const isStatic = !!subMatch[3];
      const parameters = parseParameters(paramString);
      const documentation = extractDocumentation(lines, i);
      const parameterDescriptions = extractParameterDocumentation(
        lines,
        i,
        parameters
      );

      symbols.push({
        name,
        type: "SUB",
        parameters,
        scope: isStatic ? "LOCAL" : "MODULE",
        line: lineNumber,
        file: filePath,
        documentation,
        parameterDescriptions,
      });
      continue;
    }

    // Parse FUNCTIONs
    const funcMatch = line.match(
      /^\s*FUNCTION\s+([A-Za-z_][A-Za-z0-9_]*)\s*(\([^)]*\))?\s*(?:AS\s+([A-Za-z_][A-Za-z0-9_]*))?\s*(STATIC)?\s*$/i
    );
    if (funcMatch) {
      const name = funcMatch[1];
      const paramString = funcMatch[2];
      const returnType = funcMatch[3];
      const isStatic = !!funcMatch[4];
      const parameters = parseParameters(paramString);
      const documentation = extractDocumentation(lines, i);
      const parameterDescriptions = extractParameterDocumentation(
        lines,
        i,
        parameters
      );

      symbols.push({
        name,
        type: "FUNCTION",
        dataType: returnType,
        parameters,
        scope: isStatic ? "LOCAL" : "MODULE",
        line: lineNumber,
        file: filePath,
        documentation,
        parameterDescriptions,
      });
      continue;
    }

    // Parse TYPEs
    const typeMatch = line.match(/^\s*TYPE\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i);
    if (typeMatch) {
      const name = typeMatch[1];
      symbols.push({
        name,
        type: "TYPE",
        scope: "MODULE",
        line: lineNumber,
        file: filePath,
        documentation: extractDocumentation(lines, i),
      });
      continue;
    }

    // Parse variables (DIM, STATIC, COMMON, REDIM)
    const dimMatch = line.match(
      /^\s*(?:DIM|STATIC|COMMON|REDIM)\s+(?:SHARED\s+)?([A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?)\s*(?:AS\s+([A-Za-z_][A-Za-z0-9_]*))?\s*$/i
    );
    if (dimMatch) {
      const nameWithArray = dimMatch[1];
      const dataType = dimMatch[2];
      const isShared = line.toUpperCase().includes("SHARED");
      const isArray = nameWithArray.includes("(");
      const name = nameWithArray.split("(")[0]; // Remove array dimensions

      // Determine scope based on context and SHARED keyword
      let scope: QB64SymbolScope;
      if (isShared) {
        scope = "GLOBAL";
      } else if (inSubOrFunction) {
        scope = "LOCAL";
      } else {
        scope = "MODULE";
      }

      symbols.push({
        name,
        type: "VARIABLE",
        dataType,
        scope,
        line: lineNumber,
        file: filePath,
        isArray,
        isShared,
      });
      continue;
    }

    // Parse constants
    const constMatch = line.match(
      /^\s*CONST\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i
    );
    if (constMatch) {
      const name = constMatch[1];
      const value = constMatch[2].trim();
      symbols.push({
        name,
        type: "CONST",
        scope: "MODULE",
        line: lineNumber,
        file: filePath,
        documentation: extractDocumentation(lines, i),
        value: value,
      });
      continue;
    }

    // Parse simple variable assignments that might not have DIM
    if (inSubOrFunction) {
      const assignMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[=]/);
      if (assignMatch && !line.match(/^\s*(IF|WHILE|FOR|SELECT|CASE)/i)) {
        const name = assignMatch[1];

        // Only add if we haven't seen this variable before
        const existingVar = symbols.find(
          (s) =>
            s.name.toLowerCase() === name.toLowerCase() &&
            s.type === "VARIABLE"
        );
        if (!existingVar) {
          symbols.push({
            name,
            type: "VARIABLE",
            scope: "LOCAL",
            line: lineNumber,
            file: filePath,
          });
        }
      }
    }
  }

  return symbols;
}

/**
 * Parses a parenthesised parameter list such as `(a AS INTEGER, BYVAL b)`.
 * @param paramString The parameter list including its parentheses.
 */
export function parseParameters(paramString?: string): Parameter[] {
  if (!paramString) return [];

  const params: Parameter[] = [];
  const paramText = paramString.slice(1, -1); // Remove parentheses

  if (paramText.trim() === "") return [];

  const paramParts = paramText.split(",");

  for (const part of paramParts) {
    const trimmed = part.trim();

    // Handle BYVAL and BYREF
    const byRefMatch = trimmed.match(
      /^(BYVAL\s+|BYREF\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:AS\s+([A-Za-z_][A-Za-z0-9_]*))?\s*$/i
    );

    if (byRefMatch) {
      const byRefKeyword = byRefMatch[1];
      const paramName = byRefMatch[2];
      const paramType = byRefMatch[3];

      params.push({
        name: paramName,
        type: paramType,
        byRef: byRefKeyword?.toUpperCase().includes("BYREF") || !byRefKeyword, // Default is BYREF in QB64PE
      });
    }
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

  // Look backwards for comments above the declaration
  for (let i = currentIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("'")) {
      // Clean the comment line by removing all leading apostrophes and whitespace
      const cleanLine = cleanCommentLine(line);
      if (cleanLine.length > 0) {
        // Skip @param lines - they're used for parameter documentation, not main description
        if (!cleanLine.match(/^\s*@param\s+/i)) {
          docLines.unshift(cleanLine);
        }
      }
    } else if (line === "") {
      continue; // Skip empty lines
    } else {
      break; // Stop at first non-comment, non-empty line
    }
  }

  return docLines.length > 0 ? docLines.join("\n") : "";
}

/**
 * Strips the leading apostrophes and whitespace from a comment line.
 * Handles cases like: ', '', ' text, '' text, etc.
 */
export function cleanCommentLine(line: string): string {
  let cleaned = line;

  // Remove leading apostrophes (one or more)
  cleaned = cleaned.replace(/^'+/, "");

  // Remove leading whitespace
  cleaned = cleaned.replace(/^\s+/, "");

  return cleaned;
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

  // Look backwards for comments above the declaration
  for (let i = currentIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("'")) {
      // Clean the comment line by removing all leading apostrophes and whitespace
      const cleanLine = cleanCommentLine(line);
      if (cleanLine.length > 0) {
        docLines.unshift(cleanLine);
      }
    } else if (line === "") {
      continue; // Skip empty lines
    } else {
      break; // Stop at first non-comment, non-empty line
    }
  }

  // Parse parameter descriptions from documentation
  for (const docLine of docLines) {
    // Look for @param paramName description patterns
    const paramMatch = docLine.match(
      /^\s*@param\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/i
    );
    if (paramMatch) {
      const paramName = paramMatch[1];
      const description = paramMatch[2];
      paramDescriptions.set(paramName.toLowerCase(), description);
      continue;
    }

    // Look for 'paramName - description' or 'paramName: description' patterns
    const colonMatch = docLine.match(
      /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[-:]\s*(.+)$/
    );
    if (colonMatch) {
      const paramName = colonMatch[1];
      const description = colonMatch[2];
      // Only add if this is actually a parameter name
      if (
        parameters.some(
          (p) => p.name.toLowerCase() === paramName.toLowerCase()
        )
      ) {
        paramDescriptions.set(paramName.toLowerCase(), description);
      }
    }
  }

  // Update parameter objects with descriptions
  for (const param of parameters) {
    const description = paramDescriptions.get(param.name.toLowerCase());
    if (description) {
      param.description = description;
    }
  }

  return paramDescriptions;
}
