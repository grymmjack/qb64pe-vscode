"use strict";
import * as vscode from "vscode";
import * as commonFunctions from "../commonFunctions";
import * as logFunctions from "../logFunctions";
import * as fs from "fs";
import { TokenInfo } from "../TokenInfo";
import { SymbolParser, QB64Symbol } from "./SymbolParser";

export class HoverProvider implements vscode.HoverProvider {
  outputChannel = logFunctions.getChannel(
    logFunctions.channelType.hoverProvider
  );
  private symbolParser: SymbolParser;
  private workspaceSymbols: QB64Symbol[] = [];
  private workspaceSymbolsLastRefresh: number = 0;
  private readonly CACHE_REFRESH_INTERVAL = 30000; // 30 seconds
  private isRefreshing: boolean = false;

  constructor(symbolParser?: SymbolParser) {
    this.symbolParser = symbolParser || new SymbolParser();

    // Initial workspace symbol load
    this.refreshWorkspaceSymbols();

    // Set up file watchers to invalidate cache when files change
    if (vscode.workspace.workspaceFolders) {
      vscode.workspace.onDidSaveTextDocument(() => this.invalidateCache());
      vscode.workspace.onDidCreateFiles(() => this.invalidateCache());
      vscode.workspace.onDidDeleteFiles(() => this.invalidateCache());
    }
  }

  private invalidateCache(): void {
    this.workspaceSymbolsLastRefresh = 0;
    logFunctions.writeLine(
      "Workspace symbols cache invalidated",
      this.outputChannel
    );
  }

  private async refreshWorkspaceSymbols(): Promise<void> {
    const now = Date.now();
    if (
      (now - this.workspaceSymbolsLastRefresh < this.CACHE_REFRESH_INTERVAL &&
        this.workspaceSymbols.length > 0) ||
      this.isRefreshing
    ) {
      return; // Cache is still fresh or already refreshing
    }

    this.isRefreshing = true;
    try {
      logFunctions.writeLine(
        "Refreshing workspace symbols cache...",
        this.outputChannel
      );
      this.workspaceSymbols = [];

      if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
          const symbols = await this.symbolParser.parseWorkspaceSymbols(folder);
          this.workspaceSymbols.push(...symbols);
        }
      }

      this.workspaceSymbolsLastRefresh = now;
      logFunctions.writeLine(
        `Workspace symbols cache refreshed: ${
          this.workspaceSymbols.length
        } symbols loaded (cache valid for ${
          this.CACHE_REFRESH_INTERVAL / 1000
        }s)`,
        this.outputChannel
      );
    } catch (error) {
      logFunctions.writeLine(
        `Error refreshing workspace symbols: ${error}`,
        this.outputChannel
      );
    } finally {
      this.isRefreshing = false;
    }
  }

  public async forceRefreshWorkspaceSymbols(): Promise<void> {
    this.workspaceSymbolsLastRefresh = 0;
    this.isRefreshing = false;
    await this.refreshWorkspaceSymbols();
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    cancellationToken: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    if (!document || !position) {
      return null;
    }

    const config = vscode.workspace.getConfiguration("qb64pe");
    if (!config.get("isHoverTextFileEnabled")) {
      logFunctions.writeLine("Hovertext is disabled.", this.outputChannel);
      return null;
    }

    try {
      const token = commonFunctions.getQB64WordFromDocument(document, position);

      // First, try to find user-defined symbols with our enhanced SymbolParser
      const userDefinedHover = await this.getUserDefinedHover(
        document,
        position,
        token
      );
      if (userDefinedHover) {
        logFunctions.writeLine(
          `Found user-defined symbol hover for: ${token}`,
          this.outputChannel
        );
        return userDefinedHover;
      }

      // Fall back to original logic for built-in QB64PE keywords
      const keywordInfo = new TokenInfo(
        token,
        document.lineAt(position.line).text,
        this.outputChannel
      );
      if (keywordInfo.offlinehelp.length > 0) {
        const markdownString = new vscode.MarkdownString(
          keywordInfo.getHoverText(),
          true
        );
        const path = require("path");
        const config: vscode.WorkspaceConfiguration =
          vscode.workspace.getConfiguration("qb64pe");
        let helpPath: string = config.get("helpPath");
        let helpFile: string = path.join(helpPath).replaceAll("\\", "/");
        markdownString.baseUri = vscode.Uri.file(helpFile + "/");
        markdownString.isTrusted = true;
        markdownString.supportHtml = true;
        return new vscode.Hover(markdownString);
      }

      return this.doSearch(document, keywordInfo.token, cancellationToken).then(
        (location) => {
          if (location) {
            logFunctions.writeLine(
              `location found for ${keywordInfo.token}`,
              this.outputChannel
            );
            let contents: string = "";
            const sourcecode: string[] = fs
              .readFileSync(location.uri.fsPath)
              .toString()
              .split("\n");
            const defLine = sourcecode[location.range.start.line].toLowerCase();
            let previousLine: string = "";
            if (location.range.start.line > 0) {
              previousLine =
                sourcecode[location.range.start.line - 1].toLowerCase();
            }
            if (
              previousLine.startsWith("'") ||
              previousLine.startsWith("rem")
            ) {
              for (
                let index = location.range.start.line - 1;
                index > -1;
                index--
              ) {
                const currentLine = sourcecode[index];
                const lowerLine = currentLine.toLowerCase();
                logFunctions.writeLine(
                  `Line: ${index}: ${lowerLine.replace("\r", "")} `,
                  this.outputChannel
                );
                if (
                  lowerLine.replace("\r", "").endsWith("------------") ||
                  (!lowerLine.startsWith("'") && !lowerLine.startsWith("rem"))
                ) {
                  logFunctions.writeLine(`${contents}`, this.outputChannel);
                  break;
                }
                contents = `${currentLine.slice(
                  lowerLine.startsWith("'") ? 1 : 3
                )}\n${contents}`;
              }
              const markdownString = new vscode.MarkdownString(contents, true);
              const path = require("path");
              const config: vscode.WorkspaceConfiguration =
                vscode.workspace.getConfiguration("qb64pe");
              let helpPath: string = config.get("helpPath");
              let helpFile: string = path.join(helpPath).replaceAll("\\", "/");
              markdownString.baseUri = vscode.Uri.file(helpFile + "/");
              markdownString.isTrusted = true;
              markdownString.supportHtml = true;
              return new vscode.Hover(markdownString);
            }

            if (
              defLine.startsWith("sub ") ||
              defLine.startsWith("function ") ||
              defLine.startsWith("type ")
            ) {
              for (
                let index = location.range.start.line;
                index < sourcecode.length;
                index++
              ) {
                const currentLine = sourcecode[index].replace("\r", "");
                const lowerLine = currentLine.toLowerCase();
                contents = `${contents}\n${currentLine}`;
                if (
                  lowerLine.startsWith("end sub") ||
                  lowerLine.startsWith("end function") ||
                  lowerLine.startsWith("end type")
                ) {
                  break;
                }
              }
              const markdownString = new vscode.MarkdownString(contents, true);
              markdownString.appendCodeblock(contents);
              const path = require("path");
              const config: vscode.WorkspaceConfiguration =
                vscode.workspace.getConfiguration("qb64pe");
              let helpPath: string = config.get("helpPath");
              let helpFile: string = path.join(helpPath).replaceAll("\\", "/");
              markdownString.baseUri = vscode.Uri.file(helpFile + "/");
              markdownString.isTrusted = true;
              markdownString.supportHtml = true;

              return new vscode.Hover(markdownString);
            }

            logFunctions.writeLine("30", this.outputChannel);
            logFunctions.writeLine(
              "Variable|Const declaration",
              this.outputChannel
            );
            contents = sourcecode[location.range.start.line].trim();

            if (contents) {
              logFunctions.writeLine(
                `contents: ${contents}`,
                this.outputChannel
              );
            } else {
              logFunctions.writeLine("contents are empty", this.outputChannel);
            }
            logFunctions.writeLine("40", this.outputChannel);
            const markdownString = new vscode.MarkdownString(contents, true);
            markdownString.appendCodeblock(contents);
            const path = require("path");
            const config: vscode.WorkspaceConfiguration =
              vscode.workspace.getConfiguration("qb64pe");
            let helpPath: string = config.get("helpPath");
            let helpFile: string = path.join(helpPath).replaceAll("\\", "/");
            markdownString.baseUri = vscode.Uri.file(helpFile + "/");
            markdownString.isTrusted = true;
            markdownString.supportHtml = true;
            return new vscode.Hover(markdownString);
          }
        }
      );
    } catch (error) {
      logFunctions.writeLine(
        `ERROR in HoverProvider.provideHover: ${error}`,
        this.outputChannel
      );
    }
    return null;
  }

  private async getUserDefinedHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: string
  ): Promise<vscode.Hover | null> {
    try {
      // Get document symbols (local scope)
      const documentSymbols = await this.symbolParser.parseDocumentSymbols(
        document
      );

      // Get include file symbols
      const includeSymbols = await this.symbolParser.parseIncludeFiles(
        document
      );

      // First, try to find the symbol in document + includes (fast search)
      let allSymbols = [...documentSymbols, ...includeSymbols];
      let symbolsInScope = this.symbolParser.getSymbolsInScope(
        document,
        position,
        allSymbols
      );
      let matchingSymbol = symbolsInScope.find(
        (symbol) => symbol.name.toLowerCase() === token.toLowerCase()
      );

      // If not found, search the cached workspace symbols (faster than re-parsing)
      if (!matchingSymbol) {
        logFunctions.writeLine(
          `Symbol '${token}' not found in document/includes, searching cached workspace...`,
          this.outputChannel
        );

        // Refresh cache if needed (but don't block on it if cache is recent)
        await this.refreshWorkspaceSymbols();

        // Combine all symbols including cached workspace
        allSymbols = [
          ...documentSymbols,
          ...includeSymbols,
          ...this.workspaceSymbols,
        ];

        symbolsInScope = this.symbolParser.getSymbolsInScope(
          document,
          position,
          allSymbols
        );
        matchingSymbol = symbolsInScope.find(
          (symbol) => symbol.name.toLowerCase() === token.toLowerCase()
        );

        logFunctions.writeLine(
          `Searched ${allSymbols.length} total symbols (${documentSymbols.length} document, ${includeSymbols.length} includes, ${this.workspaceSymbols.length} cached workspace)`,
          this.outputChannel
        );
      } else {
        logFunctions.writeLine(
          `Found '${token}' in document/includes without workspace search (${allSymbols.length} symbols checked)`,
          this.outputChannel
        );
      }

      if (matchingSymbol) {
        logFunctions.writeLine(
          `Creating hover for user-defined symbol: ${matchingSymbol.name} (${matchingSymbol.type}) from ${matchingSymbol.file}`,
          this.outputChannel
        );
        return new vscode.Hover(this.createRichDocumentation(matchingSymbol));
      } else {
        logFunctions.writeLine(
          `No matching user-defined symbol found for: ${token}`,
          this.outputChannel
        );
      }

      return null;
    } catch (error) {
      logFunctions.writeLine(
        `Error in getUserDefinedHover: ${error}`,
        this.outputChannel
      );
      return null;
    }
  }

  private createRichDocumentation(symbol: QB64Symbol): vscode.MarkdownString {
    const docParts: string[] = [];

    // Add symbol header
    if (symbol.type === "SUB") {
      docParts.push(`**SUB** ${symbol.name}`);
    } else if (symbol.type === "FUNCTION") {
      docParts.push(
        `**FUNCTION** ${symbol.name}${
          symbol.dataType ? ` AS ${symbol.dataType}` : ""
        }`
      );
    } else if (symbol.type === "CONST") {
      docParts.push(
        `**CONST** ${symbol.name}${symbol.value ? ` = ${symbol.value}` : ""}`
      );
    } else if (symbol.type === "TYPE") {
      docParts.push(`**TYPE** ${symbol.name}`);
    } else if (symbol.type === "VARIABLE") {
      docParts.push(
        `**VARIABLE** ${symbol.name}${
          symbol.dataType ? ` AS ${symbol.dataType}` : ""
        }${symbol.isArray ? " (array)" : ""}`
      );
    }

    // Add main documentation
    if (symbol.documentation) {
      docParts.push(symbol.documentation);
    } else {
      docParts.push(`User-defined ${symbol.type.toLowerCase()}`);
    }

    // Add parameter information for SUBs and FUNCTIONs
    if (symbol.parameters && symbol.parameters.length > 0) {
      docParts.push("**Parameters:**");
      for (const param of symbol.parameters) {
        let paramDoc = `- \`${param.name}\``;
        if (param.type) {
          paramDoc += ` (${param.type})`;
        }
        if (param.byRef !== undefined) {
          paramDoc += param.byRef ? " - by reference" : " - by value";
        }
        if (param.description) {
          paramDoc += `: ${param.description}`;
        }
        docParts.push(paramDoc);
      }
    }

    // Add return type for functions
    if (symbol.type === "FUNCTION" && symbol.dataType) {
      docParts.push(`**Returns:** ${symbol.dataType}`);
    }

    // Add scope and file information
    if (symbol.scope !== "LOCAL") {
      docParts.push(`*Scope: ${symbol.scope}*`);
    }
    docParts.push(`*File: ${require("path").basename(symbol.file)}*`);

    return new vscode.MarkdownString(docParts.join("\n\n"));
  }

  private async doSearch(
    document: vscode.TextDocument,
    word: string,
    token: vscode.CancellationToken
  ): Promise<vscode.Location> {
    return new Promise<vscode.Location>(async (resolve) => {
      try {
        logFunctions.writeLine(
          `checking document: ${document.fileName}`,
          this.outputChannel
        );
        const regexIncludeFile = /include:(.*)'/i;
        const sourceLines = document.getText().split("\n");
        let includedFiles: string[] = [];
        for (
          let lineNumber = 0;
          lineNumber < sourceLines.length;
          lineNumber++
        ) {
          if (token.isCancellationRequested) {
            logFunctions.writeLine(
              "token.isCancellationRequested",
              this.outputChannel
            );
            return Promise.reject(null);
          }

          if (
            document == vscode.window.activeTextEditor.document &&
            lineNumber == vscode.window.activeTextEditor.selection.active.line
          ) {
            continue;
          }

          // Remove the comments from the line and parse that.
          const line = sourceLines[lineNumber]
            .toLowerCase()
            .replace("\r", "")
            .replace(/'.*$/, "")
            .trimEnd();

          if (line.match(regexIncludeFile)) {
            includedFiles.push(line);
            continue;
          }

          if (
            !(
              line.startsWith("sub ") ||
              line.startsWith("dim ") ||
              line.startsWith("function ") ||
              line.startsWith("type ") ||
              line.startsWith("const ")
            )
          ) {
            continue;
          }

          let match = line.match(
            new RegExp(`\\W${commonFunctions.escapeRegExp(word)}\\W`, "i")
          );
          if (match) {
            logFunctions.writeLine(
              `Found 1 ${word} on line ${lineNumber} in ${vscode.Uri.file(
                document.fileName
              )}`,
              this.outputChannel
            );
            return resolve(
              new vscode.Location(
                vscode.Uri.file(document.fileName),
                commonFunctions.createRange(match, lineNumber)
              )
            );
          }
          match = line.match(
            new RegExp(`\\b${commonFunctions.escapeRegExp(word)}\\b`, "i")
          );
          if (match) {
            logFunctions.writeLine(
              `Found 2 ${word} on line ${lineNumber} in ${vscode.Uri.file(
                document.fileName
              )}`,
              this.outputChannel
            );
            return resolve(
              new vscode.Location(
                vscode.Uri.file(document.fileName),
                commonFunctions.createRange(match, lineNumber)
              )
            );
          }
        }

        for (let fileIndex = 0; fileIndex < includedFiles.length; fileIndex++) {
          let selectedText: string = includedFiles[fileIndex];
          let match = selectedText.match(regexIncludeFile);
          if (match) {
            logFunctions.writeLine(
              `Checking include file: ${selectedText}`,
              this.outputChannel
            );
            const path = require("path");
            const fullPath = commonFunctions.getAbsolutePath(
              path.dirname(document.fileName).replaceAll("\\", "/") + "/",
              match[1].replace("'", "").replaceAll("\\", "/")
            );
            if (fs.existsSync(fullPath)) {
              let includeFileDocument: vscode.TextDocument =
                await vscode.workspace.openTextDocument(fullPath);
              let searchResults: vscode.Location = await this.doSearch(
                includeFileDocument,
                word,
                token
              );
              if (searchResults) {
                logFunctions.writeLine(
                  `found ${word} in ${includeFileDocument.fileName}`,
                  this.outputChannel
                );
                return resolve(searchResults);
              } else {
                logFunctions.writeLine(
                  `word: ${word} not found in ${includeFileDocument.fileName}`,
                  this.outputChannel
                );
              }
            }
          }
        }
      } catch (error) {
        logFunctions.writeLine(
          `ERROR in doSearch: ${error}`,
          this.outputChannel
        );
      }
      return resolve(null);
    });
  }
}
