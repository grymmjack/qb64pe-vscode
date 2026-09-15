"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { findOccurrences, resolveAt } from "../core/queries";
import { toVsLocation } from "./convert";

export class ReferenceProvider implements vscode.ReferenceProvider {
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.referenceProvider
  );

  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {}

  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    _token: vscode.CancellationToken
  ): vscode.Location[] | null {
    try {
      // References span the whole compilation unit, so every open buffer
      // (not just this one) must be what the index holds.
      this.workspaceIndex.ensureAllDocuments();
      const index = this.workspaceIndex.index;
      const resolution = resolveAt(index, this.workspaceIndex.keyOf(document), position);
      if (!resolution?.symbol) {
        return null;
      }
      return findOccurrences(index, resolution.symbol, context.includeDeclaration).map(
        toVsLocation
      );
    } catch (error) {
      logFunctions.writeLine(
        `ERROR in ReferenceProvider: ${error}`,
        this.outputChannel
      );
      return null;
    }
  }
}
