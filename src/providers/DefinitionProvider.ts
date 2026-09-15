"use strict";
import * as vscode from "vscode";
import * as commonFunctions from "../commonFunctions";
import * as logFunctions from "../logFunctions";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { HelpService } from "./HelpService";
import { findDefinition } from "../core/queries";
import { fileDirectiveAt } from "../core/parser";
import { toVsLocation } from "./convert";

export class DefinitionProvider implements vscode.DefinitionProvider {
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.definitionProvider
  );

  constructor(
    private readonly workspaceIndex: WorkspaceSymbolIndex,
    private readonly helpService: HelpService
  ) {}

  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Location[] | null> {
    try {
      const lineText = document.lineAt(position.line).text;

      // '$INCLUDE:'file.bi' and $EXEICON:'file.ico' jump to the file itself.
      const directive = fileDirectiveAt(lineText);
      if (directive) {
        const target = this.workspaceIndex.resolveInclude(
          document.uri.fsPath,
          directive.path
        );
        if (target) {
          return [
            new vscode.Location(vscode.Uri.file(target), new vscode.Position(0, 0)),
          ];
        }
        logFunctions.writeLine(
          `${directive.kind} target not found: ${directive.path}`,
          this.outputChannel
        );
        return null;
      }

      // Everything else is a symbol: the index resolves scope, includes and
      // members and returns the exact range of the declaring name.
      this.workspaceIndex.ensureDocument(document);
      const definitions = findDefinition(
        this.workspaceIndex.index,
        this.workspaceIndex.keyOf(document),
        position
      );
      if (definitions.length > 0) {
        return definitions.map(toVsLocation);
      }

      // Not a user symbol: optionally open the keyword's help instead.
      const config = vscode.workspace.getConfiguration("qb64pe");
      if (config.get("isClickKeywordHelpFileEnabled")) {
        const word = commonFunctions.getQB64WordFromDocument(document, position);
        if (word) {
          this.helpService.openHelp(word);
        }
      }
    } catch (error) {
      logFunctions.writeLine(
        `ERROR in DefinitionProvider: ${error}`,
        this.outputChannel
      );
    }
    return null;
  }
}
