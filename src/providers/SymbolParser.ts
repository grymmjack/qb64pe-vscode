"use strict";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as logFunctions from "../logFunctions";
import { parseContent } from "../core/parser";
import { QB64Symbol } from "../core/symbols";

// The symbol model and the pure text parser live in src/core (vscode-free,
// unit-tested). This class is the VS Code adapter: it owns file/workspace
// I/O, caching and scope resolution against live documents.
export type { QB64Symbol, Parameter } from "../core/symbols";

export class SymbolParser {
  private symbolCache = new Map<string, QB64Symbol[]>();
  private lastModified = new Map<string, number>();
  private outputChannel = logFunctions.getChannel(
    logFunctions.channelType.symbolParser
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
      const symbols = parseContent(content, filePath);

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
    const symbols = parseContent(document.getText(), document.uri.fsPath);

    // Cache the current document
    this.symbolCache.set(document.uri.fsPath, symbols);
    this.lastModified.set(document.uri.fsPath, Date.now());

    logFunctions.writeLine(
      `Parsed ${symbols.length} symbols from active document`,
      this.outputChannel
    );

    return symbols;
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
