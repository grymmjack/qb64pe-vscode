"use strict";
import * as vscode from "vscode";
import * as path from "path";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { QB64Symbol } from "../core/symbols";
import { declarationOf, searchSymbols } from "../core/queries";
import { toVsLocation } from "./convert";

const KIND: Partial<Record<QB64Symbol["type"], vscode.SymbolKind>> = {
  SUB: vscode.SymbolKind.Method,
  FUNCTION: vscode.SymbolKind.Function,
  TYPE: vscode.SymbolKind.Struct,
  CONST: vscode.SymbolKind.Constant,
};

/** Ctrl+T: jump to any SUB/FUNCTION/TYPE/CONST in the workspace. */
export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {}

  provideWorkspaceSymbols(
    query: string,
    _token: vscode.CancellationToken
  ): vscode.SymbolInformation[] {
    this.workspaceIndex.ensureAllDocuments();
    const index = this.workspaceIndex.index;
    return searchSymbols(index, query).map(
      (s) =>
        new vscode.SymbolInformation(
          s.name,
          KIND[s.type] ?? vscode.SymbolKind.Object,
          path.basename(s.file),
          toVsLocation(declarationOf(index, s))
        )
    );
  }
}
