"use strict";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as logFunctions from "../logFunctions";

export interface QB64Symbol {
  name: string;
  type: "SUB" | "FUNCTION" | "VARIABLE" | "TYPE" | "CONST";
  dataType?: string;
  parameters?: Parameter[];
  scope: "LOCAL" | "MODULE" | "GLOBAL";
  line: number;
  file: string;
  documentation?: string;
  parameterDescriptions?: Map<string, string>; // Parameter name -> description
  isArray?: boolean;
  isShared?: boolean;
  value?: string; // For constants - the actual value
}

export interface Parameter {
  name: string;
  type?: string;
  optional?: boolean;
  byRef?: boolean;
  description?: string; // Parameter-specific documentation
}

export class SymbolParser {
  private symbolCache = new Map<string, QB64Symbol[]>();
  private lastModified = new Map<string, number>();
  private outputChannel = logFunctions.getChannel(
    logFunctions.channelType.completion
  );

  public async parseWorkspaceSymbols(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<QB64Symbol[]> {
    const symbols: QB64Symbol[] = [];

    try {
      // Find all QB64PE files in workspace
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, "**/*.{bas,bi,bm}"),
        null,
        1000
      );

      logFunctions.writeLine(
        `Found ${files.length} QB64PE files in workspace ${workspaceFolder.name}`,
        this.outputChannel
      );

      for (const file of files) {
        const fileSymbols = await this.parseFileSymbols(file.fsPath);
        symbols.push(...fileSymbols);
      }
    } catch (error) {
      logFunctions.writeLine(
        `Error parsing workspace symbols: ${error}`,
        this.outputChannel
      );
    }

    return symbols;
  }

  public async parseFileSymbols(filePath: string): Promise<QB64Symbol[]> {
    try {
      const stat = fs.statSync(filePath);
      const lastMod = stat.mtime.getTime();

      // Check cache
      if (
        this.symbolCache.has(filePath) &&
        this.lastModified.get(filePath) === lastMod
      ) {
        return this.symbolCache.get(filePath) || [];
      }

      const content = fs.readFileSync(filePath, "utf8");
      const symbols = this.parseContent(content, filePath);

      // Update cache
      this.symbolCache.set(filePath, symbols);
      this.lastModified.set(filePath, lastMod);

      logFunctions.writeLine(
        `Parsed ${symbols.length} symbols from ${path.basename(filePath)}`,
        this.outputChannel
      );

      return symbols;
    } catch (error) {
      logFunctions.writeLine(
        `Error parsing file ${filePath}: ${error}`,
        this.outputChannel
      );
      return [];
    }
  }

  public async parseDocumentSymbols(
    document: vscode.TextDocument
  ): Promise<QB64Symbol[]> {
    const symbols = this.parseContent(document.getText(), document.uri.fsPath);

    // Cache the current document
    this.symbolCache.set(document.uri.fsPath, symbols);
    this.lastModified.set(document.uri.fsPath, Date.now());

    logFunctions.writeLine(
      `Parsed ${symbols.length} symbols from active document`,
      this.outputChannel
    );

    return symbols;
  }

  private parseContent(content: string, filePath: string): QB64Symbol[] {
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
        const parameters = this.parseParameters(paramString);
        const documentation = this.extractDocumentation(lines, i);
        const parameterDescriptions = this.extractParameterDocumentation(
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
        const parameters = this.parseParameters(paramString);
        const documentation = this.extractDocumentation(lines, i);
        const parameterDescriptions = this.extractParameterDocumentation(
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
          documentation: this.extractDocumentation(lines, i),
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
        let scope: "LOCAL" | "MODULE" | "GLOBAL";
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
          documentation: this.extractDocumentation(lines, i),
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

  private parseParameters(paramString?: string): Parameter[] {
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

  private extractDocumentation(lines: string[], currentIndex: number): string {
    const docLines: string[] = [];

    // Look backwards for comments above the declaration
    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("'")) {
        // Clean the comment line by removing all leading apostrophes and whitespace
        const cleanLine = this.cleanCommentLine(line);
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

  private cleanCommentLine(line: string): string {
    // Remove all leading apostrophes and whitespace
    // This handles cases like: ', '', ' text, '' text, etc.
    let cleaned = line;

    // Remove leading apostrophes (one or more)
    cleaned = cleaned.replace(/^'+/, "");

    // Remove leading whitespace
    cleaned = cleaned.replace(/^\s+/, "");

    return cleaned;
  }

  private extractParameterDocumentation(
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
        const cleanLine = this.cleanCommentLine(line);
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

  public async parseIncludeFiles(
    document: vscode.TextDocument
  ): Promise<QB64Symbol[]> {
    const symbols: QB64Symbol[] = [];
    const content = document.getText();
    const lines = content.split("\n");
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) return symbols;

    for (const line of lines) {
      // Match both '$INCLUDE: 'file.bi' and '$INCLUDE:'file.bi'
      const includeMatch = line.match(/['\$]INCLUDE\s*:\s*['"']([^'"]+)['"']/i);
      if (includeMatch) {
        const includePath = includeMatch[1];
        let fullPath: string;

        if (path.isAbsolute(includePath)) {
          fullPath = includePath;
        } else {
          // Try relative to current file first
          fullPath = path.resolve(
            path.dirname(document.uri.fsPath),
            includePath
          );

          // If not found, try relative to workspace root
          if (!fs.existsSync(fullPath)) {
            fullPath = path.resolve(workspaceFolder.uri.fsPath, includePath);
          }
        }

        if (fs.existsSync(fullPath)) {
          logFunctions.writeLine(
            `Parsing include file: ${fullPath}`,
            this.outputChannel
          );
          const includeSymbols = await this.parseFileSymbols(fullPath);
          symbols.push(...includeSymbols);
        } else {
          logFunctions.writeLine(
            `Include file not found: ${includePath} (tried: ${fullPath})`,
            this.outputChannel
          );
        }
      }
    }

    return symbols;
  }

  public getSymbolsInScope(
    document: vscode.TextDocument,
    position: vscode.Position,
    allSymbols: QB64Symbol[]
  ): QB64Symbol[] {
    const currentFile = document.uri.fsPath;
    const currentLine = position.line;

    // Determine current scope context
    let inSubOrFunction = false;
    let currentSubFunction: string | null = null;

    for (let i = 0; i <= currentLine; i++) {
      const line = document.lineAt(i).text.trim();

      const subFuncMatch = line.match(
        /^\s*(SUB|FUNCTION)\s+([A-Za-z_][A-Za-z0-9_]*)/i
      );
      if (subFuncMatch) {
        inSubOrFunction = true;
        currentSubFunction = subFuncMatch[2];
      } else if (line.match(/^\s*END\s+(SUB|FUNCTION)\s*$/i)) {
        inSubOrFunction = false;
        currentSubFunction = null;
      }
    }

    // Filter symbols based on scope rules
    return allSymbols.filter((symbol) => {
      // Same file symbols
      if (symbol.file === currentFile) {
        if (symbol.scope === "LOCAL") {
          // Local symbols are only available within their own SUB/FUNCTION
          return inSubOrFunction && symbol.line < currentLine;
        } else if (symbol.scope === "MODULE") {
          // Module symbols are available throughout the file
          return symbol.line < currentLine;
        } else {
          // Global symbols are always available
          return true;
        }
      } else {
        // Other file symbols - only MODULE and GLOBAL scope
        return symbol.scope === "MODULE" || symbol.scope === "GLOBAL";
      }
    });
  }

  public clearCache(): void {
    this.symbolCache.clear();
    this.lastModified.clear();
    logFunctions.writeLine("Symbol cache cleared", this.outputChannel);
  }

  public getCachedSymbols(filePath: string): QB64Symbol[] | undefined {
    return this.symbolCache.get(filePath);
  }
}
