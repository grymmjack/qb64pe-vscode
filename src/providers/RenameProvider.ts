"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { resolveAt } from "../core/queries";
import { renameEdits, validateNewName } from "../core/rename";
import { toVsRange } from "./convert";

export class RenameProvider implements vscode.RenameProvider {
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.referenceProvider
  );

  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {}

  prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): { range: vscode.Range; placeholder: string } {
    this.workspaceIndex.ensureAllDocuments();
    const resolution = resolveAt(
      this.workspaceIndex.index,
      this.workspaceIndex.keyOf(document),
      position
    );
    if (!resolution) {
      throw new Error("You can only rename identifiers.");
    }
    if (!resolution.symbol) {
      throw new Error(
        `Cannot rename '${resolution.word}': it is not a user-defined symbol.`
      );
    }
    return { range: toVsRange(resolution.range), placeholder: resolution.word };
  }

  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
    _token: vscode.CancellationToken
  ): vscode.WorkspaceEdit | null {
    try {
      this.workspaceIndex.ensureAllDocuments();
      const index = this.workspaceIndex.index;
      const resolution = resolveAt(index, this.workspaceIndex.keyOf(document), position);
      if (!resolution?.symbol) {
        return null;
      }
      const problem = validateNewName(resolution.symbol, newName);
      if (problem) {
        throw new Error(problem);
      }
      const edit = new vscode.WorkspaceEdit();
      for (const e of renameEdits(index, resolution.symbol, newName.trim())) {
        edit.replace(vscode.Uri.file(e.file), toVsRange(e.range), e.newText);
      }
      return edit;
    } catch (error) {
      logFunctions.writeLine(`ERROR in RenameProvider: ${error}`, this.outputChannel);
      throw error; // VS Code shows the message to the user
    }
  }
}
