"use strict";
import * as vscode from "vscode";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { findOccurrences, resolveAt } from "../core/queries";
import { toVsRange } from "./convert";

/** Highlights every occurrence of the symbol under the cursor in this file. */
export class DocumentHighlightProvider implements vscode.DocumentHighlightProvider {
  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {}

  provideDocumentHighlights(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.DocumentHighlight[] | null {
    this.workspaceIndex.ensureDocument(document);
    const index = this.workspaceIndex.index;
    const key = this.workspaceIndex.keyOf(document);
    const resolution = resolveAt(index, key, position);
    if (!resolution?.symbol) {
      return null;
    }
    return findOccurrences(index, resolution.symbol, true, [key]).map(
      (o) =>
        new vscode.DocumentHighlight(
          toVsRange(o.range),
          o.kind === "read"
            ? vscode.DocumentHighlightKind.Read
            : vscode.DocumentHighlightKind.Write
        )
    );
  }
}
