"use strict";
import * as vscode from "vscode";
import * as commonFunctions from "../commonFunctions";
import * as logFunctions from "../logFunctions";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { HelpService } from "./HelpService";
import { resolveAt } from "../core/queries";
import { symbolMarkdown } from "../core/format";
import { toVsRange } from "./convert";

export class HoverProvider implements vscode.HoverProvider {
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.hoverProvider
  );

  constructor(
    private readonly workspaceIndex: WorkspaceSymbolIndex,
    private readonly helpService: HelpService
  ) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    const config = vscode.workspace.getConfiguration("qb64pe");
    if (!config.get("isHoverTextFileEnabled")) {
      return null;
    }

    try {
      // User-defined symbols first: the index knows scope, includes and members.
      this.workspaceIndex.ensureDocument(document);
      const resolution = resolveAt(
        this.workspaceIndex.index,
        this.workspaceIndex.keyOf(document),
        position
      );
      if (resolution?.symbol) {
        return new vscode.Hover(
          new vscode.MarkdownString(symbolMarkdown(resolution.symbol)),
          toVsRange(resolution.range)
        );
      }

      // Otherwise built-in keyword help: live-converted from the installed
      // QB64PE wiki source when available, else the bundled snapshot.
      const token = commonFunctions.getQB64WordFromDocument(document, position);
      if (!token) {
        return null;
      }
      const help = this.helpService.getHoverHelp(token);
      if (help) {
        const markdownString = new vscode.MarkdownString(help.markdown, true);
        markdownString.baseUri = help.baseUri;
        markdownString.isTrusted = true;
        markdownString.supportHtml = true;
        return new vscode.Hover(markdownString);
      }
    } catch (error) {
      logFunctions.writeLine(
        `ERROR in HoverProvider.provideHover: ${error}`,
        this.outputChannel
      );
    }
    return null;
  }
}
