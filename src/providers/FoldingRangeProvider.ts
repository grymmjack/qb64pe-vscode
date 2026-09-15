"use strict";
import * as vscode from "vscode";
import { foldingRanges } from "../core/folding";

/** Block-aware folding: SUB/FUNCTION, TYPE, IF, SELECT, DO, FOR, WHILE, $IF, comments. */
export class FoldingRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken
  ): vscode.FoldingRange[] {
    return foldingRanges(document.getText().split(/\r?\n/)).map(
      (r) =>
        new vscode.FoldingRange(
          r.startLine,
          r.endLine,
          r.kind === "comment" ? vscode.FoldingRangeKind.Comment : undefined
        )
    );
  }
}
