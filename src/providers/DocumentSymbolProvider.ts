"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { OutlineKind, OutlineNode, buildOutline } from "../core/outline";
import { toVsRange } from "./convert";

const KIND: Record<OutlineKind, vscode.SymbolKind> = {
  include: vscode.SymbolKind.Module,
  type: vscode.SymbolKind.Struct,
  field: vscode.SymbolKind.Field,
  const: vscode.SymbolKind.Constant,
  variable: vscode.SymbolKind.Variable,
  parameter: vscode.SymbolKind.Variable,
  label: vscode.SymbolKind.Key,
  sub: vscode.SymbolKind.Method,
  function: vscode.SymbolKind.Function,
};

/** Outline view / breadcrumbs, built from the shared symbol index. */
export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.symbolParser
  );

  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {}

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {
    try {
      this.workspaceIndex.ensureDocument(document);
      return buildOutline(
        this.workspaceIndex.index,
        this.workspaceIndex.keyOf(document)
      ).map(toDocumentSymbol);
    } catch (error) {
      logFunctions.writeLine(
        `ERROR in DocumentSymbolProvider: ${error}`,
        this.outputChannel
      );
      return [];
    }
  }
}

function toDocumentSymbol(node: OutlineNode): vscode.DocumentSymbol {
  const symbol = new vscode.DocumentSymbol(
    node.name || " ",
    node.detail,
    KIND[node.kind],
    toVsRange(node.range),
    toVsRange(node.selectionRange)
  );
  symbol.children = node.children.map(toDocumentSymbol);
  return symbol;
}
