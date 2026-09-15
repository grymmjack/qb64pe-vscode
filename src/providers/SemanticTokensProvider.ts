"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { TOKEN_MODIFIERS, TOKEN_TYPES, semanticTokens } from "../core/semantic";

export const semanticTokensLegend = new vscode.SemanticTokensLegend(
  [...TOKEN_TYPES],
  [...TOKEN_MODIFIERS]
);

/** Colours user-defined routines, types, variables, parameters, fields and labels. */
export class SemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider, vscode.Disposable
{
  private readonly emitter = new vscode.EventEmitter<void>();
  private readonly subscription: vscode.Disposable;
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.symbolParser
  );

  readonly onDidChangeSemanticTokens = this.emitter.event;

  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {
    // Edits to the active document already trigger a refresh; re-tokenise
    // when *another* file changed (e.g. a .bi gained a SUB).
    this.subscription = workspaceIndex.onDidChange((files) => {
      const active = vscode.window.activeTextEditor?.document;
      const activeKey = active ? workspaceIndex.keyOf(active) : null;
      if (files.some((f) => f !== activeKey)) this.emitter.fire();
    });
  }

  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.SemanticTokens {
    const builder = new vscode.SemanticTokensBuilder(semanticTokensLegend);
    try {
      this.workspaceIndex.ensureDocument(document);
      for (const t of semanticTokens(
        this.workspaceIndex.index,
        this.workspaceIndex.keyOf(document)
      )) {
        builder.push(
          new vscode.Range(t.line, t.start, t.line, t.start + t.length),
          t.type,
          t.modifiers
        );
      }
    } catch (error) {
      logFunctions.writeLine(
        `ERROR in SemanticTokensProvider: ${error}`,
        this.outputChannel
      );
    }
    return builder.build();
  }

  dispose(): void {
    this.subscription.dispose();
    this.emitter.dispose();
  }
}
