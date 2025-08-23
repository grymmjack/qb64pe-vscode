"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import { SymbolParser, QB64Symbol } from "./SymbolParser";

export class SignatureHelpProvider implements vscode.SignatureHelpProvider {
  private outputChannel = logFunctions.getChannel(
    logFunctions.channelType.signatureHelp
  );
  private symbolParser: SymbolParser;
  private workspaceSymbols: QB64Symbol[] = [];

  constructor(symbolParser: SymbolParser) {
    this.symbolParser = symbolParser;
    this.refreshWorkspaceSymbols();

    // Watch for file changes to update symbols
    vscode.workspace.onDidSaveTextDocument(() =>
      this.refreshWorkspaceSymbols()
    );
    vscode.workspace.onDidCreateFiles(() => this.refreshWorkspaceSymbols());
    vscode.workspace.onDidDeleteFiles(() => this.refreshWorkspaceSymbols());
  }

  public async provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.SignatureHelpContext
  ): Promise<vscode.SignatureHelp | null> {
    try {
      const line = document.lineAt(position.line);
      const textUpToCursor = line.text.substring(0, position.character);

      // Find the function/sub call being typed
      const functionCall = this.extractFunctionCall(textUpToCursor);
      if (!functionCall) {
        return null;
      }

      logFunctions.writeLine(
        `Signature help requested for: ${functionCall.name} at parameter ${functionCall.parameterIndex}`,
        this.outputChannel
      );

      // Get all available symbols
      const documentSymbols = await this.symbolParser.parseDocumentSymbols(
        document
      );
      const includeSymbols = await this.symbolParser.parseIncludeFiles(
        document
      );
      const allSymbols = [
        ...documentSymbols,
        ...includeSymbols,
        ...this.workspaceSymbols,
      ];
      const scopedSymbols = this.symbolParser.getSymbolsInScope(
        document,
        position,
        allSymbols
      );

      // Find matching function/sub
      const matchingSymbols = scopedSymbols.filter(
        (symbol) =>
          (symbol.type === "FUNCTION" || symbol.type === "SUB") &&
          symbol.name.toLowerCase() === functionCall.name.toLowerCase()
      );

      if (matchingSymbols.length === 0) {
        return null;
      }

      const signatureHelp = new vscode.SignatureHelp();
      signatureHelp.signatures = [];
      signatureHelp.activeSignature = 0;
      signatureHelp.activeParameter = Math.max(0, functionCall.parameterIndex);

      for (const symbol of matchingSymbols) {
        const signature = this.createSignatureInformation(symbol);
        if (signature) {
          signatureHelp.signatures.push(signature);
        }
      }

      return signatureHelp.signatures.length > 0 ? signatureHelp : null;
    } catch (error) {
      logFunctions.writeLine(
        `Error in provideSignatureHelp: ${error}`,
        this.outputChannel
      );
      return null;
    }
  }

  private extractFunctionCall(
    text: string
  ): { name: string; parameterIndex: number } | null {
    // Find the last function call pattern: functionName(
    const match = text.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*$/);
    if (!match) {
      return null;
    }

    const functionName = match[1];
    const callStart = match.index! + functionName.length;
    const paramsText = text.substring(callStart);

    // Count commas to determine current parameter index
    let parameterIndex = 0;
    let inQuotes = false;
    let parenDepth = 0;

    for (let i = 0; i < paramsText.length; i++) {
      const char = paramsText[i];

      if (char === '"' && (i === 0 || paramsText[i - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char === "(") {
          parenDepth++;
        } else if (char === ")") {
          parenDepth--;
        } else if (char === "," && parenDepth === 1) {
          parameterIndex++;
        }
      }
    }

    return { name: functionName, parameterIndex };
  }

  private createSignatureInformation(
    symbol: QB64Symbol
  ): vscode.SignatureInformation | null {
    if (symbol.type !== "FUNCTION" && symbol.type !== "SUB") {
      return null;
    }

    const parameters = symbol.parameters || [];
    const paramLabels = parameters.map(
      (p) => `${p.name}${p.type ? ` AS ${p.type}` : ""}`
    );

    let label: string;
    if (symbol.type === "FUNCTION") {
      label = `${symbol.name}(${paramLabels.join(", ")})`;
      if (symbol.dataType) {
        label += ` AS ${symbol.dataType}`;
      }
    } else {
      label = `${symbol.name}(${paramLabels.join(", ")})`;
    }

    const signature = new vscode.SignatureInformation(label);

    // Create documentation with parameter descriptions
    const docParts: string[] = [];

    if (symbol.documentation) {
      docParts.push(symbol.documentation);
    }

    if (parameters.length > 0) {
      docParts.push("**Parameters:**");
      for (const param of parameters) {
        let paramDoc = `- \`${param.name}\``;
        if (param.type) {
          paramDoc += ` (${param.type})`;
        }
        if (param.description) {
          paramDoc += `: ${param.description}`;
        }
        docParts.push(paramDoc);
      }
    }

    if (symbol.type === "FUNCTION" && symbol.dataType) {
      docParts.push(`**Returns:** ${symbol.dataType}`);
    }

    signature.documentation = new vscode.MarkdownString(docParts.join("\n\n"));

    // Create parameter information
    signature.parameters = parameters.map((param) => {
      const paramInfo = new vscode.ParameterInformation(
        param.name + (param.type ? ` AS ${param.type}` : "")
      );

      if (param.description) {
        paramInfo.documentation = new vscode.MarkdownString(param.description);
      }

      return paramInfo;
    });

    return signature;
  }

  private async refreshWorkspaceSymbols(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    this.workspaceSymbols = [];
    for (const folder of workspaceFolders) {
      const symbols = await this.symbolParser.parseWorkspaceSymbols(folder);
      this.workspaceSymbols.push(...symbols);
    }

    logFunctions.writeLine(
      `Refreshed workspace symbols for signature help: ${this.workspaceSymbols.length} total`,
      this.outputChannel
    );
  }
}
